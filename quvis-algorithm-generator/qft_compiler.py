from qiskit import transpile
from qiskit.transpiler import CouplingMap
from qiskit.circuit.library import QFT
from qiskit import qasm3
from qiskit.converters import circuit_to_dag
# import numpy as np # No longer needed for direct JSON output
import json
# import time # No longer needed for timestamped filename in this simplified approach
import argparse # Import argparse


def create_nxn_grid_coupling_map(n: int) -> list[list[int]]:
    """
    Generates a coupling map for an n x n grid of qubits.
    Qubits are numbered row by row, from 0 to n*n - 1.
    """
    if n <= 0:
        raise ValueError("n must be a positive integer")
    if n == 1:  # Single qubit, no connections
        return []

    coupling_map = []
    num_qubits_grid = n * n # Renamed to avoid conflict with transpiled_qc.num_qubits
    for i in range(num_qubits_grid):
        row, col = divmod(i, n)

        if col < n - 1:
            right_neighbor = i + 1
            coupling_map.append([i, right_neighbor])
            coupling_map.append([right_neighbor, i])

        if row < n - 1:
            bottom_neighbor = i + n
            coupling_map.append([i, bottom_neighbor])
            coupling_map.append([bottom_neighbor, i])

    unique_couplings = {frozenset(pair) for pair in coupling_map}
    return [list(pair) for pair in unique_couplings]


def main():
    # --- Argument Parsing --- 
    parser = argparse.ArgumentParser(description="Compile a QFT circuit and extract interactions.")
    parser.add_argument(
        "-q", "--qft_qubits", 
        type=int, 
        default=3, 
        help="Number of qubits for the QFT circuit (default: 3)"
    )
    parser.add_argument(
        "-g", "--grid_size",
        type=int,
        default=3,
        help="Dimension of the n x n grid for qubit coupling (default: 3, for a 3x3 grid)"
    )
    args = parser.parse_args()

    # --- Configuration from args ---
    n_grid_size = args.grid_size
    m_qft_qubits = args.qft_qubits
    # ---------------------

    print(f"Config: QFT qubits = {m_qft_qubits}, Grid size = {n_grid_size}x{n_grid_size}")

    if m_qft_qubits > n_grid_size * n_grid_size:
        print(
            f"Warning: QFT circuit has {m_qft_qubits} qubits, but the grid only has {n_grid_size * n_grid_size} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if m > n*n."
        )
        # Decide if we should proceed or exit. For now, let's proceed.
        # return

    print(f"Defining a {n_grid_size}x{n_grid_size} quantum processor grid.")
    coupling_map_list = create_nxn_grid_coupling_map(n_grid_size)

    if not coupling_map_list and n_grid_size > 1:  # Should not happen if n > 1
        print(
            f"Generated an empty coupling map for n={n_grid_size}. This might be an issue."
        )
    elif n_grid_size > 1:
        print(f"Generated coupling map: {coupling_map_list}")

    # Create QFT circuit
    print(
        f"\nCreating a QFT circuit for {m_qft_qubits} qubits using qiskit.circuit.library.QFT."
    )
    # Note: qiskit.circuit.library.QFT is pending deprecation.
    # Consider using qiskit.circuit.library.QFTGate or qiskit.synthesis.qft.synth_qft_full in the future.
    qft_qc = QFT(
        num_qubits=m_qft_qubits,
        do_swaps=True,
        approximation_degree=0,
        insert_barriers=False,
    )
    # Ensure the circuit has a name for drawing, if QFT doesn't set one by default.
    # qft_qc.name = "QFT" # The QFT class likely sets a name, but this is a fallback.
    # The QFT object from the library is already a QuantumCircuit instance.

    print("Original QFT circuit (using qiskit.circuit.library.QFT):")
    print(qft_qc.draw(output="text"))

    # Transpile the QFT circuit for the grid
    # We need to ensure the coupling map is correctly formatted for the transpile function
    # The transpile function can take a CouplingMap object or a list of lists.

    # If m_qft_qubits is less than n_grid_size*n_grid_size, the transpiler
    # will try to map the m logical qubits to a subset of the n*n physical qubits.
    # The `optimization_level` can be adjusted for different trade-offs.
    print(
        f"\nTranspiling QFT circuit for the {n_grid_size}x{n_grid_size} grid topology..."
    )

    # For transpilation, all qubits in the circuit must be addressable by the coupling map.
    # If m_qft_qubits < n_grid_size*n_grid_size, the qft_qc has m qubits (0 to m-1).
    # The coupling_map refers to qubits 0 to n*n-1.
    # The transpiler handles this mapping.

    # Create a CouplingMap object if you have a list of lists
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list)

    # Transpile the circuit
    # For a custom device with only a coupling map, we don't specify a backend.
    # The number of qubits for the transpiled circuit will be at least m_qft_qubits.
    # If the coupling map involves more qubits than m_qft_qubits, the transpiler
    # will choose a layout. The final circuit will act on a subset of the device qubits.

    transpiled_qc = transpile(
        qft_qc,
        coupling_map=custom_coupling_map,
        basis_gates=["u1", "u2", "u3", "cx"],  # Example basis gates
        optimization_level=3,  # Higher level for potentially better, but slower, optimization
    )

    print("\nTranspiled QFT circuit:")
    print(transpiled_qc.draw(output="text"))

    print("\nQASM for the transpiled circuit:")
    print(qasm3.dumps(transpiled_qc))

    # --- Extract qubit interactions per time slice ---
    print("\nExtracting qubit interactions for visualization...")
    dag = circuit_to_dag(transpiled_qc)
    slices_data_for_json = [] # Renamed to avoid confusion if old 'slices_data' was used differently
    
    # Create a mapping from Qubit objects to their integer indices in the transpiled circuit
    qubit_indices = {qubit: i for i, qubit in enumerate(transpiled_qc.qubits)}

    for i, layer in enumerate(dag.layers()):
        slice_ops = []
        # layer['graph'] is a DAGCircuit representing the current layer
        for node in layer['graph'].op_nodes(): # Iterate over actual operation nodes
            op = node.op
            op_name = op.name
            # node.qargs contains the Qubit objects this operation acts on
            # We need their integer indices
            op_qubit_indices = [qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops: # Only add the slice if it contains operations
            slices_data_for_json.append(slice_ops)
            # print(f"Slice {len(slices_data_for_json) - 1}: {slice_ops}") # Optional: for debugging

    num_qubits_for_viz = transpiled_qc.num_qubits # This is the actual number of qubits in the circuit used
    
    # Create the data structure for JSON
    output_data = {
        "num_qubits": num_qubits_for_viz,
        "operations_per_slice": slices_data_for_json,
        "coupling_map": coupling_map_list
    }

    output_filename = "qft_viz_data.json" # New filename and extension

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4) # Use indent for readability

    print(f"Interaction data saved to {output_filename}")
    print(f"  Number of qubits: {num_qubits_for_viz}")
    print(f"  Number of time slices: {len(slices_data_for_json)}")
    # --- End of interaction extraction ---


if __name__ == "__main__":
    main()
