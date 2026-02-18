
import numpy as np
import math
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT
from qiskit.transpiler import CouplingMap
import sys
import os

from quvis.api.visualizer import Visualizer

def create_qft_circuit(n_qubits):
    """Creates a Quantum Fourier Transform circuit."""
    # Use Qiskit's library QFT for convenience and correctness
    circuit = QFT(num_qubits=n_qubits, do_swaps=True).decompose()
    return circuit

def create_grid_topology(rows, cols):
    """Creates a grid coupling map."""
    return CouplingMap.from_grid(rows, cols)

def create_modular_ring_topology(num_cores, qubits_per_core):
    """
    Creates a coupling map for a modular ring architecture.
    
    Intra-core: Ring topology
    Inter-core: Ring topology (connecting last qubit of core i to first qubit of core i+1)
    """
    edges = []
    inter_core_links = []
    
    # Intra-core connections (Ring)
    for core in range(num_cores):
        core_offset = core * qubits_per_core
        for i in range(qubits_per_core):
            u = core_offset + i
            v = core_offset + ((i + 1) % qubits_per_core)
            edges.append([u, v])
            edges.append([v, u]) # Bidirectional

    # Inter-core connections (Ring of Cores)
    for core in range(num_cores):
        core_offset = core * qubits_per_core
        next_core = (core + 1) % num_cores
        next_core_offset = next_core * qubits_per_core
        
        # Connect last qubit of current core to first qubit of next core
        u = core_offset + qubits_per_core - 1
        v = next_core_offset
        
        edges.append([u, v])
        edges.append([v, u]) # Bidirectional
        inter_core_links.append([u, v])

    return edges, inter_core_links

def main():
    n_qubits = 25
    viz = Visualizer(verbose=True)
    
    print(f"Creating 25-qubit QFT Modular Demo...")

    # --- Scenario 1: Logical Circuit ---
    print("\nScenario 1: Logical Circuit")
    qc_logical = create_qft_circuit(n_qubits)
    viz.add_circuit(
        qc_logical,
        algorithm_name="QFT 25 (Logical)",
        topology_type="logical"
    )

    # --- Scenario 2: 5x5 Grid ---
    print("\nScenario 2: 5x5 Grid")
    qc_grid_base = create_qft_circuit(n_qubits)
    grid_map = create_grid_topology(5, 5)
    
    print("Transpiling to 5x5 Grid...")
    qc_grid_transpiled = transpile(
        qc_grid_base,
        coupling_map=grid_map,
        optimization_level=1  # Use 1 for speed, 3 for better routing
    )
    
    viz.add_circuit(
        qc_grid_transpiled,
        coupling_map=grid_map,
        algorithm_name="QFT 25 (5x5 Grid)",
        topology_type="grid"
    )

    # --- Scenario 3: Modular Ring (5 cores x 5 qubits) ---
    print("\nScenario 3: Modular Ring (5 cores x 5 qubits)")
    num_cores = 5
    qubits_per_core = 5
    
    qc_modular_base = create_qft_circuit(n_qubits)
    modular_edges, inter_core_links = create_modular_ring_topology(num_cores, qubits_per_core)
    modular_coupling_map = CouplingMap(modular_edges)
    
    print("Transpiling to Modular Ring...")
    qc_modular_transpiled = transpile(
        qc_modular_base,
        coupling_map=modular_coupling_map,
        optimization_level=1
    )
    
    # Construct the definition dictionary for Visualizer
    modular_def = {
        "coupling_map": modular_edges,
        "num_qubits": n_qubits,
        "num_cores": num_cores,
        "qubits_per_core": qubits_per_core,
        "global_topology": "Ring",
        "inter_core_links": inter_core_links,
        "topology_type": "modular_ring"
    }

    viz.add_circuit(
        qc_modular_transpiled,
        coupling_map=modular_def,
        algorithm_name="QFT 25 (Modular Ring)"
    )

    # --- Visualize ---
    print("\nGenerating visualization...")
    # This will save temp_circuit_data.json to quvis/web/public/ and launch the server
    # We rely on the fix in Visualizer.py to handle CWD correctly.
    viz.visualize()

if __name__ == "__main__":
    main()
