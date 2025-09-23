"""
Interactive Playground API

This module provides the backend for the interactive playground mode,
generating quantum circuits on-demand based on user selections.
"""

import sys, math, json, os, argparse, logging
from typing import Any 
from pathlib import Path
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
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
        algorithm: str,
        num_qubits: int,
        physical_qubits: int,
        topology: str,
        optimization_level: int = 1,
        **kwargs,
    ) -> dict[str, Any]:
        """
        Generate visualization data for a quantum circuit.

        Args:
            algorithm: Algorithm type ('qft', 'qaoa', 'ghz')
            num_qubits: Number of logical qubits (4-1000)
            topology: Topology type ('line', 'ring', 'grid', 'heavy_hex', etc.)
            optimization_level: Qiskit optimization level (0-3)
            physical_qubits: Number of physical qubits for the device topology (defaults to num_qubits)
            **kwargs: Additional algorithm parameters

        Returns:
            Dictionary containing visualization data in library_multi format
        """

        circuit = self._create_circuit(algorithm, num_qubits, **kwargs)
        coupling_map = self._create_coupling_map(topology, physical_qubits)

        basis_gates = ["id", "rz", "sx", "x", "cx", "swap"]

        logger.info("Processing circuit for playground visualization...")

        # Process logical circuit
        logger.info("Processing logical circuit...")
        logical_circuit_data = self._process_logical_circuit(circuit, algorithm, kwargs)

        # Process compiled circuit
        logger.info("Processing compiled circuit...")
        compiled_circuit_data = self._process_compiled_circuit(
            circuit,
            coupling_map,
            basis_gates,
            optimization_level,
            algorithm,
            kwargs,
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
        algorithm: str,
        kwargs: dict[str, Any],
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
            "algorithm_name": f"{algorithm.upper()} (Logical)",
            "circuit_type": "logical",
            "algorithm_params": kwargs,
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
        optimization_level: int,
        algorithm: str,
        kwargs: dict[str, Any],
    ) -> dict[str, Any]:
        """Process the compiled version of the circuit."""
        logger.info(
            f"🔧 Transpiling for optimization level {optimization_level}..."
        )

        transpiled_circuit = transpile(
            circuit,
            basis_gates=basis_gates,
            optimization_level=optimization_level,
            coupling_map=coupling_map)
        logger.info(
            f"   ✓ Transpilation complete: {len(transpiled_circuit.data)} gates total"
        )

        compiled_operations_per_slice = extract_operations_per_slice(transpiled_circuit)
        logger.info(
            f"   ✓ Extracted {len(compiled_operations_per_slice)} time slices from compiled circuit"
        )

        routing_operations_per_slice, total_swap_count, routing_depth = (
            extract_routing_operations_per_slice(transpiled_circuit)
        )
        logger.info(
            f"   ✓ Found {total_swap_count} SWAP gates for qubit routing"
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
            routing_ops_per_slice=routing_operations_per_slice,
            total_swap_count=total_swap_count,
            routing_depth=routing_depth,
        )

        device_info = DeviceInfo(
            num_qubits_on_device=coupling_map.size(),
            connectivity_graph_coupling_map=list(coupling_map.get_edges()),
        )

        return {
            "circuit_info": asdict(compiled_info),
            "routing_info": asdict(routing_info),
            "device_info": asdict(device_info),
            "algorithm_name": f"{algorithm.upper()} (Compiled)",
            "circuit_type": "compiled",
            "algorithm_params": kwargs,
            "routing_analysis": routing_analysis,
            "circuit_stats": {
                "original_gates": len(circuit.data),
                "transpiled_gates": len(transpiled_circuit.data),
                "depth": len(compiled_operations_per_slice),
                "qubits": transpiled_circuit.num_qubits,
                "swap_count": total_swap_count,
            },
        }

    def _create_circuit(
        self, algorithm: str, num_qubits: int, **kwargs
    ) -> QuantumCircuit:
        """Create a quantum circuit based on algorithm type."""

        if algorithm == "qft":
            return QFT(num_qubits=num_qubits, do_swaps=True, name=f"QFT-{num_qubits}")

        elif algorithm == "ghz":
            circuit = QuantumCircuit(num_qubits, name=f"GHZ-{num_qubits}")
            circuit.h(0)
            for i in range(1, num_qubits):
                circuit.cx(0, i)
            return circuit

        elif algorithm == "qaoa":
            reps = kwargs.get("reps", 2)
            circuit = QuantumCircuit(num_qubits, name=f"QAOA-{num_qubits}-p{reps}")

            for _ in range(reps):
                # Problem layer (ZZ interactions)
                for i in range(num_qubits - 1):
                    circuit.rzz(0.5, i, i + 1)

                # Mixer layer (X rotations)
                for i in range(num_qubits):
                    circuit.rx(0.3, i)

            return circuit

        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

    def _create_coupling_map(self, topology: str, physical_qubits: int) -> QiskitCouplingMap:
        """Create a coupling map using Qiskit's built-in topology generators."""

        if topology == "line":
            return QiskitCouplingMap.from_line(physical_qubits)

        elif topology == "ring":
            return QiskitCouplingMap.from_ring(physical_qubits)

        elif topology == "grid":
            # Find best square grid size
            n = int(physical_qubits**0.5)
            if n * n < physical_qubits:
                n += 1
            return QiskitCouplingMap.from_grid(n, n)

        elif topology == "heavy_hex":
            distance = math.ceil((2 + math.sqrt(24 + 40 * physical_qubits)) / 10)

            if distance % 2 == 0:
                distance += 1

            return QiskitCouplingMap.from_heavy_hex(distance)

        elif topology == "heavy_square":
            distance = math.ceil((1 + math.sqrt(1 + 3 * physical_qubits)) / 3)

            if distance % 2 == 0:
                distance += 1

            return QiskitCouplingMap.from_heavy_square(distance)

        elif topology == "hexagonal":
            rows = max(2, int((physical_qubits / 2) ** 0.5))
            cols = max(2, physical_qubits // rows)
            return QiskitCouplingMap.from_hexagonal_lattice(rows, cols)

        elif topology == "full":
            return QiskitCouplingMap.from_full(physical_qubits)

        else:
            raise ValueError(
                f"Unsupported topology: {topology}."
            )

    def get_supported_algorithms(self) -> list:
        """Get list of supported algorithms."""
        return ["qft", "qaoa", "ghz"]


def generate_playground_circuit(
    algorithm: str, num_qubits: int, physical_qubits: int , topology: str,  **kwargs
) -> dict[str, Any]:
    """
    High-level function to generate a playground circuit.
    """
    api = PlaygroundAPI()
    return api.generate_visualization_data(algorithm, num_qubits, physical_qubits, topology, **kwargs)


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

    # Generate circuit with the API
    try:
        logger.info(
            f"INFO: Generating circuit - algorithm: {args.algorithm}, qubits: {args.num_qubits}, topology: {args.topology}"
        )

        result = generate_playground_circuit(
            algorithm=args.algorithm,
            num_qubits=args.num_qubits,
            physical_qubits=args.physical_qubits,
            topology=args.topology,
            optimization_level=args.optimization_level,
        )

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
