import unittest
from qiskit import QuantumCircuit
from qiskit.converters import circuit_to_dag
from qiskit.visualization import dag_drawer

from quvis.compiler.utils import extract_operations_per_slice, extract_routing_operations_per_slice

class TestExtractOperationsPerSlice(unittest.TestCase):
    
    def test_extract_operations_per_slice(self):
        QUBITS = 16
        circuit = QuantumCircuit(QUBITS)
        circuit.h(0)

        for i in range(QUBITS-1):
            circuit.cx(i, i+1)
        
        ops_per_slice = extract_operations_per_slice(circuit)
        self.assertEqual(len(ops_per_slice), 16)

        circuit = QuantumCircuit(QUBITS)
        for i in range(QUBITS):
            circuit.h(i)
        
        ops_per_slice = extract_operations_per_slice(circuit)
        self.assertEqual(len(ops_per_slice), 1)

    def test_extract_routing_operations_per_slice(self):
        QUBITS = 16
        circuit = QuantumCircuit(QUBITS)

        circuit.x(0)
        circuit.cx(0, 1)
        circuit.swap(0, 2)

        routing_ops, swap_count, routing_depth = extract_routing_operations_per_slice(circuit)

        self.assertEqual(swap_count, 1)
        


if __name__ == '__main__':
    unittest.main()