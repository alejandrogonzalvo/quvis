"""
Interactive Playground API

This module provides the backend for the interactive playground mode,
generating quantum circuits on-demand based on user selections.
"""

import sys, json, os, argparse, logging
from typing import Any 
from pathlib import Path
from qiskit import QuantumCircuit
from qiskit.transpiler import CouplingMap as QiskitCouplingMap
from qiskit import transpile
from dataclasses import asdict
from ..compiler.utils import (
    extract_operations_per_slice,
    extract_routing_operations_per_slice,
    analyze_routing_overhead,
    LogicalCircuitInfo,
    CompiledCircuitInfo,
    RoutingCircuitInfo,
    DeviceInfo,
)
from ..enums import AlgorithmType, TopologyType
from ..config import CircuitGenerationConfig
from ..factories import CircuitFactory, TopologyFactory

# Create module logger
logger = logging.getLogger(__name__)


class PlaygroundAPI:
    """
    API for generating quantum circuits and visualization data on-demand
    for the interactive playground mode.
    """

    def __init__(self):
        """Initialize the Playground API."""
        pass

    def generate_visualization_data(
        self,
        config: CircuitGenerationConfig
    ) -> dict[str, Any]:
        """
        Generate visualization data for a quantum circuit.

        Args:
            config: Configuration object containing all generation parameters.

        Returns:
            Dictionary containing visualization data in library_multi format
        """

        circuit = self._create_circuit(config)
        coupling_map = self._create_coupling_map(config.topology, config.physical_qubits)

        basis_gates = ["id", "rz", "sx", "x", "cx", "swap"]

        logger.info("Processing circuit for playground visualization...")

        # Process logical circuit
        logger.info("Processing logical circuit...")
        logical_circuit_data = self._process_logical_circuit(circuit, config)

        # Process compiled circuit
        logger.info("Processing compiled circuit...")
        compiled_circuit_data = self._process_compiled_circuit(
            circuit,
            coupling_map,
            basis_gates,
            config,
        )

        result = {
            "circuits": [logical_circuit_data, compiled_circuit_data],
            "total_circuits": 2,
        }

        logger.info("Playground circuit generation completed successfully!")
        logger.info("Generated logical and compiled versions")

        return result

    def _process_logical_circuit(
        self,
        circuit: QuantumCircuit,
        config: CircuitGenerationConfig,
    ) -> dict[str, Any]:
        """Process the logical version of the circuit."""
        decomposed_circuit = circuit.decompose()
        logical_operations_per_slice = extract_operations_per_slice(decomposed_circuit)
        logger.info(
            f"   ✓ Extracted {len(logical_operations_per_slice)} time slices from logical circuit"
        )

        logical_info = LogicalCircuitInfo(
            num_qubits=decomposed_circuit.num_qubits,
            interaction_graph_ops_per_slice=logical_operations_per_slice,
        )

        device_info = DeviceInfo(
            num_qubits_on_device=decomposed_circuit.num_qubits,
            connectivity_graph_coupling_map=[],
        )

        return {
            "circuit_info": asdict(logical_info),
            "device_info": asdict(device_info),
            "algorithm_name": f"{config.algorithm.value.upper()} (Logical)",
            "circuit_type": "logical",
            "algorithm_params": config.algorithm_params,
            "circuit_stats": {
                "original_gates": len(circuit.data),
                "depth": len(logical_operations_per_slice),
                "qubits": decomposed_circuit.num_qubits,
            },
        }

    def _process_compiled_circuit(
        self,
        circuit: QuantumCircuit,
        coupling_map: QiskitCouplingMap,
        basis_gates: list[str],
        config: CircuitGenerationConfig,
    ) -> dict[str, Any]:
        """Process the compiled version of the circuit."""
        logger.info(
            f"🔧 Transpiling for optimization level {config.optimization_level}..."
        )

        transpiled_circuit = transpile(
            circuit,
            basis_gates=basis_gates,
            optimization_level=config.optimization_level,
            coupling_map=coupling_map)
        logger.info(
            f"   ✓ Transpilation complete: {len(transpiled_circuit.data)} gates total"
        )

        compiled_operations_per_slice = extract_operations_per_slice(transpiled_circuit)
        logger.info(
            f"   ✓ Extracted {len(compiled_operations_per_slice)} time slices from compiled circuit"
        )

        routing_result = extract_routing_operations_per_slice(transpiled_circuit)
        logger.info(
            f"   ✓ Found {routing_result.total_swap_count} SWAP gates for qubit routing"
        )

        routing_analysis = analyze_routing_overhead(
            circuit.decompose(), transpiled_circuit
        )
        logger.info(
            f"   ✓ Routing overhead: {routing_analysis['routing_overhead_percentage']:.1f}%"
        )

        compiled_info = CompiledCircuitInfo(
            num_qubits=transpiled_circuit.num_qubits,
            compiled_interaction_graph_ops_per_slice=compiled_operations_per_slice,
        )

        routing_info = RoutingCircuitInfo(
            num_qubits=transpiled_circuit.num_qubits,
            routing_ops_per_slice=routing_result.routing_ops_per_slice,
            total_swap_count=routing_result.total_swap_count,
            routing_depth=routing_result.routing_depth,
        )

        device_info = DeviceInfo(
            num_qubits_on_device=coupling_map.size(),
            connectivity_graph_coupling_map=list(coupling_map.get_edges()),
        )

        return {
            "circuit_info": asdict(compiled_info),
            "routing_info": asdict(routing_info),
            "device_info": asdict(device_info),
            "algorithm_name": f"{config.algorithm.value.upper()} (Compiled)",
            "circuit_type": "compiled",
            "algorithm_params": config.algorithm_params,
            "routing_analysis": routing_analysis,
            "circuit_stats": {
                "original_gates": len(circuit.data),
                "transpiled_gates": len(transpiled_circuit.data),
                "depth": len(compiled_operations_per_slice),
                "qubits": transpiled_circuit.num_qubits,
                "swap_count": routing_result.total_swap_count,
            },
        }

    def _create_circuit(
        self, config: CircuitGenerationConfig
    ) -> QuantumCircuit:
        """Create a quantum circuit based on algorithm type."""
        return CircuitFactory.create(config)

    def _create_coupling_map(self, topology: str, physical_qubits: int) -> QiskitCouplingMap:
        """Create a coupling map using Qiskit's built-in topology generators."""
        return TopologyFactory.create(TopologyType(topology), physical_qubits)

    def get_supported_algorithms(self) -> list:
        """Get list of supported algorithms."""
        return [algo.value for algo in AlgorithmType]


def generate_playground_circuit(
    algorithm: str, num_qubits: int, physical_qubits: int , topology: str,  **kwargs
) -> dict[str, Any]:
    """
    High-level function to generate a playground circuit.
    """
    config = CircuitGenerationConfig(
        algorithm=AlgorithmType(algorithm),
        num_qubits=num_qubits,
        physical_qubits=physical_qubits,
        topology=TopologyType(topology),
        algorithm_params=kwargs
    )
    api = PlaygroundAPI()
    return api.generate_visualization_data(config)


def main():
    parser = argparse.ArgumentParser(
        description="Generate a quantum circuit for the Quvis playground."
    )
    parser.add_argument(
        "--algorithm", required=True, type=str, help="The algorithm to use."
    )
    parser.add_argument(
        "--num-qubits", required=True, type=int, help="The number of logical qubits."
    )
    parser.add_argument(
        "--physical-qubits", type=int, help="The number of physical qubits for the device topology."
    )
    parser.add_argument(
        "--topology", required=True, type=str, help="The circuit topology."
    )
    parser.add_argument(
        "--optimization-level", type=int, default=1, help="The optimization level."
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose logging."
    )
    args = parser.parse_args()
    
    # Configure logging based on verbose setting
    if args.verbose:
        logging.basicConfig(level=logging.INFO, format='%(message)s', stream=sys.stderr)
    else:
        logging.basicConfig(level=logging.WARNING, format='%(message)s', stream=sys.stderr)

    api = PlaygroundAPI()

    # Generate circuit with the API
    try:
        logger.info(
            f"INFO: Generating circuit - algorithm: {args.algorithm}, qubits: {args.num_qubits}, topology: {args.topology}"
        )

        kwargs = {"optimization_level": args.optimization_level}
        
        config = CircuitGenerationConfig(
            algorithm=AlgorithmType(args.algorithm),
            num_qubits=args.num_qubits,
            physical_qubits=args.physical_qubits or args.num_qubits,
            topology=TopologyType(args.topology),
            optimization_level=args.optimization_level,
            algorithm_params=kwargs # Assuming other kwargs might be added later via parser
        )

        result = api.generate_visualization_data(config)

        # Add generation success flag
        result["generation_successful"] = True

        # Save to public directory for frontend
        cwd = Path(os.getcwd())
        output_path = cwd / "quvis/web/public/playground_circuit_data.json"

        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(result, f, separators=(",", ":"))
            logger.info(f"INFO: Saved circuit data to: {output_path}")
        except (OSError, IOError) as e:
            logger.warning(
                f"WARNING: Could not save circuit data to {output_path}: {e}"
            )

        logger.info(f"INFO: Circuit generation completed successfully")

        # Output result to stdout (this MUST be the last print to stdout)
        print(json.dumps(result, separators=(",", ":")))

    except Exception as e:
        logger.error(f"ERROR: Circuit generation failed: {e}")
        import traceback

        logger.error(f"ERROR: Traceback: {traceback.format_exc()}")
        error_result = {"generation_successful": False, "error": str(e)}
        print(json.dumps(error_result, separators=(",", ":")))
        sys.exit(1)


if __name__ == "__main__":
    main()
