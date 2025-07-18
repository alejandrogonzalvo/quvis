#!/usr/bin/env python3
"""
Quvis Python Library - Quantum Circuit Visualization Tool

This module provides a matplotlib-like interface for visualizing quantum circuits
with the Quvis tool. Add circuits one by one, then call visualize() to launch
the visualization with tabs for each circuit.
"""

import os
import json
import tempfile
import subprocess
import webbrowser
import time
from typing import Dict, Any, Optional, Union, List
from pathlib import Path
from dataclasses import asdict

from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap

# Handle both relative and absolute imports
try:
    from ..compiler.utils import (
        extract_operations_per_slice, extract_routing_operations_per_slice,
        analyze_routing_overhead, LogicalCircuitInfo, CompiledCircuitInfo,
        RoutingCircuitInfo, DeviceInfo, VisualizationData
    )
except ImportError:
    # Fallback for when run as a standalone script
    from compiler_utils import (
        extract_operations_per_slice, extract_routing_operations_per_slice,
        analyze_routing_overhead, LogicalCircuitInfo, CompiledCircuitInfo,
        RoutingCircuitInfo, DeviceInfo, VisualizationData
    )


class CircuitEntry:
    """Internal class to store circuit data before visualization."""
    def __init__(self, circuit: QuantumCircuit, coupling_map: Optional[Union[List[List[int]], CouplingMap, Dict[str, Any]]] = None,
                 algorithm_name: str = "Circuit", topology_type: str = "custom", **kwargs):
        self.circuit = circuit
        self.coupling_map = coupling_map
        self.algorithm_name = algorithm_name
        self.topology_type = topology_type
        self.kwargs = kwargs


class QuvisVisualizer:
    """
    Main Quvis visualization class for multiple quantum circuits.
    
    This class provides a matplotlib-like interface where you can add multiple
    circuits and then visualize them all at once with tabs.
    """
    
    def __init__(self, 
                 frontend_path: Optional[str] = None,
                 auto_open_browser: bool = True,
                 port: int = 5173):
        """
        Initialize the Quvis visualizer.
        
        Args:
            frontend_path: Path to the Quvis frontend directory (auto-detected if None)
            auto_open_browser: Whether to automatically open the browser
            port: Port for the development server (default: 5173)
        """
        self.auto_open_browser = auto_open_browser
        self.port = port
        self.circuits: List[CircuitEntry] = []
        
        # Auto-detect frontend path if not provided
        if frontend_path is None:
            # Look for the frontend relative to this file
            current_dir = Path(__file__).parent
            possible_paths = [
                # Development mode paths - prioritize the correct web directory
                current_dir.parent.parent.parent.parent / "web",  # ../../web from quvis/core/src/quvis/api
                Path.cwd() / "quvis" / "web",  # Current working directory + quvis/web
                current_dir.parent.parent.parent.parent.parent / "quvis-web" / "quvis" / "web",  # ../../../quvis-web/quvis/web (legacy)
                
                # Installed package paths
                current_dir.parent.parent.parent.parent.parent / "web",  # Installed package location
                Path(__file__).parent.parent.parent.parent.parent / "quvis" / "web",  # Alternative install location
            ]
            
            # Try to find the web frontend through importlib (for installed packages)
            try:
                import importlib.util
                import sys
                
                # Check if we can find the installed web directory
                for path in sys.path:
                    potential_web_path = Path(path) / "quvis" / "web"
                    if potential_web_path.exists() and (potential_web_path / "package.json").exists():
                        possible_paths.insert(0, potential_web_path)
                        break
                        
                # Also check site-packages
                import site
                for site_path in site.getsitepackages():
                    potential_web_path = Path(site_path) / "quvis" / "web"
                    if potential_web_path.exists() and (potential_web_path / "package.json").exists():
                        possible_paths.insert(0, potential_web_path)
                        break
                        
            except ImportError:
                pass
            
            for path in possible_paths:
                if (path / "package.json").exists() and (path / "index.html").exists():
                    self.frontend_path = path
                    break
            else:
                raise ValueError(
                    "Could not find Quvis frontend. Please specify frontend_path or ensure "
                    "the web frontend is available. For development, run from the project root. "
                    "For installed packages, ensure the web frontend was included in the installation."
                )
        else:
            self.frontend_path = Path(frontend_path)
        
        print(f"Using frontend path: {self.frontend_path}")
    
    def add_circuit(self,
                    circuit: QuantumCircuit,
                    coupling_map: Optional[Union[List[List[int]], CouplingMap, Dict[str, Any]]] = None,
                    algorithm_name: Optional[str] = None,
                    topology_type: str = "custom",
                    **kwargs) -> None:
        """
        Add a quantum circuit to the visualizer.
        
        Args:
            circuit: The quantum circuit to add
            coupling_map: Device coupling map (optional - if None, treated as logical)
            algorithm_name: Name for the circuit (displayed in UI)
            topology_type: Type of topology (for display purposes)
            **kwargs: Additional arguments for circuit processing
        """
        if algorithm_name is None:
            # Generate a name based on whether it's logical or compiled
            circuit_type = "Logical" if coupling_map is None else "Compiled"
            algorithm_name = f"{circuit_type} Circuit {len(self.circuits) + 1}"
        
        entry = CircuitEntry(circuit, coupling_map, algorithm_name, topology_type, **kwargs)
        self.circuits.append(entry)
        
        circuit_type = "logical" if coupling_map is None else "compiled"
        print(f"➕ Added {circuit_type} circuit: '{algorithm_name}'")
    
    def visualize(self) -> Dict[str, Any]:
        """
        Visualize all added circuits with Quvis.
        
        Returns:
            Dictionary containing all visualization data for all circuits
        """
        if not self.circuits:
            raise ValueError("No circuits added. Use add_circuit() to add circuits before visualizing.")
        
        print(f"🔄 Processing {len(self.circuits)} circuits for visualization...")
        
        # Process each circuit
        all_circuit_data = []
        for i, entry in enumerate(self.circuits):
            print(f"📊 Processing circuit {i+1}/{len(self.circuits)}: '{entry.algorithm_name}'")
            circuit_data = self._process_circuit(entry)
            all_circuit_data.append(circuit_data)
        
        # Prepare frontend data with multiple circuits
        frontend_data = {
            "circuits": all_circuit_data,
            "mode": "library_multi",  # New mode for multiple circuits
            "total_circuits": len(all_circuit_data)
        }
        
        print(f"✅ All circuits processed successfully")
        
        # Launch visualization
        self._launch_visualization(frontend_data)
        
        return frontend_data
    
    def _process_circuit(self, entry: CircuitEntry) -> Dict[str, Any]:
        """Process a circuit entry into visualization data."""
        circuit = entry.circuit
        coupling_map = entry.coupling_map
        algorithm_name = entry.algorithm_name
        topology_type = entry.topology_type
        transpile_kwargs = entry.kwargs
        
        # Process coupling map
        if coupling_map is not None:
            if isinstance(coupling_map, dict):
                # Dictionary format (like our coupling map files)
                coupling_map_list = coupling_map.get("coupling_map", [])
                num_device_qubits = coupling_map.get("num_qubits", circuit.num_qubits)
                if "topology_type" in coupling_map:
                    topology_type = coupling_map["topology_type"]
            elif isinstance(coupling_map, CouplingMap):
                # Qiskit CouplingMap object
                coupling_map_list = coupling_map.get_edges()
                num_device_qubits = coupling_map.size()
            elif isinstance(coupling_map, list):
                # List of edges
                coupling_map_list = coupling_map
                num_device_qubits = max(max(edge) for edge in coupling_map) + 1 if coupling_map else circuit.num_qubits
            else:
                raise ValueError("coupling_map must be a list of edges, CouplingMap object, or dictionary")
        else:
            # No coupling map provided - logical circuit
            coupling_map_list = []
            num_device_qubits = circuit.num_qubits
        
        # Decompose the circuit for analysis
        decomposed_circuit = circuit.decompose()
        
        # Extract operations from the circuit
        operations_per_slice = extract_operations_per_slice(decomposed_circuit)
        
        # For logical circuits (no coupling map), we use the original circuit data
        if coupling_map is None:
            # Logical circuit - use original operations
            circuit_info = LogicalCircuitInfo(
                num_qubits=decomposed_circuit.num_qubits,
                interaction_graph_ops_per_slice=operations_per_slice
            )
            
            # Create a minimal device info for logical circuits
            device_info = DeviceInfo(
                source_coupling_map_file="logical_circuit",
                topology_type="logical",
                num_qubits_on_device=decomposed_circuit.num_qubits,
                connectivity_graph_coupling_map=[]
            )
            
            return {
                "circuit_info": asdict(circuit_info),
                "device_info": asdict(device_info),
                "algorithm_name": algorithm_name,
                "circuit_type": "logical",
                "algorithm_params": transpile_kwargs,
                "circuit_stats": {
                    "original_gates": len(circuit.data),
                    "depth": len(operations_per_slice),
                    "qubits": decomposed_circuit.num_qubits
                }
            }
        else:
            # Compiled circuit - assume circuit is already compiled externally
            # Extract operations from the provided (already compiled) circuit
            compiled_operations_per_slice = extract_operations_per_slice(decomposed_circuit)
            
            # Extract routing operations from the compiled circuit
            routing_operations_per_slice, total_swap_count, routing_depth = extract_routing_operations_per_slice(decomposed_circuit)
            
            # Create data structures
            circuit_info = CompiledCircuitInfo(
                num_qubits=decomposed_circuit.num_qubits,
                compiled_interaction_graph_ops_per_slice=compiled_operations_per_slice
            )
            
            routing_info = RoutingCircuitInfo(
                num_qubits=decomposed_circuit.num_qubits,
                routing_ops_per_slice=routing_operations_per_slice,
                total_swap_count=total_swap_count,
                routing_depth=routing_depth
            )
            
            device_info = DeviceInfo(
                source_coupling_map_file="python_library",
                topology_type=topology_type,
                num_qubits_on_device=num_device_qubits,
                connectivity_graph_coupling_map=list(coupling_map_list)
            )
            
            return {
                "circuit_info": asdict(circuit_info),
                "routing_info": asdict(routing_info),
                "device_info": asdict(device_info),
                "algorithm_name": algorithm_name,
                "circuit_type": "compiled",
                "algorithm_params": transpile_kwargs,
                "circuit_stats": {
                    "original_gates": len(circuit.data),
                    "transpiled_gates": len(decomposed_circuit.data),
                    "depth": len(compiled_operations_per_slice),
                    "qubits": decomposed_circuit.num_qubits,
                    "swap_count": total_swap_count
                }
            }
    
    def clear_circuits(self) -> None:
        """Clear all added circuits."""
        self.circuits.clear()
        print("🗑️  Cleared all circuits")
    
    def _launch_visualization(self, data: Dict[str, Any]):
        """Launch the Quvis visualization with the given data."""
        print(f"🚀 Launching visualization with {len(data['circuits'])} circuits...")
        
        # Create a temporary data file
        data_file = self.frontend_path / "public" / "temp_circuit_data.json"
        data_file.parent.mkdir(exist_ok=True)
        
        # Write the data file with error handling
        try:
            with open(data_file, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            
            # Verify the file was created and is readable
            if not data_file.exists():
                raise FileNotFoundError(f"Data file was not created: {data_file}")
            
            # Test that the file is readable
            with open(data_file, 'r') as f:
                json.load(f)
            
        except Exception as e:
            print(f"❌ Error creating data file: {e}")
            return
        
        # Change to frontend directory
        os.chdir(self.frontend_path)
        
        # Check if a server is already running on the port
        import socket
        import urllib.request
        import urllib.error
        
        def is_port_in_use(port):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                return s.connect_ex(('localhost', port)) == 0
        
        def test_file_accessibility(port, filename):
            """Test if the server can serve the specific file."""
            try:
                url = f"http://localhost:{port}/{filename}"
                response = urllib.request.urlopen(url, timeout=5)
                return response.status == 200
            except (urllib.error.URLError, socket.timeout):
                return False
        
        if is_port_in_use(self.port):
            print(f"⚠️  Port {self.port} is already in use. Please stop the existing server and try again.")
            print(f"   Or manually run: VITE_LIBRARY_MODE=true npx vite --port {self.port} --base /")
        else:
            # Launch the development server
            try:
                print(f"🌐 Starting development server on port {self.port}...")
                
                # Start the development server with library mode environment variable
                env = os.environ.copy()
                env['VITE_LIBRARY_MODE'] = 'true'
                env['VITE_LIBRARY_DATA_FILE'] = 'temp_circuit_data.json'
                
                process = subprocess.Popen(
                    ['npx', 'vite', '--port', str(self.port), '--base', '/', '--open' if self.auto_open_browser else '--no-open'],
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Wait for server to be ready and able to serve the file
                server_ready = False
                file_accessible = False
                max_wait_time = 30  # Maximum wait time in seconds
                check_interval = 1  # Check every second
                
                for attempt in range(max_wait_time):
                    if is_port_in_use(self.port):
                        server_ready = True
                        
                        # Wait a bit more for the server to be fully ready
                        time.sleep(2)
                        
                        # Test if the file is accessible
                        if test_file_accessibility(self.port, 'temp_circuit_data.json'):
                            file_accessible = True
                            break
                    
                    time.sleep(check_interval)
                
                if not server_ready:
                    print("❌ Server failed to start. Please check for errors and try again.")
                    process.terminate()
                    return
                elif not file_accessible:
                    print("⚠️  Server started but data file may not be accessible yet.")
                
                if not self.auto_open_browser:
                    print(f"🌐 Open your browser to: http://localhost:{self.port}")
                
                print(f"✅ Quvis is running! Press Ctrl+C to stop.")
                
                # Wait for user to stop
                try:
                    process.wait()
                except KeyboardInterrupt:
                    print("\n🛑 Stopping...")
                    process.terminate()
                    process.wait()
                    
            except Exception as e:
                print(f"❌ Error launching visualization: {e}")
                print(f"💡 Try running manually: VITE_LIBRARY_MODE=true npx vite --port {self.port} --base /")
        
        # Clean up temporary files
        try:
            if data_file.exists():
                data_file.unlink()
        except Exception as e:
            print(f"⚠️  Warning: Could not clean up temporary file: {e}")


# Convenience function for basic circuit visualization
def visualize_circuit(circuit: QuantumCircuit, 
                     coupling_map: Optional[Union[List[List[int]], CouplingMap, Dict[str, Any]]] = None,
                     algorithm_name: str = "Custom Circuit",
                     **kwargs) -> Dict[str, Any]:
    """
    Convenience function to visualize a quantum circuit with Quvis.
    Generates both logical and compiled versions for unified visualization.
    
    Args:
        circuit: The quantum circuit to visualize
        coupling_map: Device coupling map (optional)
        algorithm_name: Name for the circuit (displayed in UI)
        **kwargs: Additional arguments for visualization
    
    Returns:
        Dictionary containing multi-circuit visualization data (logical + compiled)
    """
    visualizer = QuvisVisualizer()
    visualizer.add_circuit(circuit, coupling_map, algorithm_name=algorithm_name, **kwargs)
    return visualizer.visualize()


def create_example_circuit() -> QuantumCircuit:
    """Create an example quantum circuit for testing."""
    qc = QuantumCircuit(4, name="Example Circuit")
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.cx(2, 3)
    qc.rz(1.5, 3)
    qc.cx(2, 3)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    return qc


if __name__ == "__main__":
    # Example usage
    print("🎯 Quvis Library Example")
    circuit = create_example_circuit()
    
    # Example coupling map (simple line topology)
    coupling_map = {
        "coupling_map": [[0, 1], [1, 2], [2, 3]],
        "num_qubits": 4,
        "topology_type": "line"
    }
    
    visualize_circuit(circuit, coupling_map, algorithm_name="Example Circuit") 