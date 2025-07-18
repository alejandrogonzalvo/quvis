from math import sqrt, ceil

from qiskit import transpile
from qiskit.circuit.library import QFT
from qiskit.transpiler import CouplingMap
from quvis import QuvisVisualizer


QUBITS = [10, 100 ]
OPTIMIZATION_LEVELS = [0, 1, 2, 3]

visualizer = QuvisVisualizer()
for qubits in QUBITS:
    for optimization_level in OPTIMIZATION_LEVELS:
        circuit = QFT(qubits)
        coupling_map = CouplingMap.from_grid(int(ceil(sqrt(qubits))), int(ceil(sqrt(qubits))))
        circuit = transpile(circuit, coupling_map=coupling_map, optimization_level=optimization_level)
        visualizer.add_circuit(
            circuit, 
            coupling_map=coupling_map,
            algorithm_name=f"QFT (Q={qubits}, O={optimization_level})"
        )

visualizer.visualize()

