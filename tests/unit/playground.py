import unittest
from quvis.api.playground import PlaygroundAPI

class TestPlaygroundAPI(unittest.TestCase):

    def setUp(self):
        self.api = PlaygroundAPI()

    def test_create_circuit(self):
        qft_circuit = self.api._create_circuit("qft", 4)
        self.assertEqual(qft_circuit.num_qubits, 4)
        self.assertTrue(qft_circuit.name.startswith("QFT"))

        ghz_circuit = self.api._create_circuit("ghz", 3)
        self.assertEqual(ghz_circuit.num_qubits, 3)
        self.assertTrue(ghz_circuit.name.startswith("GHZ"))

        qaoa_circuit = self.api._create_circuit("qaoa", 4, reps=2)
        self.assertEqual(qaoa_circuit.num_qubits, 4)
        self.assertTrue(qaoa_circuit.name.startswith("QAOA"))

        with self.assertRaises(ValueError):
            self.api._create_circuit("invalid", 4)

    def test_create_coupling_map(self):
        line_map = self.api._create_coupling_map("line", 5)
        self.assertEqual(line_map.size(), 5)
        self.assertEqual(len(line_map.get_edges()), 8)  # 4 connections * 2 directions

        ring_map = self.api._create_coupling_map("ring", 4)
        self.assertEqual(ring_map.size(), 4)
        self.assertEqual(len(ring_map.get_edges()), 8)  # 4 connections * 2 directions

        grid_map = self.api._create_coupling_map("grid", 9)
        self.assertGreaterEqual(grid_map.size(), 9)

        with self.assertRaises(ValueError):
            self.api._create_coupling_map("invalid", 4)

if __name__ == '__main__':
    unittest.main()