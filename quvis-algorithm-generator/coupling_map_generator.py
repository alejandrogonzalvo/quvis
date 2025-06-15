import json
import argparse
import os
from qiskit.transpiler import CouplingMap

def create_ring_coupling_map(num_device_qubits: int) -> list[list[int]]:
    """
    Generates a coupling map for a ring topology of num_device_qubits.
    """
    if num_device_qubits <= 0:
        raise ValueError("num_device_qubits must be a positive integer")
    if num_device_qubits == 1:
        return []
    
    coupling_map = []
    for i in range(num_device_qubits):
        coupling_map.append([i, (i + 1) % num_device_qubits])
    # For Qiskit's transpile function, providing these directed edges for a ring
    # is sufficient. If bidirectional edges are needed, they can be added.
    # For example, to make them explicitly bidirectional for other tools:
    # bidirectional_map = []
    # for i in range(num_device_qubits):
    #     qubit1 = i
    #     qubit2 = (i + 1) % num_device_qubits
    #     bidirectional_map.append([qubit1, qubit2])
    #     bidirectional_map.append([qubit2, qubit1])
    # # Remove duplicates if any (e.g. for a 2-qubit ring [[0,1],[1,0],[1,0],[0,1]])
    # unique_couplings_set = {frozenset(pair) for pair in bidirectional_map}
    # return [list(pair) for pair in unique_couplings_set]
    return coupling_map

def create_nxn_grid_coupling_map(n: int) -> tuple[list[list[int]], int]:
    """
    Generates a coupling map for an n x n grid of qubits.
    Returns the coupling map and the total number of qubits.
    Qubits are numbered row by row, from 0 to n*n - 1.
    """
    if n <= 0:
        raise ValueError("n must be a positive integer")
    
    num_qubits_grid = n * n
    if n == 1:  # Single qubit, no connections
        return [], num_qubits_grid

    coupling_map = []
    for i in range(num_qubits_grid):
        row, col = divmod(i, n)

        # Horizontal connection: (i) -- (i+1)
        if col < n - 1:
            right_neighbor = i + 1
            coupling_map.append([i, right_neighbor])
            # coupling_map.append([right_neighbor, i]) # Qiskit handles this

        # Vertical connection: (i) -- (i+n)
        if row < n - 1:
            bottom_neighbor = i + n
            coupling_map.append([i, bottom_neighbor])
            # coupling_map.append([bottom_neighbor, i]) # Qiskit handles this
            
    # For Qiskit, directed edges might be sufficient. 
    # If fully specified bidirectional edges are needed for other tools:
    # full_coupling_map = []
    # for i in range(num_qubits_grid):
    #     row, col = divmod(i, n)
    #     if col < n - 1:
    #         right_neighbor = i + 1
    #         full_coupling_map.append([i, right_neighbor])
    #         full_coupling_map.append([right_neighbor, i])
    #     if row < n - 1:
    #         bottom_neighbor = i + n
    #         full_coupling_map.append([i, bottom_neighbor])
    #         full_coupling_map.append([bottom_neighbor, i])
    # unique_couplings = {frozenset(pair) for pair in full_coupling_map}
    # return [list(pair) for pair in unique_couplings], num_qubits_grid
    return coupling_map, num_qubits_grid


def create_heavy_hex_coupling_map(distance: int) -> tuple[list[list[int]], int]:
    """
    Generates a coupling map for a heavy-hexagonal lattice using Qiskit's built-in function.
    See: https://docs.quantum.ibm.com/api/qiskit/qiskit.transpiler.CouplingMap#from_heavy_hex
    """
    if distance <= 0 or distance % 2 == 0:
        raise ValueError("distance must be a positive odd integer")
    
    # Generate the coupling map using Qiskit
    cmap_qiskit = CouplingMap.from_heavy_hex(distance=distance, bidirectional=True)
    
    # Extract the coupling map as a list of lists.
    # get_edges() returns a list of tuples, so we convert them to lists for JSON serialization.
    coupling_map = [list(edge) for edge in cmap_qiskit.get_edges()]

    # Get the total number of qubits
    num_qubits = cmap_qiskit.size()
    
    return coupling_map, num_qubits


def main():
    parser = argparse.ArgumentParser(description="Generate and save a coupling map for a quantum device topology.")
    parser.add_argument(
        "--topology",
        type=str,
        required=True,
        choices=["ring", "grid", "heavy-hex"],
        help="Type of qubit topology."
    )
    parser.add_argument(
        "--qubits",
        type=int,
        help="Number of qubits (for 'ring' topology)."
    )
    parser.add_argument(
        "--size",
        type=int,
        help="Dimension of the grid (e.g., N for an N x N 'grid' topology)."
    )
    parser.add_argument(
        "--distance",
        type=int,
        help="The code distance for 'heavy-hex' topology (must be an odd positive integer)."
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="coupling-maps",
        help="Directory to save the coupling map JSON file (default: coupling-maps/)."
    )
    parser.add_argument(
        "--filename",
        type=str,
        help="Optional filename for the output JSON file. If not provided, a descriptive name will be generated."
    )

    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    coupling_map_data = {}
    output_filename = args.filename
    
    if args.topology == "ring":
        if args.qubits is None or args.qubits <= 0:
            parser.error("--qubits (positive integer) is required for 'ring' topology.")
        
        num_q = args.qubits
        cmap = create_ring_coupling_map(num_q)
        coupling_map_data = {
            "topology_type": "ring",
            "num_qubits": num_q,
            "coupling_map": cmap
        }
        if not output_filename:
            output_filename = f"ring_{num_q}q.json"
        print(f"Generated ring coupling map for {num_q} qubits.")

    elif args.topology == "grid":
        if args.size is None or args.size <= 0:
            parser.error("--size (positive integer for N in N x N) is required for 'grid' topology.")
        
        grid_dim = args.size
        cmap, total_qubits = create_nxn_grid_coupling_map(grid_dim)
        coupling_map_data = {
            "topology_type": "grid",
            "grid_dim_rows": grid_dim,
            "grid_dim_cols": grid_dim, # Assuming square grid for now
            "num_qubits": total_qubits,
            "coupling_map": cmap
        }
        if not output_filename:
            output_filename = f"grid_{grid_dim}x{grid_dim}.json"
        print(f"Generated grid coupling map for a {grid_dim}x{grid_dim} grid ({total_qubits} qubits).")

    elif args.topology == "heavy-hex":
        if args.distance is None or args.distance <= 0 or args.distance % 2 == 0:
            parser.error("--distance (a positive odd integer) is required for 'heavy-hex' topology.")
        
        distance = args.distance
        cmap, total_qubits = create_heavy_hex_coupling_map(distance)
        coupling_map_data = {
            "topology_type": "heavy-hex",
            "heavy_hex_distance": distance,
            "num_qubits": total_qubits,
            "coupling_map": cmap
        }
        if not output_filename:
            output_filename = f"heavy_hex_d{distance}.json"
        print(f"Generated heavy-hex coupling map for distance {distance} ({total_qubits} qubits).")

    else:
        # Should not happen due to choices in argparse
        print(f"Error: Unknown topology '{args.topology}'")
        return

    full_output_path = os.path.join(args.output_dir, output_filename)

    with open(full_output_path, 'w') as f:
        json.dump(coupling_map_data, f, indent=4)
    
    print(f"Coupling map saved to {full_output_path}")
    print(f"  Topology: {coupling_map_data['topology_type']}")
    print(f"  Total qubits in map: {coupling_map_data['num_qubits']}")
    print(f"  Number of connections: {len(coupling_map_data['coupling_map'])}")


if __name__ == "__main__":
    main() 