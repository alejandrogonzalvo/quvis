from math import sqrt, ceil

from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
from quvis import Visualizer


def GHZ(n_qubits):
    circuit = QuantumCircuit(n_qubits)

    circuit.h(0)
    for i in range(1, n_qubits):
        circuit.cx(0, i)

    return circuit


QUBITS = [1500]
OPTIMIZATION_LEVELS = [2]

visualizer = Visualizer()
for qubits in QUBITS:
    circuit = GHZ(qubits)
    visualizer.add_circuit(circuit, algorithm_name=f"GHZ (Q={qubits})")

    for optimization_level in OPTIMIZATION_LEVELS:
        coupling_map = CouplingMap.from_heavy_hex(25)

        print(
            f"Transpiling GHZ circuit with {qubits} qubits at optimization level {optimization_level}..."
        )
        circuit = transpile(
            circuit, coupling_map=coupling_map, optimization_level=optimization_level
        )

        print("Adding transpiled circuit to visualizer...")
        visualizer.add_circuit(
            circuit,
            coupling_map=coupling_map,
            algorithm_name=f"GHZ (Q={qubits}, O={optimization_level})",
        )

visualizer.visualize()
