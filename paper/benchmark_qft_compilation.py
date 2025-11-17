#!/usr/bin/env python3
"""
Benchmark QFT compilation time vs qubit count for academic paper.
Measures how compilation time scales with circuit size.
"""

import time
import math
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.providers.fake_provider import GenericBackendV2
from qiskit.transpiler import CouplingMap

# Configuration
QUBIT_SIZES = [24, 48, 72, 96, 120, 144, 168, 192, 216, 240]
OPTIMIZATION_LEVEL = 1
NUM_TRIALS = 5  # Average over multiple trials for stability

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




def benchmark_qft_compilation(num_qubits, topology='grid', optimization_level=1, num_trials=5):
    """
    Compile QFT circuit and measure average compilation time.

    Args:
        num_qubits: Number of qubits in QFT circuit
        topology: Coupling topology ('grid' or 'heavy_hex')
        optimization_level: Qiskit transpilation optimization level
        num_trials: Number of compilation runs to average

    Returns:
        Average compilation time in seconds
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

    # Benchmark compilation time
    times = []
    for _ in range(num_trials):
        start_time = time.perf_counter()
        pm.run(qc)
        end_time = time.perf_counter()
        times.append(end_time - start_time)

    return sum(times) / len(times)


def main():
    print("Benchmarking QFT Compilation Time vs Qubit Count")
    print("=" * 60)

    grid_times = []
    heavy_hex_times = []
    line_times = []

    for num_qubits in QUBIT_SIZES:
        print(f"Compiling {num_qubits}-qubit QFT...")

        # Grid topology
        print(f"  Grid topology... ", end="", flush=True)
        avg_time_grid = benchmark_qft_compilation(
            num_qubits,
            topology='grid',
            optimization_level=OPTIMIZATION_LEVEL,
            num_trials=NUM_TRIALS
        )
        grid_times.append(avg_time_grid)
        print(f"{avg_time_grid:.4f}s")

        # Heavy-hex topology
        print(f"  Heavy-hex topology... ", end="", flush=True)
        avg_time_hex = benchmark_qft_compilation(
            num_qubits,
            topology='heavy_hex',
            optimization_level=OPTIMIZATION_LEVEL,
            num_trials=NUM_TRIALS
        )
        heavy_hex_times.append(avg_time_hex)
        print(f"{avg_time_hex:.4f}s")

        # Line topology
        print(f"  Line topology... ", end="", flush=True)
        avg_time_line = benchmark_qft_compilation(
            num_qubits,
            topology='line',
            optimization_level=OPTIMIZATION_LEVEL,
            num_trials=NUM_TRIALS
        )
        line_times.append(avg_time_line)
        print(f"{avg_time_line:.4f}s")

    # Create plot with three lines
    plt.figure(figsize=(10, 6))
    plt.plot(QUBIT_SIZES, grid_times, 'o-', linewidth=2, markersize=8, label='2D Grid')
    plt.plot(QUBIT_SIZES, heavy_hex_times, 's-', linewidth=2, markersize=8, label='Heavy-Hex')
    plt.plot(QUBIT_SIZES, line_times, '^-', linewidth=2, markersize=8, label='Line')
    plt.xlabel('Number of Qubits', fontsize=12)
    plt.ylabel('Compilation Time (seconds)', fontsize=12)
    plt.title('QFT Circuit Compilation Time vs Qubit Count', fontsize=14)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.xticks(QUBIT_SIZES)  # Set x-axis ticks to exact qubit sizes
    plt.tight_layout()

    # Save plot
    output_file = 'qft_compilation_benchmark.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\n✓ Plot saved to {output_file}")

    # Print summary statistics
    print("\nSummary:")
    print(f"  Qubit range: {QUBIT_SIZES[0]} to {QUBIT_SIZES[-1]}")
    print(f"\n  Grid topology:")
    print(f"    Time range: {grid_times[0]:.4f}s to {grid_times[-1]:.4f}s")
    print(f"    Growth factor: {grid_times[-1]/grid_times[0]:.1f}x")
    print(f"\n  Heavy-hex topology:")
    print(f"    Time range: {heavy_hex_times[0]:.4f}s to {heavy_hex_times[-1]:.4f}s")
    print(f"    Growth factor: {heavy_hex_times[-1]/heavy_hex_times[0]:.1f}x")
    print(f"\n  Line topology:")
    print(f"    Time range: {line_times[0]:.4f}s to {line_times[-1]:.4f}s")
    print(f"    Growth factor: {line_times[-1]/line_times[0]:.1f}x")

    plt.show()


if __name__ == '__main__':
    main()
