
import json
import os
import sys
from qiskit import QuantumCircuit


# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../quvis/core/src')))

from quvis.api.visualizer import Visualizer

def create_modular_demo():
    print("Creating modular circuit demo (GHZ 20 qubits on 4 cores x 5 qubits)...")
    
    num_cores = 4
    qubits_per_core = 5
    num_qubits = num_cores * qubits_per_core
    
    # 1. Create GHZ Circuit
    qc = QuantumCircuit(num_qubits)
    qc.h(0)
    for i in range(1, num_qubits):
        qc.cx(0, i)
    qc.measure_all()
    
    # 2. Define Coupling Map
    coupling_map = []
    
    # Intra-core: All-to-All
    print("Generating all-to-all intra-core connections...")
    for c in range(num_cores):
        offset = c * qubits_per_core
        for i in range(qubits_per_core):
            for j in range(i + 1, qubits_per_core):
                coupling_map.append([offset + i, offset + j])
                coupling_map.append([offset + j, offset + i]) # Undirected usually represented by both or sorted
                
    # Inter-core: 2D Grid (2x2)
    # Core 0 -- Core 1
    #   |        |
    # Core 2 -- Core 3
    print("Generating 2D grid inter-core connections...")
    inter_core_links = []
    
    # Layout of cores:
    # 0 1
    # 2 3
    
    # Connections (using arbitrary qubits for links, e.g., last of one to first of other)
    # 0-1
    link_0_1 = [4, 5] # Core 0 last -> Core 1 first
    inter_core_links.append(link_0_1)
    coupling_map.append(link_0_1)
    
    # 0-2
    link_0_2 = [4, 10] # Core 0 last -> Core 2 first
    inter_core_links.append(link_0_2)
    coupling_map.append(link_0_2)
    
    # 1-3
    link_1_3 = [9, 15] # Core 1 last -> Core 3 first
    inter_core_links.append(link_1_3)
    coupling_map.append(link_1_3)
    
    # 2-3
    link_2_3 = [14, 15] # Core 2 last -> Core 3 first
    inter_core_links.append(link_2_3)
    coupling_map.append(link_2_3)

    coupling_map_dict = {
        "num_qubits": num_qubits,
        "num_cores": num_cores,
        "qubits_per_core": qubits_per_core,
        "global_topology": "Grid",
        "inter_core_links": inter_core_links,
        "coupling_map": coupling_map
    }
    
    # Initialize Visualizer
    viz = Visualizer()
    # Disable auto-open to prevent browser spam during dev
    viz.auto_open_browser = False
    
    # Process circuit
    print("Adding circuit...")
    viz.add_circuit(
        circuit=qc,
        coupling_map=coupling_map_dict,
        algorithm_name="GHZ 20 Modular",
        topology_type="modular"
    )
    
    # Export data
    output_file = "modular_viz_data.json"
    print(f"Exporting visualization data to {output_file}...")
    data = viz.visualize()
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Done. Data saved to {output_file}")

if __name__ == "__main__":
    create_modular_demo()
