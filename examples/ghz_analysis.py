#!/usr/bin/env python3
"""
GHZ Circuit Analysis Example

Creates GHZ (Greenberger-Horne-Zeilinger) circuits of any size for visualization.
Circuit size is taken from command line argument. Always uses from_grid topology
and compiles with all optimization levels (0, 1, 2, 3).

Usage:
    python ghz_analysis.py <num_qubits>

Example:
    python ghz_analysis.py 100    # Creates 100-qubit GHZ circuit with all optimization levels
    python ghz_analysis.py 5000   # Creates 5000-qubit GHZ circuit with all optimization levels
"""

import sys
import time
from math import sqrt, ceil

from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
from quvis import Visualizer


def create_ghz_circuit(num_qubits):
    """
    Create a GHZ (Greenberger-Horne-Zeilinger) circuit.

    A GHZ circuit creates a maximally entangled state of n qubits:
    |GHZ⟩ = (|00...0⟩ + |11...1⟩) / √2

    Args:
        num_qubits: Number of qubits in the GHZ circuit

    Returns:
        QuantumCircuit: The GHZ circuit
    """
    qc = QuantumCircuit(num_qubits)

    # Apply Hadamard gate to first qubit
    qc.h(0)

    # Apply CNOT gates from first qubit to all others
    for i in range(1, num_qubits):
        qc.cx(0, i)

    return qc


def main():
    """Main function to create and visualize GHZ circuits."""

    # Get number of qubits from command line argument
    if len(sys.argv) != 2:
        print("Usage: python ghz_analysis.py <num_qubits>")
        print("Example: python ghz_analysis.py 100")
        sys.exit(1)

    try:
        num_qubits = int(sys.argv[1])
        if num_qubits < 2:
            raise ValueError("Number of qubits must be at least 2")
    except ValueError as e:
        print(f"Error: Invalid number of qubits. {e}")
        sys.exit(1)

    print(f"Creating GHZ circuit analysis with {num_qubits} qubits...")
    print("Using from_grid topology and all optimization levels (0, 1, 2, 3)")

    # Create visualizer
    visualizer = Visualizer()

    # Create the logical GHZ circuit
    print("Creating logical GHZ circuit...")
    logical_circuit = create_ghz_circuit(num_qubits)
    visualizer.add_circuit(logical_circuit, algorithm_name=f"GHZ Logical (Q={num_qubits})")

    # Create grid coupling map for the circuit
    # Use a square grid that can accommodate all qubits
    grid_size = int(ceil(sqrt(num_qubits)))
    print(f"Creating {grid_size}x{grid_size} grid topology...")

    coupling_map = CouplingMap.from_grid(grid_size, grid_size)

    # Transpile with all optimization levels
    optimization_levels = [0, 1, 2, 3]
    compiled_circuits = {}
    compilation_times = {}

    for opt_level in optimization_levels:
        print(f"Transpiling circuit with optimization level {opt_level}...")

        # Measure compilation time
        start_time = time.perf_counter()
        compiled_circuit = transpile(
            logical_circuit,
            coupling_map=coupling_map,
            optimization_level=opt_level
        )
        end_time = time.perf_counter()

        compilation_time = end_time - start_time
        print(f"  Compilation time: {compilation_time:.3f} seconds")

        # Store for statistics
        compiled_circuits[opt_level] = compiled_circuit
        compilation_times[opt_level] = compilation_time

        # Add compiled circuit to visualizer
        visualizer.add_circuit(
            compiled_circuit,
            coupling_map=coupling_map,
            algorithm_name=f"GHZ Compiled (Q={num_qubits}, Grid={grid_size}x{grid_size}, O={opt_level})",
        )

    # Print circuit statistics
    print(f"\\nCircuit Statistics:")
    print(f"  Logical circuit:")
    print(f"    Qubits: {logical_circuit.num_qubits}")
    print(f"    Gates: {logical_circuit.size()}")
    print(f"    Depth: {logical_circuit.depth()}")

    print(f"  Grid topology: {grid_size}x{grid_size}")

    for opt_level in optimization_levels:
        circuit = compiled_circuits[opt_level]
        comp_time = compilation_times[opt_level]
        print(f"  Compiled circuit (O={opt_level}):")
        print(f"    Compilation time: {comp_time:.3f} seconds")
        print(f"    Qubits: {circuit.num_qubits}")
        print(f"    Gates: {circuit.size()}")
        print(f"    Depth: {circuit.depth()}")

        # Calculate routing overhead
        routing_overhead = circuit.size() - logical_circuit.size()
        overhead_percentage = (routing_overhead / logical_circuit.size()) * 100 if logical_circuit.size() > 0 else 0
        print(f"    Routing overhead: {routing_overhead} gates ({overhead_percentage:.1f}%)")

    # Start visualization
    print(f"\\nStarting visualization...")
    print("The visualizer will open in your browser.")

    visualizer.visualize()


if __name__ == "__main__":
    main()