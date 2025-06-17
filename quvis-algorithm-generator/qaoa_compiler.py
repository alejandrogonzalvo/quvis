from qiskit import transpile, QuantumCircuit
from qiskit.transpiler import CouplingMap
import json
import argparse
import numpy as np
from compiler_utils import (
    load_coupling_map, validate_coupling_map, extract_operations_per_slice, 
    get_common_parser, LogicalCircuitInfo, CompiledCircuitInfo, DeviceInfo,
    VisualizationData
)

def create_qaoa_circuit(num_qubits: int, p: int) -> QuantumCircuit:
    """Creates a QAOA circuit for Max-Cut on a line graph."""
    qaoa_qc = QuantumCircuit(num_qubits, name=f"QAOA_p{p}")
    gamma = np.pi / 4
    beta = np.pi / 4

    for qubit in range(num_qubits):
        qaoa_qc.h(qubit)
    
    for _ in range(p):
        if num_qubits > 1:
            for i in range(num_qubits - 1):
                qaoa_qc.cx(i, i + 1)
                qaoa_qc.rz(2 * gamma, i + 1)
                qaoa_qc.cx(i, i + 1)
        for i in range(num_qubits):
            qaoa_qc.rx(2 * beta, i)
            
    return qaoa_qc

def parse_args() -> argparse.Namespace:
    """Parses command-line arguments."""
    parser = get_common_parser("Compile a QAOA circuit for a given device topology and extract interactions.")
    parser.add_argument(
        "-p", "--reps",
        type=int,
        default=1,
        help="Number of QAOA repetitions/layers (p) (default: 1)"
    )
    parser.set_defaults(output="qaoa_viz_data.json")
    parser.add_argument(
        "-q", "--qubits", 
        type=int, 
        default=4, 
        help="Number of qubits for the QAOA circuit (default: 4)"
    )
    return parser.parse_args()

def main():
    args = parse_args()

    m_qaoa_qubits = args.qubits
    qaoa_p = args.reps
    coupling_map_filepath = args.coupling_map_file
    output_filename = args.output

    device_data = load_coupling_map(coupling_map_filepath)
    if not device_data:
        return

    coupling_map_list = device_data.get("coupling_map")
    num_device_qubits = device_data.get("num_qubits")
    topology_type = device_data.get("topology_type", "unknown")

    if not validate_coupling_map(device_data, m_qaoa_qubits, coupling_map_filepath):
        return

    print(f"Successfully loaded device data: Topology='{topology_type}', Device Qubits='{num_device_qubits}'")
    print(f"Config: QAOA qubits = {m_qaoa_qubits}, QAOA reps (p) = {qaoa_p}")

    qaoa_qc = create_qaoa_circuit(m_qaoa_qubits, qaoa_p)
    
    decomposed_qaoa_qc = qaoa_qc.decompose()
    
    print("\nExtracting logical interactions from the original QAOA circuit...")
    logical_operations_per_slice = extract_operations_per_slice(decomposed_qaoa_qc)
    print(f"  Number of logical qubits: {decomposed_qaoa_qc.num_qubits}")
    print(f"  Number of time slices in logical circuit: {len(logical_operations_per_slice)}")

    print(f"\nTranspiling QAOA circuit for the device topology (from {coupling_map_filepath})...")
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None
    
    transpile_options = {
        "basis_gates": ["u1", "u2", "u3", "cx"],
        "optimization_level": 3
    }
    if custom_coupling_map:
        transpile_options["coupling_map"] = custom_coupling_map

    transpiled_qc = transpile(qaoa_qc, **transpile_options)

    print("\nExtracting compiled qubit interactions for visualization...")
    compiled_operations_per_slice = extract_operations_per_slice(transpiled_qc)
    num_compiled_qubits = transpiled_qc.num_qubits
    print(f"  Number of compiled qubits: {num_compiled_qubits}") 
    print(f"  Number of time slices in compiled circuit: {len(compiled_operations_per_slice)}")

    output_data = {
        "logical_circuit_info": {
            "num_qubits": decomposed_qaoa_qc.num_qubits,
            "interaction_graph_ops_per_slice": logical_operations_per_slice
        },
        "compiled_circuit_info": {
            "num_qubits": num_compiled_qubits,
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
    print(f"  Logical circuit: {decomposed_qaoa_qc.num_qubits} qubits, {len(logical_operations_per_slice)} slices.")
    print(f"  Compiled circuit: {num_compiled_qubits} qubits, {len(compiled_operations_per_slice)} slices.")
    print(f"  Device: {num_device_qubits} qubits, topology '{topology_type}' (loaded from {coupling_map_filepath}).")


if __name__ == "__main__":
    main() 