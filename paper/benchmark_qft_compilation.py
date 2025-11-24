#!/usr/bin/env python3
"""
Benchmark QFT circuit depth vs qubit count for academic paper.
Measures how compiled circuit depth scales with circuit size.
"""

import math
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.providers.fake_provider import GenericBackendV2
from qiskit.transpiler import CouplingMap

# Configuration
QUBIT_SIZES = [i*24 for i in range(1, 15)]
OPTIMIZATION_LEVEL = 0  # Level 0 is deterministic

def create_grid_coupling_map(num_qubits):
    """Create a 2D grid coupling map for the given number of qubits."""
    grid_size = math.ceil(math.sqrt(num_qubits))
    return CouplingMap.from_grid(grid_size, grid_size)


def create_heavy_hex_coupling_map(num_qubits):
    """
    Create a heavy-hex coupling map for the given number of qubits.
    Heavy-hex lattice is IBM's quantum processor topology.
    """
    # Calculate distance parameter for heavy-hex (must be odd)
    # Heavy-hex with distance d has 5*d^2 - 2*d - 1 qubits
    # Find the smallest odd distance that gives us enough qubits
    distance = 1
    while True:
        coupling_map = CouplingMap.from_heavy_hex(distance)
        if coupling_map.size() >= num_qubits:
            return coupling_map
        distance += 2  # Increment by 2 to keep it odd


def create_line_coupling_map(num_qubits):
    """Create a linear/line coupling map for the given number of qubits."""
    return CouplingMap.from_line(num_qubits)




def get_compiled_circuit_depth(num_qubits, topology='grid', optimization_level=1):
    """
    Compile QFT circuit and return the compiled circuit depth.

    Args:
        num_qubits: Number of qubits in QFT circuit
        topology: Coupling topology ('grid', 'heavy_hex', or 'line')
        optimization_level: Qiskit transpilation optimization level

    Returns:
        Compiled circuit depth
    """
    # Create backend with specified topology
    if topology == 'grid':
        coupling_map = create_grid_coupling_map(num_qubits)
    elif topology == 'heavy_hex':
        coupling_map = create_heavy_hex_coupling_map(num_qubits)
    elif topology == 'line':
        coupling_map = create_line_coupling_map(num_qubits)
    else:
        raise ValueError(f"Unknown topology: {topology}")

    backend = GenericBackendV2(num_qubits=coupling_map.size(), coupling_map=coupling_map)

    # Create QFT circuit
    qft_circuit = QFT(num_qubits, do_swaps=True)
    qc = QuantumCircuit(num_qubits)
    qc.compose(qft_circuit, inplace=True)

    # Create pass manager
    pm = generate_preset_pass_manager(
        optimization_level=optimization_level,
        backend=backend
    )

    # Compile and get depth
    compiled_qc = pm.run(qc)
    return compiled_qc.depth()


def main():
    print("Benchmarking QFT Circuit Depth vs Qubit Count")
    print("=" * 60)

    grid_depths = []
    heavy_hex_depths = []
    line_depths = []

    for num_qubits in QUBIT_SIZES:
        print(f"Compiling {num_qubits}-qubit QFT...")

        # Grid topology
        print(f"  Grid topology... ", end="", flush=True)
        depth_grid = get_compiled_circuit_depth(
            num_qubits,
            topology='grid',
            optimization_level=OPTIMIZATION_LEVEL
        )
        grid_depths.append(depth_grid)
        print(f"depth={depth_grid}")

        # Heavy-hex topology
        print(f"  Heavy-hex topology... ", end="", flush=True)
        depth_hex = get_compiled_circuit_depth(
            num_qubits,
            topology='heavy_hex',
            optimization_level=OPTIMIZATION_LEVEL
        )
        heavy_hex_depths.append(depth_hex)
        print(f"depth={depth_hex}")

        # Line topology
        print(f"  Line topology... ", end="", flush=True)
        depth_line = get_compiled_circuit_depth(
            num_qubits,
            topology='line',
            optimization_level=OPTIMIZATION_LEVEL
        )
        line_depths.append(depth_line)
        print(f"depth={depth_line}")

    # Create plot with three lines
    plt.figure(figsize=(10, 6))
    plt.plot(QUBIT_SIZES, grid_depths, 'o-', linewidth=2, markersize=8, label='2D Grid')
    plt.plot(QUBIT_SIZES, heavy_hex_depths, 's-', linewidth=2, markersize=8, label='Heavy-Hex')
    plt.plot(QUBIT_SIZES, line_depths, '^-', linewidth=2, markersize=8, label='Line')
    plt.xlabel('Number of Qubits', fontsize=12)
    plt.ylabel('Circuit Depth', fontsize=12)
    plt.title('QFT Compiled Circuit Depth vs Qubit Count', fontsize=14)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.xticks(QUBIT_SIZES)  # Set x-axis ticks to exact qubit sizes
    plt.tight_layout()

    # Save plot
    output_file = 'qft_depth_benchmark.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\n✓ Plot saved to {output_file}")

    # Print summary statistics
    print("\nSummary:")
    print(f"  Qubit range: {QUBIT_SIZES[0]} to {QUBIT_SIZES[-1]}")
    print(f"\n  Grid topology:")
    print(f"    Depth range: {grid_depths[0]} to {grid_depths[-1]}")
    print(f"    Growth factor: {grid_depths[-1]/grid_depths[0]:.1f}x")
    print(f"\n  Heavy-hex topology:")
    print(f"    Depth range: {heavy_hex_depths[0]} to {heavy_hex_depths[-1]}")
    print(f"    Growth factor: {heavy_hex_depths[-1]/heavy_hex_depths[0]:.1f}x")
    print(f"\n  Line topology:")
    print(f"    Depth range: {line_depths[0]} to {line_depths[-1]}")
    print(f"    Growth factor: {line_depths[-1]/line_depths[0]:.1f}x")

    plt.show()


if __name__ == '__main__':
    main()
