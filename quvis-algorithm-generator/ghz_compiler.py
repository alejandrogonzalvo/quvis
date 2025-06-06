from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
from qiskit.converters import circuit_to_dag
import json
import argparse

def create_ghz_circuit(num_qubits):
    """Creates a GHZ state circuit."""
    if num_qubits == 0:
        return QuantumCircuit(0)
    qc = QuantumCircuit(num_qubits)
    qc.h(0)
    for i in range(1, num_qubits):
        qc.cx(0, i)
    return qc

def main():
    # --- Argument Parsing --- 
    parser = argparse.ArgumentParser(description="Compile a GHZ circuit for a given device topology (from file) and extract interactions.")
    parser.add_argument(
        "-q", "--qubits", 
        type=int, 
        default=3, 
        help="Number of qubits for the GHZ circuit (default: 3)"
    )
    parser.add_argument(
        "--coupling_map_file",
        type=str,
        required=True,
        help="Path to the JSON file containing the device coupling map and info."
    )
    args = parser.parse_args()

    # --- Configuration from args ---
    m_ghz_qubits = args.qubits
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

    print(f"Config: GHZ qubits = {m_ghz_qubits}, Device Qubits (from file) = {num_device_qubits}")

    if m_ghz_qubits > num_device_qubits:
        print(
            f"Warning: GHZ circuit has {m_ghz_qubits} qubits, but the device (from {coupling_map_filepath}) only has {num_device_qubits} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if GHZ qubits > device qubits."
        )

    if not coupling_map_list and num_device_qubits > 1: 
        print(
            f"Warning: Loaded an empty coupling map for a device with {num_device_qubits} qubits from {coupling_map_filepath}. This might be an issue if num_device_qubits > 1."
        )
    elif coupling_map_list:
        print(f"Using coupling map (loaded from file): {coupling_map_list}")

    # Create GHZ circuit
    print(
        f"\nCreating a GHZ circuit for {m_ghz_qubits} qubits."
    )
    ghz_qc = create_ghz_circuit(m_ghz_qubits)

    # --- DECOMPOSE THE GHZ CIRCUIT FOR THE LOGICAL VIEW ---
    print("\nDecomposing the original GHZ circuit into standard gates for logical view...")

    logical_basis_gates = ['u3', 'cx']
    decomposed_ghz_qc = transpile(ghz_qc, basis_gates=logical_basis_gates, optimization_level=0) 

    # --- Extract interactions from the DECOMPOSED (logical) GHZ circuit ---
    print("\nExtracting logical interactions from the decomposed GHZ circuit...")
    logical_dag = circuit_to_dag(decomposed_ghz_qc) 
    logical_operations_per_slice = []
    logical_qubit_indices = {qubit: i for i, qubit in enumerate(decomposed_ghz_qc.qubits)}


    for i, layer in enumerate(logical_dag.layers()):
        slice_ops = []
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name
            op_qubit_indices = [logical_qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops:
            logical_operations_per_slice.append(slice_ops)

    print(f"  Number of logical qubits (after decomposition): {decomposed_ghz_qc.num_qubits}")
    print(f"  Number of time slices in decomposed logical circuit: {len(logical_operations_per_slice)}")
    # --- End of original interaction extraction ---

    # --- Transpile the GHZ circuit for the device ---
    print(
        f"\nTranspiling GHZ circuit for the device topology (from {coupling_map_filepath})..."
    )
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None

    transpile_options = {
        "basis_gates": ["u1", "u2", "u3", "cx"],
        "optimization_level": 3,
    }
    if custom_coupling_map:
        transpile_options["coupling_map"] = custom_coupling_map

    transpiled_qc = transpile(
        ghz_qc,
        **transpile_options
    )

    # --- Extract qubit interactions per time slice from the transpiled circuit ---
    print("\nExtracting compiled qubit interactions for visualization...")
    compiled_dag = circuit_to_dag(transpiled_qc)
    compiled_operations_per_slice = []
    
    compiled_qubit_indices = {qubit: i for i, qubit in enumerate(transpiled_qc.qubits)}

    for i, layer in enumerate(compiled_dag.layers()):
        slice_ops = []
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name
            op_qubit_indices = [compiled_qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops:
            compiled_operations_per_slice.append(slice_ops)

    num_qubits_in_compiled_circuit = transpiled_qc.num_qubits
    
    # Create the data structure for JSON
    output_data = {
        "logical_circuit_info": {
            "num_qubits": decomposed_ghz_qc.num_qubits,
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

    output_filename = "ghz_viz_data.json"

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4)

    print(f"\nInteraction data saved to {output_filename}")
    print(f"  Logical circuit: {decomposed_ghz_qc.num_qubits} qubits, {len(logical_operations_per_slice)} slices.")
    print(f"  Compiled circuit: {num_qubits_in_compiled_circuit} qubits, {len(compiled_operations_per_slice)} slices.")
    print(f"  Device: {num_device_qubits} qubits, topology '{topology_type}' (loaded from {coupling_map_filepath}).")


if __name__ == "__main__":
    main() 