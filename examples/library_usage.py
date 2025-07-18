"""
Quvis Library Usage Examples

This file demonstrates various ways to use Quvis for quantum circuit visualization.
Run with: python examples/library_usage.py
"""

from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT, EfficientSU2
from qiskit.transpiler import CouplingMap
from quvis import QuvisVisualizer


def basic_usage():
    """Basic circuit visualization - generates both logical and compiled versions."""
    print("=== Basic Usage ===")
    
    quvis = QuvisVisualizer()
    
    # Create a simple Bell state circuit
    circuit = QuantumCircuit(2)
    circuit.h(0)
    circuit.cx(0, 1)
    
    quvis.add_circuit(circuit, algorithm_name="Bell State")
    return quvis.visualize()


def multi_circuit_comparison():
    """Compare logical vs compiled circuits."""
    print("\n=== Multi-Circuit Comparison ===")
    
    quvis = QuvisVisualizer()
    
    # Create QFT circuit
    qft = QFT(4)
    
    # Add logical version
    quvis.add_circuit(qft, algorithm_name="QFT (Logical)")
    
    # Compile with hardware constraints
    coupling_map = [[0, 1], [1, 2], [2, 3]]
    compiled_qft = transpile(qft, coupling_map=coupling_map, optimization_level=2)
    
    # Add compiled version
    quvis.add_circuit(
        compiled_qft,
        coupling_map={
            "coupling_map": coupling_map,
            "num_qubits": 4,
            "topology_type": "line"
        },
        algorithm_name="QFT (Compiled)"
    )
    
    return quvis.visualize()


def variational_circuit_example():
    """Visualize variational quantum circuits."""
    print("\n=== Variational Circuit Example ===")
    
    quvis = QuvisVisualizer()
    
    # Create EfficientSU2 ansatz
    ansatz = EfficientSU2(num_qubits=6, reps=2)
    
    # Add logical circuit
    quvis.add_circuit(ansatz, algorithm_name="EfficientSU2 Ansatz (Logical)")
    
    # Compile for grid topology
    grid_coupling = CouplingMap.from_grid(2, 3)
    compiled_ansatz = transpile(ansatz, coupling_map=grid_coupling, optimization_level=1)
    
    quvis.add_circuit(
        compiled_ansatz,
        coupling_map=grid_coupling,
        algorithm_name="EfficientSU2 Ansatz (Grid Compiled)"
    )
    
    return quvis.visualize()


def custom_circuit_collection():
    """Multiple custom circuits in one visualization."""
    print("\n=== Custom Circuit Collection ===")
    
    quvis = QuvisVisualizer()
    
    # Circuit 1: GHZ state
    ghz = QuantumCircuit(4)
    ghz.h(0)
    for i in range(3):
        ghz.cx(i, i+1)
    quvis.add_circuit(ghz, algorithm_name="4-Qubit GHZ State")
    
    # Circuit 2: Quantum teleportation
    teleport = QuantumCircuit(3, 3)
    teleport.h(1)
    teleport.cx(1, 2)
    teleport.cx(0, 1)
    teleport.h(0)
    teleport.measure([0, 1], [0, 1])
    teleport.cx(1, 2)
    teleport.cz(0, 2)
    quvis.add_circuit(teleport, algorithm_name="Quantum Teleportation")
    
    # Circuit 3: Deutsch algorithm
    deutsch = QuantumCircuit(2)
    deutsch.h(0)
    deutsch.x(1)
    deutsch.h(1)
    deutsch.cx(0, 1)  # Oracle (identity function)
    deutsch.h(0)
    quvis.add_circuit(deutsch, algorithm_name="Deutsch Algorithm")
    
    return quvis.visualize()


def main():
    """Run all examples."""
    print("Quvis Library Usage Examples")
    print("============================")
    
    # Uncomment the example you want to run:
    
    # Basic circuit visualization (generates logical + compiled)
    # basic_usage()
    
    # # Multiple circuits comparison
    # multi_circuit_comparison()
    
    # # Variational circuits
    # variational_circuit_example()
    
    # Collection of different circuits
    custom_circuit_collection()


if __name__ == "__main__":
    main() 