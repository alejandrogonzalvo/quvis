from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
from qiskit.converters import circuit_to_dag
from qiskit.dagcircuit import DAGOpNode
import json
import argparse
from compiler_utils import (
    load_coupling_map, validate_coupling_map, extract_operations_per_slice, 
    get_common_parser, LogicalCircuitInfo, CompiledCircuitInfo, DeviceInfo, 
    VisualizationData
)

def create_ghz_circuit(num_qubits: int) -> QuantumCircuit:
    """Creates a GHZ state circuit."""
    if num_qubits == 0:
        return QuantumCircuit(0)
    qc = QuantumCircuit(num_qubits)
    qc.h(0)
    for i in range(1, num_qubits):
        qc.cx(0, i)
    return qc

def parse_args() -> argparse.Namespace:
    parser = get_common_parser("Compile a GHZ circuit for a given device topology and extract interactions.")
    parser.set_defaults(output="ghz_viz_data.json")
    return parser.parse_args()

def main():
    args: argparse.Namespace = parse_args()

    m_ghz_qubits: int = args.qubits
    coupling_map_filepath: str = args.coupling_map_file
    output_filename: str = args.output

    device_data: dict = load_coupling_map(coupling_map_filepath)
    if not device_data:
        return

    coupling_map_list: list = device_data.get("coupling_map")
    num_device_qubits: int = device_data.get("num_qubits")
    topology_type: str = device_data.get("topology_type", "unknown")

    if not validate_coupling_map(device_data, m_ghz_qubits, coupling_map_filepath):
        return

    print(f"Successfully loaded device data: Topology='{topology_type}', Device Qubits='{num_device_qubits}'")
    
    print(
        f"\nCreating a GHZ circuit for {m_ghz_qubits} qubits."
    )
    ghz_qc = create_ghz_circuit(m_ghz_qubits)

    decomposed_ghz_qc = ghz_qc.decompose()

    print("\nExtracting logical interactions from the decomposed GHZ circuit...")
    logical_operations_per_slice = extract_operations_per_slice(decomposed_ghz_qc)
    print(f"  Number of logical qubits (after decomposition): {decomposed_ghz_qc.num_qubits}")
    print(f"  Number of time slices in decomposed logical circuit: {len(logical_operations_per_slice)}")

    print(
        f"\nTranspiling GHZ circuit for the device topology (from {coupling_map_filepath})..."
    )
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list) if coupling_map_list else None

    transpile_options = {
        "basis_gates": ['id', 'rz', 'sx', 'x', 'cx'],
        "optimization_level": 3,
    }
    if custom_coupling_map:
        transpile_options["coupling_map"] = custom_coupling_map

    transpiled_qc = transpile(
        ghz_qc,
        **transpile_options
    )

    print("\nExtracting compiled qubit interactions for visualization...")
    compiled_operations_per_slice = extract_operations_per_slice(transpiled_qc)
    num_qubits_in_compiled_circuit = transpiled_qc.num_qubits
    
    logical_info = LogicalCircuitInfo(
        num_qubits=decomposed_ghz_qc.num_qubits,
        interaction_graph_ops_per_slice=logical_operations_per_slice
    )

    compiled_info = CompiledCircuitInfo(
        num_qubits=num_qubits_in_compiled_circuit,
        compiled_interaction_graph_ops_per_slice=compiled_operations_per_slice
    )

    device_info = DeviceInfo(
        source_coupling_map_file=coupling_map_filepath,
        topology_type=topology_type,
        num_qubits_on_device=num_device_qubits,
        connectivity_graph_coupling_map=coupling_map_list
    )

    output_data = VisualizationData(
        logical_circuit_info=logical_info,
        compiled_circuit_info=compiled_info,
        device_info=device_info
    )

    output_data.to_json_file(output_filename)

    print(f"\nInteraction data saved to {output_filename}")
    print(f"  Logical circuit: {decomposed_ghz_qc.num_qubits} qubits, {len(logical_operations_per_slice)} slices.")
    print(f"  Compiled circuit: {num_qubits_in_compiled_circuit} qubits, {len(compiled_operations_per_slice)} slices.")
    print(f"  Device: {num_device_qubits} qubits, topology '{topology_type}' (loaded from {coupling_map_filepath}).")


if __name__ == "__main__":
    main() 