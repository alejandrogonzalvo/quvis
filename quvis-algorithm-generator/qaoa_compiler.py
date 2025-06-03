from qiskit import transpile, QuantumCircuit
from qiskit.transpiler import CouplingMap
from qiskit import qasm3
from qiskit.converters import circuit_to_dag
import json
import argparse
import numpy as np # For pi

def create_ring_coupling_map(num_device_qubits: int) -> list[list[int]]:
    """
    Generates a coupling map for a ring topology of num_device_qubits.
    The coupling map is a list of lists, e.g., [[0,1], [1,2], ..., [N-1,0]].
    """
    if num_device_qubits <= 0:
        raise ValueError("num_device_qubits must be a positive integer")
    if num_device_qubits == 1:
        return []  # A single qubit has no connections
    
    coupling_map = []
    for i in range(num_device_qubits):
        # Edge from i to (i+1) mod N
        coupling_map.append([i, (i + 1) % num_device_qubits])
    # For Qiskit's transpile function, providing these directed edges for a ring
    # is sufficient for it to understand the connectivity.
    # If both directions were needed explicitly for some reason:
    # temp_map = []
    # for i in range(num_device_qubits):
    #     qubit1 = i
    #     qubit2 = (i + 1) % num_device_qubits
    #     temp_map.append([qubit1, qubit2])
    #     temp_map.append([qubit2, qubit1])
    # unique_couplings_set = {frozenset(pair) for pair in temp_map}
    # return [list(pair) for pair in unique_couplings_set]
    return coupling_map


def main():
    # --- Argument Parsing --- 
    parser = argparse.ArgumentParser(description="Compile a QAOA circuit for a ring topology and extract interactions.")
    parser.add_argument(
        "-q", "--qaoa_qubits", 
        type=int, 
        default=4, 
        help="Number of qubits for the QAOA circuit (default: 4)"
    )
    parser.add_argument(
        "-d", "--num_ring_qubits", # Changed from -g, --grid_size
        type=int,
        default=5, # Default ring size
        help="Number of qubits in the ring topology of the device (default: 5)"
    )
    parser.add_argument(
        "-p", "--qaoa_reps",
        type=int,
        default=1,
        help="Number of QAOA repetitions/layers (default: 1)"
    )
    args = parser.parse_args()

    # --- Configuration from args ---
    num_device_qubits = args.num_ring_qubits # Changed from n_grid_size
    m_qaoa_qubits = args.qaoa_qubits
    qaoa_p = args.qaoa_reps
    # ---------------------

    print(f"Config: QAOA qubits = {m_qaoa_qubits}, Ring device qubits = {num_device_qubits}, QAOA reps (p) = {qaoa_p}")

    if m_qaoa_qubits <= 0:
        print("Error: Number of QAOA qubits must be positive.")
        return
    if qaoa_p <= 0:
        print("Error: Number of QAOA repetitions (p) must be positive.")
        return
    if num_device_qubits <= 0: # Added check for num_ring_qubits
        print("Error: Number of ring device qubits must be positive.")
        return

    if m_qaoa_qubits > num_device_qubits:
        print(
            f"Error: QAOA circuit requires {m_qaoa_qubits} qubits, but the ring device only has {num_device_qubits} qubits."
        )
        print("Number of device qubits in the ring must be greater than or equal to QAOA qubits.")
        return

    print(f"Defining a quantum processor with a ring topology of {num_device_qubits} qubits.")
    coupling_map_list = create_ring_coupling_map(num_device_qubits)

    if not coupling_map_list and num_device_qubits > 1: 
        print(
            f"Warning: Generated an empty coupling map for num_ring_qubits={num_device_qubits}. This might be an issue if num_ring_qubits > 1."
        )
    elif coupling_map_list: # Print if not empty
        print(f"Generated ring coupling map: {coupling_map_list}")

    # Create QAOA circuit
    print(
        f"\nCreating a QAOA circuit for {m_qaoa_qubits} qubits with p={qaoa_p}."
    )
    qaoa_qc = QuantumCircuit(m_qaoa_qubits, name=f"QAOA_p{qaoa_p}")

    # Placeholder parameters for QAOA angles
    gamma = np.pi / 4  # Example fixed value
    beta = np.pi / 4   # Example fixed value

    # 1. Initial state preparation (Hadamard on all qubits)
    for qubit in range(m_qaoa_qubits):
        qaoa_qc.h(qubit)
    
    # 2. QAOA layers
    for _ in range(qaoa_p):
        # Problem Hamiltonian (Cost Layer) - for Max-Cut on a line graph within the m_qaoa_qubits
        # H_C = sum_{j} (1 - Z_j Z_{j+1}) / 2
        # e^(-i gamma H_C) can be decomposed using RZZ gates, which are CNOT-RZ-CNOT
        if m_qaoa_qubits > 1:
            for i in range(m_qaoa_qubits - 1): # Iterate up to m_qaoa_qubits-2 to connect i and i+1
                # RZZ(2*gamma) on qubits i, i+1
                qaoa_qc.cx(i, i + 1)
                qaoa_qc.rz(2 * gamma, i + 1)
                qaoa_qc.cx(i, i + 1)
        elif m_qaoa_qubits == 1: # No edges for a single qubit graph
            pass 

        # Mixer Hamiltonian (Mixer Layer)
        # H_M = sum_{j} X_j
        # e^(-i beta H_M) = product_j RX(2*beta)_j
        for i in range(m_qaoa_qubits):
            qaoa_qc.rx(2 * beta, i)

    print("Original QAOA circuit:")
    print(qaoa_qc.draw(output="text"))

    # Transpile the QAOA circuit for the ring
    # Create CouplingMap object if the list is not empty, otherwise pass None
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None
    
    # If num_device_qubits is 1, custom_coupling_map will be None.
    # Transpile requires a coupling map if basis_gates are specified and circuit has >1 qubits.
    # If m_qaoa_qubits is 1, coupling_map can be None or empty.
    # If m_qaoa_qubits > 1 and num_device_qubits is 1, we've already errored out.

    print(
        f"\nTranspiling QAOA circuit for the ring topology with {num_device_qubits} physical qubits..."
    )
    
    transpile_options = {
        "basis_gates": ["u1", "u2", "u3", "cx"],
        "optimization_level": 3
    }
    if custom_coupling_map:
        transpile_options["coupling_map"] = custom_coupling_map
    elif m_qaoa_qubits > 1 : # If no coupling map but multiple qubits, transpilation for basis gates is still fine
        pass


    transpiled_qc = transpile(
        qaoa_qc,
        **transpile_options
    )

    print("\nTranspiled QAOA circuit:")
    print(transpiled_qc.draw(output="text"))

    print("\nQASM for the transpiled circuit:")
    print(qasm3.dumps(transpiled_qc))

    # --- Extract qubit interactions per time slice ---
    print("\nExtracting qubit interactions for visualization...")
    dag = circuit_to_dag(transpiled_qc)
    slices_data_for_json = [] 
    
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

    num_qubits_for_viz = transpiled_qc.num_qubits # This is the actual number of qubits in the circuit used
    
    output_data = {
        "num_qubits": num_qubits_for_viz,
        "operations_per_slice": slices_data_for_json,
        "coupling_map": coupling_map_list
    }

    output_filename = "qaoa_viz_data.json" 

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4)

    print(f"Interaction data saved to {output_filename}")
    print(f"  Number of qubits: {num_qubits_for_viz}")
    print(f"  Number of time slices: {len(slices_data_for_json)}")
    # --- End of interaction extraction ---


if __name__ == "__main__":
    main() 