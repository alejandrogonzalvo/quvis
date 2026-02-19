from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT
from qiskit.transpiler import CouplingMap
import sys
import os
from math import ceil, sqrt

from quvis.api.visualizer import Visualizer

def create_qft_circuit(n_qubits):
    """Creates a Quantum Fourier Transform circuit."""
    # Use Qiskit's library QFT for convenience and correctness
    circuit = QFT(num_qubits=n_qubits, do_swaps=True).decompose()
    return circuit

def create_grid_topology(rows, cols):
    """Creates a grid coupling map."""
    return CouplingMap.from_grid(rows, cols)

def create_modular_grid_topology(num_cores, qubits_per_core):
    """
    Creates a coupling map for a modular architecture.
    
    Intra-core: Grid topology
    Inter-core: Ring topology (connecting last qubit of core i to first qubit of core i+1)
    """
    edges = []
    inter_core_links = []
    
    # Grid dimensions within each core
    core_rows = int(sqrt(qubits_per_core))
    core_cols = ceil(qubits_per_core / core_rows)
    
    # Intra-core connections (Grid)
    for core in range(num_cores):
        core_offset = core * qubits_per_core
        for r in range(core_rows):
            for c in range(core_cols):
                u_local = r * core_cols + c
                if u_local >= qubits_per_core:
                    continue
                u = core_offset + u_local
                
                # Connect to right neighbor
                if c + 1 < core_cols:
                    v_local = r * core_cols + (c + 1)
                    if v_local < qubits_per_core:
                        v = core_offset + v_local
                        edges.append([u, v])
                        edges.append([v, u])
                
                # Connect to bottom neighbor
                if r + 1 < core_rows:
                    v_local = (r + 1) * core_cols + c
                    if v_local < qubits_per_core:
                        v = core_offset + v_local
                        edges.append([u, v])
                        edges.append([v, u])

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
    n_qubits = 500
    n_cores = 5 
    qubits_per_core = n_qubits // n_cores 
    
    # Configure visualization settings based on screenshot
    from quvis.config import VisualizerSettings
    settings = VisualizerSettings(
        # Appearance
        render_bloch_spheres=True,
        render_connection_lines=True,
        qubit_size=1.0,
        connection_thickness=0.1,
        inactive_alpha=1.0,
        
        # Layout
        core_distance=18.5,
        repel_force=0.22,
        ideal_distance=1.0,
        iterations=10000,
        cooling_factor=0.995,
        attract_force=0.217,
        
        # Heatmap
        heatmap_max_slices=40,
        heatmap_base_size=3110.0,
        heatmap_fade_threshold=0.0,
        heatmap_green_threshold=0.3,
        heatmap_yellow_threshold=0.7,
        heatmap_intensity_power=0.3,
        heatmap_min_intensity=0.01,
        heatmap_border_width=0.0
    )
    
    viz = Visualizer(verbose=True)
    
    print(f"Creating {n_qubits}-qubit QFT Modular Demo...")

    # --- Scenario 1: Logical Circuit ---
    print("\nScenario 1: Logical Circuit")
    qc_logical = create_qft_circuit(n_qubits)
    viz.add_circuit(
        qc_logical,
        algorithm_name=f"QFT {n_qubits} (Logical)",
        topology_type="logical"
    )

    # --- Scenario 2: 5x5 Grid ---
    rows = ceil(sqrt(n_qubits))
    cols = ceil(sqrt(n_qubits))
    print(f"\nScenario 2: {rows}x{cols} Grid")
    qc_grid_base = create_qft_circuit(n_qubits)
    grid_map = create_grid_topology(rows, cols)
    
    print(f"Transpiling to {rows}x{cols} Grid...")
    qc_grid_transpiled = transpile(
        qc_grid_base,
        coupling_map=grid_map,
        optimization_level=1  # Use 1 for speed, 3 for better routing
    )
    
    viz.add_circuit(
        qc_grid_transpiled,
        coupling_map=grid_map,
        algorithm_name=f"QFT {n_qubits} ({rows}x{cols} Grid)",
        topology_type="grid"
    )

    # --- Scenario 3: Modular Architecture ({n_cores} cores x {qubits_per_core} qubits) ---
    print(f"\nScenario 3: Modular Architecture ({n_cores} cores x {qubits_per_core} qubits)")
    
    qc_modular_base = create_qft_circuit(n_qubits)
    modular_edges, inter_core_links = create_modular_grid_topology(n_cores, qubits_per_core)
    modular_coupling_map = CouplingMap(modular_edges)
    
    print("Transpiling to Modular Grid...")
    qc_modular_transpiled = transpile(
        qc_modular_base,
        coupling_map=modular_coupling_map,
        optimization_level=1
    )
    
    # Construct the definition dictionary for Visualizer
    modular_def = {
        "coupling_map": modular_edges,
        "num_qubits": n_qubits,
        "num_cores": n_cores,
        "qubits_per_core": qubits_per_core,
        "global_topology": "Ring",
        "inter_core_links": inter_core_links,
        "topology_type": "modular_grid"
    }
    viz.add_circuit(
        qc_modular_transpiled,
        coupling_map=modular_def,
        algorithm_name=f"QFT {n_qubits} ({n_cores} cores x {qubits_per_core} qubits)",
        settings=settings
    )

    # --- Visualize ---
    print("\nGenerating visualization...")
    viz.visualize()

if __name__ == "__main__":
    main()
