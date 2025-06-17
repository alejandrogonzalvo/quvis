from qiskit import transpile
from qiskit.transpiler import CouplingMap
from qiskit.circuit.library import QFT
from qiskit import qasm3
from qiskit.converters import circuit_to_dag
import json
import argparse

def load_coupling_map(coupling_map_filepath: str) -> dict:
    try:
        with open(coupling_map_filepath, 'r') as f:
            device_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Coupling map file not found at {coupling_map_filepath}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {coupling_map_filepath}")
        return
    return device_data

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compile a QFT circuit for a given device topology (from file) and extract interactions.")
    parser.add_argument(
        "-q", "--qft_qubits", 
        type=int, 
        default=3, 
        help="Number of qubits for the QFT circuit (default: 3)"
    )
    parser.add_argument(
        "-c", "--coupling_map_file",
        type=str,
        required=True,
        help="Path to the JSON file containing the device coupling map and info."
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="qft_viz_data.json",
        help="Path to the output JSON file (default: qft_viz_data.json)"
    )
    return parser.parse_args()


def validate_coupling_map(device_data: dict) -> bool:
    coupling_map_list: list = device_data.get("coupling_map")
    num_device_qubits: int = device_data.get("num_qubits")
    topology_type: str = device_data.get("topology_type", "unknown")

    if coupling_map_list is None or num_device_qubits is None:
        print("Error: The coupling map file must contain 'coupling_map' (list) and 'num_qubits' (int).")
        return False    
    if not isinstance(num_device_qubits, int) or num_device_qubits <= 0:
        print(f"Error: 'num_qubits' in {coupling_map_filepath} must be a positive integer. Found: {num_device_qubits}")
        return False
    if m_qft_qubits > num_device_qubits:
        print(
            f"Warning: QFT circuit has {m_qft_qubits} qubits, but the device (from {coupling_map_filepath}) only has {num_device_qubits} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if QFT qubits > device qubits."
        )
        return False
    return True

def main():
    args: argparse.Namespace = parse_args()

    m_qft_qubits: int = args.qft_qubits
    coupling_map_filepath: str = args.coupling_map_file
    output_filename: str = args.output

    device_data: dict = load_coupling_map(coupling_map_filepath)

    coupling_map_list: list = device_data.get("coupling_map")
    num_device_qubits: int = device_data.get("num_qubits")
    topology_type: str = device_data.get("topology_type", "unknown")

    if not validate_coupling_map(device_data):
        return

    qft_qc = QFT(
        num_qubits=m_qft_qubits,
        do_swaps=True,
        approximation_degree=0,
        insert_barriers=False,
    )

    decomposed_qft_qc = qft_qc.decompose()

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

    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None

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

    compiled_dag = circuit_to_dag(transpiled_qc) # Renamed from dag to compiled_dag
    compiled_operations_per_slice = [] # Renamed from slices_data_for_json    
    compiled_qubit_indices = {qubit: i for i, qubit in enumerate(transpiled_qc.qubits)} # Renamed from qubit_indices

    for i, layer in enumerate(compiled_dag.layers()): # Use compiled_dag
        slice_ops = []
        for node in layer['graph'].op_nodes(): # Iterate over actual operation nodes
            op = node.op
            op_name = op.name
            op_qubit_indices = [compiled_qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops: 
            compiled_operations_per_slice.append(slice_ops)

    num_qubits_in_compiled_circuit = transpiled_qc.num_qubits
    
    output_data = {
        "logical_circuit_info": {
            "num_qubits": decomposed_qft_qc.num_qubits,
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

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4)

    print(f"\nInteraction data saved to {output_filename}")
    print(f"  Logical circuit: {decomposed_qft_qc.num_qubits} qubits, {len(logical_operations_per_slice)} slices.")
    print(f"  Compiled circuit: {num_qubits_in_compiled_circuit} qubits, {len(compiled_operations_per_slice)} slices.")
    print(f"  Device: {num_device_qubits} qubits, topology '{topology_type}' (loaded from {coupling_map_filepath}).")
    # --- End of interaction extraction ---


if __name__ == "__main__":
    main()
