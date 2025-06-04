from qiskit import transpile
from qiskit.transpiler import CouplingMap
from qiskit.circuit.library import QFT
from qiskit import qasm3
from qiskit.converters import circuit_to_dag
# import numpy as np # No longer needed for direct JSON output
import json
# import time # No longer needed for timestamped filename in this simplified approach
import argparse


def main():
    # --- Argument Parsing --- 
    parser = argparse.ArgumentParser(description="Compile a QFT circuit for a given device topology (from file) and extract interactions.")
    parser.add_argument(
        "-q", "--qft_qubits", 
        type=int, 
        default=3, 
        help="Number of qubits for the QFT circuit (default: 3)"
    )
    parser.add_argument(
        "--coupling_map_file",
        type=str,
        required=True,
        help="Path to the JSON file containing the device coupling map and info."
    )
    args = parser.parse_args()

    # --- Configuration from args ---
    m_qft_qubits = args.qft_qubits
    coupling_map_filepath = args.coupling_map_file
    # ---------------------

    # --- Load Coupling Map from File ---
    print(f"Loading coupling map from: {coupling_map_filepath}")
    try:
        with open(coupling_map_filepath, 'r') as f:
            device_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Coupling map file not found at {coupling_map_filepath}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {coupling_map_filepath}")
        return

    coupling_map_list = device_data.get("coupling_map")
    num_device_qubits = device_data.get("num_qubits")
    topology_type = device_data.get("topology_type", "unknown")

    if coupling_map_list is None or num_device_qubits is None:
        print("Error: The coupling map file must contain 'coupling_map' (list) and 'num_qubits' (int).")
        return

    if not isinstance(num_device_qubits, int) or num_device_qubits <= 0:
        print(f"Error: 'num_qubits' in {coupling_map_filepath} must be a positive integer. Found: {num_device_qubits}")
        return

    print(f"Successfully loaded device data: Topology='{topology_type}', Device Qubits='{num_device_qubits}'")
    # --- End Load Coupling Map ---

    print(f"Config: QFT qubits = {m_qft_qubits}, Device Qubits (from file) = {num_device_qubits}")

    if m_qft_qubits > num_device_qubits:
        print(
            f"Warning: QFT circuit has {m_qft_qubits} qubits, but the device (from {coupling_map_filepath}) only has {num_device_qubits} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if QFT qubits > device qubits."
        )
        # Decide if we should proceed or exit. For now, let's proceed.
        # return

    if not coupling_map_list and num_device_qubits > 1: 
        print(
            f"Warning: Loaded an empty coupling map for a device with {num_device_qubits} qubits from {coupling_map_filepath}. This might be an issue if num_device_qubits > 1."
        )
    elif coupling_map_list:
        print(f"Using coupling map (loaded from file): {coupling_map_list}")

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

    # --- DECOMPOSE THE QFT CIRCUIT FOR THE LOGICAL VIEW ---
    print("\nDecomposing the original QFT circuit into standard gates for logical view...")

    logical_basis_gates = ['u3', 'cx'] # Example: or ['u', 'cx'], or ['h', 's', 'sdg', 'cx', 'u1', 'u2', 'u3'] etc.
    # You might want to experiment with different basis gates.
    # Using qft_qc.decompose() might also work to break it down one level,
    # but transpile with a basis set is more thorough.
    decomposed_qft_qc = transpile(qft_qc, basis_gates=logical_basis_gates, optimization_level=0) 

    # --- Extract interactions from the DECOMPOSED (logical) QFT circuit ---
    print("\nExtracting logical interactions from the decomposed QFT circuit...")
    original_dag = circuit_to_dag(decomposed_qft_qc) 
    logical_operations_per_slice = []
    logical_qubit_indices = {qubit: i for i, qubit in enumerate(decomposed_qft_qc.qubits)}


    for i, layer in enumerate(original_dag.layers()):
        slice_ops = []
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name
            op_qubit_indices = [logical_qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops:
            logical_operations_per_slice.append(slice_ops)

    print(f"  Number of logical qubits (after decomposition): {decomposed_qft_qc.num_qubits}")
    print(f"  Number of time slices in decomposed logical circuit: {len(logical_operations_per_slice)}")
    # --- End of original interaction extraction ---


    # Transpile the QFT circuit for the grid
    # We need to ensure the coupling map is correctly formatted for the transpile function
    # The transpile function can take a CouplingMap object or a list of lists.

    # If m_qft_qubits is less than n_grid_size*n_grid_size, the transpiler
    # will try to map the m logical qubits to a subset of the n*n physical qubits.
    # The `optimization_level` can be adjusted for different trade-offs.
    print(
        f"\nTranspiling QFT circuit for the device topology (from {coupling_map_filepath})..."
    )

    # For transpilation, all qubits in the circuit must be addressable by the coupling map.
    # If m_qft_qubits < n_grid_size*n_grid_size, the qft_qc has m qubits (0 to m-1).
    # The coupling_map refers to qubits 0 to n*n-1.
    # The transpiler handles this mapping.

    # Create a CouplingMap object if you have a list of lists
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None

    # Transpile the circuit
    # For a custom device with only a coupling map, we don't specify a backend.
    # The number of qubits for the transpiled circuit will be at least m_qft_qubits.
    # If the coupling map involves more qubits than m_qft_qubits, the transpiler
    # will choose a layout. The final circuit will act on a subset of the device qubits.

    transpile_options = {
        "basis_gates": ["u1", "u2", "u3", "cx"],
        "optimization_level": 3,
    }
    if custom_coupling_map:
        transpile_options["coupling_map"] = custom_coupling_map

    transpiled_qc = transpile(
        qft_qc,
        **transpile_options
    )

    # --- Extract qubit interactions per time slice from the transpiled circuit ---
    print("\nExtracting compiled qubit interactions for visualization...")
    compiled_dag = circuit_to_dag(transpiled_qc) # Renamed from dag to compiled_dag
    compiled_operations_per_slice = [] # Renamed from slices_data_for_json
    
    # Create a mapping from Qubit objects to their integer indices in the transpiled circuit
    compiled_qubit_indices = {qubit: i for i, qubit in enumerate(transpiled_qc.qubits)} # Renamed from qubit_indices

    for i, layer in enumerate(compiled_dag.layers()): # Use compiled_dag
        slice_ops = []
        # layer['graph'] is a DAGCircuit representing the current layer
        for node in layer['graph'].op_nodes(): # Iterate over actual operation nodes
            op = node.op
            op_name = op.name
            # node.qargs contains the Qubit objects this operation acts on
            # We need their integer indices from the transpiled circuit's perspective
            op_qubit_indices = [compiled_qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops: # Only add the slice if it contains operations
            compiled_operations_per_slice.append(slice_ops)
            # print(f"Compiled Slice {len(compiled_operations_per_slice) - 1}: {slice_ops}") # Optional

    num_qubits_in_compiled_circuit = transpiled_qc.num_qubits # Renamed from num_qubits_for_viz
    
    # Create the data structure for JSON
    output_data = {
        "logical_circuit_info": {
            "num_qubits": decomposed_qft_qc.num_qubits, # Use count from decomposed circuit
            "interaction_graph_ops_per_slice": logical_operations_per_slice
        },
        "compiled_circuit_info": {
            "num_qubits": num_qubits_in_compiled_circuit,
            "compiled_interaction_graph_ops_per_slice": compiled_operations_per_slice
        },
        "device_info": {
            "source_coupling_map_file": coupling_map_filepath,
            "topology_type": topology_type,
            "num_qubits_on_device": num_device_qubits,
            "connectivity_graph_coupling_map": coupling_map_list
        }
    }

    output_filename = "qft_viz_data.json"

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4)

    print(f"\nInteraction data saved to {output_filename}")
    print(f"  Logical circuit: {decomposed_qft_qc.num_qubits} qubits, {len(logical_operations_per_slice)} slices.")
    print(f"  Compiled circuit: {num_qubits_in_compiled_circuit} qubits, {len(compiled_operations_per_slice)} slices.")
    print(f"  Device: {num_device_qubits} qubits, topology '{topology_type}' (loaded from {coupling_map_filepath}).")
    # --- End of interaction extraction ---


if __name__ == "__main__":
    main()
