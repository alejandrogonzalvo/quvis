#!/usr/bin/env python3
"""
Quvis Python Library - Quantum Circuit Visualization Tool

This module provides a matplotlib-like interface for visualizing quantum circuits
with the Quvis tool. Add circuits one by one, then call visualize() to launch
the visualization with tabs for each circuit.
"""

import os
import json
import logging
import subprocess
from typing import Any
from pathlib import Path
from dataclasses import asdict, dataclass

from qiskit import QuantumCircuit
from qiskit.transpiler import CouplingMap

from ..compiler.utils import (
    extract_operations_per_slice,
    extract_routing_operations_per_slice,
    LogicalCircuitInfo,
    CompiledCircuitInfo,
    RoutingCircuitInfo,
    DeviceInfo,
    ModularInfo,
)
from ..enums import TopologyType
from ..config import VisualizationConfig

# Create module logger
logger = logging.getLogger(__name__)


@dataclass
class CircuitStats:
    """Statistics about a quantum circuit."""
    original_gates: int
    depth: int
    qubits: int
    depth: int
    qubits: int
    transpiled_gates: int | None = None
    swap_count: int | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "original_gates": self.original_gates,
            "depth": self.depth,
            "qubits": self.qubits,
        }
        if self.transpiled_gates is not None:
            result["transpiled_gates"] = self.transpiled_gates
        if self.swap_count is not None:
            result["swap_count"] = self.swap_count
        return result


@dataclass
@dataclass
class CircuitVisualizationData:
    """Data structure for quantum circuit visualization."""
    circuit_info: LogicalCircuitInfo | CompiledCircuitInfo
    device_info: DeviceInfo
    algorithm_name: str
    circuit_type: str
    algorithm_params: dict[str, Any]
    circuit_stats: CircuitStats
    routing_info: RoutingCircuitInfo | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "circuit_info": asdict(self.circuit_info),
            "device_info": asdict(self.device_info),
            "algorithm_name": self.algorithm_name,
            "circuit_type": self.circuit_type,
            "algorithm_params": self.algorithm_params,
            "circuit_stats": self.circuit_stats.to_dict(),
        }
        if self.routing_info is not None:
            result["routing_info"] = asdict(self.routing_info)
        return result



class Visualizer:
    """
    Main Quvis visualization class for multiple quantum circuits.
    """

    def __init__(
        self,
        auto_open_browser: bool = True,
        port: int = 5173,
        verbose: bool = False,
    ):
        """
        Initialize the Quvis visualizer.

        Args:
            auto_open_browser: Whether to automatically open the browser
            port: Port for the development server (default: 5173)
            verbose: Whether to enable verbose logging
        """
        self.auto_open_browser = auto_open_browser
        self.port = port
        self.verbose = verbose
        self.circuits: List[CircuitVisualizationData] = []
        
        # Configure logging based on verbose setting
        if verbose:
            logging.basicConfig(level=logging.INFO, format='%(message)s')
        else:
            logging.basicConfig(level=logging.WARNING, format='%(message)s')

        # Frontend path is always relative to this file when installed via pip
        # From quvis/core/src/quvis/api/visualizer.py to quvis/web/
        self.frontend_path = Path(__file__).parent.parent.parent.parent.parent / "web"

        if (
            not (self.frontend_path / "package.json").exists()
            or not (self.frontend_path / "index.html").exists()
        ):
            raise ValueError(
                f"Could not find Quvis frontend at {self.frontend_path}. "
                "Please ensure the web frontend was included in the installation."
            )


    def add_circuit(
        self,
        circuit: QuantumCircuit,
        coupling_map: list[list[int]] | CouplingMap | dict[str, Any] | None = None,
        config: VisualizationConfig | None = None,
        **kwargs,
    ) -> None:
        """
        Add a quantum circuit to the visualizer.

        Args:
            circuit: The quantum circuit to add
            coupling_map: Device coupling map (optional - if None, treated as logical)
            config: Visualization configuration
            **kwargs: Legacy support for algorithm_name, topology_type, etc.
        """
        # Create config if not provided, using kwargs to populate it
        if config is None:
            config = VisualizationConfig(
                algorithm_name=kwargs.get("algorithm_name"),
                topology_type=kwargs.get("topology_type", TopologyType.CUSTOM.value),
                transpile_params={k: v for k, v in kwargs.items() if k not in ["algorithm_name", "topology_type"]}
            )
            
        if config.algorithm_name is None:
            circuit_type = "Logical" if coupling_map is None else "Compiled"
            config.algorithm_name = f"{circuit_type} Circuit {len(self.circuits) + 1}"

        logger.info(f"📊 Processing circuit: '{config.algorithm_name}'")
        
        circuit_data = self._process_circuit(
            circuit, coupling_map, config
        )
        self.circuits.append(circuit_data)

    def visualize(self) -> dict[str, Any]:
        """
        Visualize all added circuits with Quvis.

        Returns:
            Dictionary containing all visualization data for all circuits
        """
        if not self.circuits:
            raise ValueError(
                "No circuits added. Use add_circuit() to add circuits before visualizing."
            )

        logger.info(f"🌐 Launching visualization for {len(self.circuits)} circuits...")

        frontend_data = {
            "circuits": [circuit.to_dict() for circuit in self.circuits],
            "total_circuits": len(self.circuits),
        }

        self._launch_visualization(frontend_data)

        return frontend_data

    def _normalize_coupling_map(
        self,
        coupling_map: list[list[int]] | CouplingMap | dict[str, Any],
        circuit_qubits: int,
        config: VisualizationConfig
    ) -> tuple[list, int]:
        """Normalize coupling map to list of edges and device qubit count."""
        if isinstance(coupling_map, dict):
            coupling_map_list = coupling_map.get("coupling_map", [])
            num_device_qubits = coupling_map.get("num_qubits", circuit_qubits)
            if "topology_type" in coupling_map:
                config.topology_type = coupling_map["topology_type"]
            
            # Parse modular info if present
            if "num_cores" in coupling_map:
                pass
        elif isinstance(coupling_map, CouplingMap):
            coupling_map_list = list(coupling_map.get_edges())
            num_device_qubits = coupling_map.size()
        elif isinstance(coupling_map, list):
            coupling_map_list = coupling_map
            num_device_qubits = (
                max(max(edge) for edge in coupling_map) + 1
                if coupling_map
                else circuit_qubits
            )
        else:
            raise ValueError(
                "coupling_map must be a list of edges, CouplingMap object, or dictionary"
            )
            
        return coupling_map_list, num_device_qubits

    def _process_circuit(
        self,
        circuit: QuantumCircuit,
        coupling_map: list[list[int]] | CouplingMap | dict[str, Any] | None = None,
        config: VisualizationConfig = None,
    ) -> CircuitVisualizationData:
        """Process a circuit into visualization data."""

        if coupling_map is not None:
            # Extract modular info first if present (before normalization which might need it)
            # Actually, let's keep the logic simple and duplicate the modular extraction for now 
            # or simply rely on the dict check inside normalization
            
            coupling_map_list, num_device_qubits = self._normalize_coupling_map(
                coupling_map, circuit.num_qubits, config
            )
            
            # Handle modular info separately if it's a dict
            if isinstance(coupling_map, dict) and "num_cores" in coupling_map:
                 modular_info = ModularInfo(
                    num_cores=coupling_map.get("num_cores", 1),
                    qubits_per_core=coupling_map.get("qubits_per_core", 0),
                    global_topology=coupling_map.get("global_topology", TopologyType.CUSTOM.value),
                    inter_core_links=coupling_map.get("inter_core_links", [])
                )
        else:
            # No coupling map provided - logical circuit
            coupling_map_list = []
            num_device_qubits = circuit.num_qubits

        operations_per_slice = extract_operations_per_slice(circuit)

        if coupling_map is None:
            circuit_info = LogicalCircuitInfo(
                num_qubits=circuit.num_qubits,
                interaction_graph_ops_per_slice=operations_per_slice,
            )

            # Create a minimal device info for logical circuits
            device_info = DeviceInfo(
                num_qubits_on_device=circuit.num_qubits,
                connectivity_graph_coupling_map=[],
            )

            circuit_stats = CircuitStats(
                original_gates=len(circuit.data),
                depth=len(operations_per_slice),
                qubits=circuit.num_qubits,
            )

            return CircuitVisualizationData(
                circuit_info=circuit_info,
                device_info=device_info,
                algorithm_name=config.algorithm_name,
                circuit_type="logical",
                algorithm_params=config.transpile_params,
                circuit_stats=circuit_stats,
            )
        else:
            compiled_operations_per_slice = extract_operations_per_slice(circuit)

            routing_result = extract_routing_operations_per_slice(circuit)

            circuit_info = CompiledCircuitInfo(
                num_qubits=circuit.num_qubits,
                compiled_interaction_graph_ops_per_slice=compiled_operations_per_slice,
            )

            routing_info = RoutingCircuitInfo(
                num_qubits=circuit.num_qubits,
                routing_ops_per_slice=routing_result.routing_ops_per_slice,
                total_swap_count=routing_result.total_swap_count,
                routing_depth=routing_result.routing_depth,
            )

            device_info = DeviceInfo(
                num_qubits_on_device=num_device_qubits,
                connectivity_graph_coupling_map=list(coupling_map_list),
                modular_info=modular_info if 'modular_info' in locals() else None,
            )

            circuit_stats = CircuitStats(
                original_gates=len(circuit.data),
                depth=len(compiled_operations_per_slice),
                qubits=circuit.num_qubits,
                transpiled_gates=len(circuit.data),
                swap_count=routing_result.total_swap_count,
            )

            return CircuitVisualizationData(
                circuit_info=circuit_info,
                device_info=device_info,
                algorithm_name=config.algorithm_name,
                circuit_type="compiled",
                algorithm_params=config.transpile_params,
                circuit_stats=circuit_stats,
                routing_info=routing_info,
            )

    def clear_circuits(self) -> None:
        """Clear all processed circuits from the visualizer."""
        self.circuits.clear()

    def _launch_visualization(self, data: dict[str, Any]):
        """Launch the Quvis visualization with the given data."""

        data_file = self.frontend_path / "public" / "temp_circuit_data.json"
        data_file.parent.mkdir(exist_ok=True)

        try:
            with open(data_file, "w") as f:
                json.dump(data, f, separators=(",", ":"))

            # Verify the file was created and is readable
            if not data_file.exists():
                raise FileNotFoundError(f"Data file was not created: {data_file}")

            # Test that the file is readable
            with open(data_file, "r") as f:
                json.load(f)

        except Exception as e:
            logger.error(f"❌ Error creating data file: {e}")
            return

        # Store original CWD
        original_cwd = os.getcwd()
        
        try:
            # Change to frontend directory
            os.chdir(self.frontend_path)

            # Check if a server is already running on the port
            import socket

    
            def is_port_in_use(port):
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    return s.connect_ex(("localhost", port)) == 0
    
            if is_port_in_use(self.port):
                logger.warning(
                    f"⚠️  Port {self.port} is already in use. Please stop the existing server and try again."
                )
    
                return
            try:
                logger.info(f"🌐 Starting development server on port {self.port}...")
    
                env = os.environ.copy()
                env["VITE_LIBRARY_MODE"] = "true"
                env["VITE_LIBRARY_DATA_FILE"] = "temp_circuit_data.json"
    
                process = subprocess.Popen(
                    [
                        "npx",
                        "vite",
                        "--port",
                        str(self.port),
                        "--base",
                        "/",
                        "--open" if self.auto_open_browser else "--no-open",
                    ],
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
    
                if not self.auto_open_browser:
                    logger.info(f"🌐 Open your browser to: http://localhost:{self.port}")
    
                logger.info(f"✅ Quvis is running! Press Ctrl+C to stop.")
    
                try:
                    process.wait()
                except KeyboardInterrupt:
                    logger.info("\n🛑 Stopping...")
                    process.terminate()
                    process.wait()
    
            except Exception as e:
                logger.error(f"❌ Error launching visualization: {e}")
                logger.info(
                    f"💡 Try running manually: VITE_LIBRARY_MODE=true npx vite --port {self.port} --base /"
                )
    
            if data_file.exists():
                data_file.unlink()
                
        finally:
            # Restore original CWD
            os.chdir(original_cwd)


def visualize_circuit(
    circuit: QuantumCircuit,
    coupling_map: list[list[int]] | CouplingMap | dict[str, Any] | None = None,
    algorithm_name: str = "Custom Circuit",
    verbose: bool = False,
    **kwargs,
) -> dict[str, Any]:
    """
    Convenience function to visualize a quantum circuit with Quvis.
    Generates both logical and compiled versions for unified visualization.

    Args:
        circuit: The quantum circuit to visualize
        coupling_map: Device coupling map (optional)
        algorithm_name: Name for the circuit (displayed in UI)
        verbose: Whether to enable verbose logging
        **kwargs: Additional arguments for visualization

    Returns:
        Dictionary containing multi-circuit visualization data (logical + compiled)
    """
    config = VisualizationConfig(
        algorithm_name=algorithm_name,
        # topology_type is not explictly passed here often, usually in coupling_map or default
        transpile_params=kwargs
    )
    
    visualizer = Visualizer(verbose=verbose)
    visualizer.add_circuit(
        circuit, coupling_map, config=config
    )
    return visualizer.visualize()
