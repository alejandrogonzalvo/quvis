#!/usr/bin/env python3
"""
Utils for quantum circuit compilation and visualization data extraction.
"""

import json
from dataclasses import dataclass, asdict
import gc
from qiskit.converters import circuit_to_dag

@dataclass
class LogicalCircuitInfo:
    """Stores information about the logical circuit."""
    num_qubits: int
    interaction_graph_ops_per_slice: list

@dataclass
class CompiledCircuitInfo:
    """Stores information about the compiled circuit."""
    num_qubits: int
    compiled_interaction_graph_ops_per_slice: list

@dataclass
class RoutingCircuitInfo:
    """Stores information about routing operations (SWAP gates) in the compiled circuit."""
    num_qubits: int
    routing_ops_per_slice: list
    total_swap_count: int
    routing_depth: int

@dataclass
class DeviceInfo:
    """Stores information about the target device."""
    source_coupling_map_file: str
    topology_type: str
    num_qubits_on_device: int
    connectivity_graph_coupling_map: list

@dataclass
class VisualizationData:
    """Top-level container for all visualization data."""
    logical_circuit_info: LogicalCircuitInfo
    compiled_circuit_info: CompiledCircuitInfo
    routing_circuit_info: RoutingCircuitInfo
    device_info: DeviceInfo

    def to_json_file(self, filepath: str):
        """Saves the data to a JSON file."""
        with open(filepath, 'w') as f:
            json.dump(asdict(self), f, separators=(',', ':'))

def extract_operations_per_slice(qc):
    """
    Extracts operations per slice from a quantum circuit.
    Uses circuit DAG layers for efficient processing.
    """
    dag = circuit_to_dag(qc)
    operations_per_slice = []
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}

    for layer in dag.layers():
        slice_ops = []
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name
            op_qubit_indices = [qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        if slice_ops:
            operations_per_slice.append(slice_ops)

    return operations_per_slice

def extract_routing_operations_per_slice(qc):
    """
    Extracts routing operations (SWAP, bridge, iSWAP) from a quantum circuit.
    Returns routing operations per slice, swap count, and routing depth.
    """
    routing_op_names = {'swap', 'bridge', 'iswap'}
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}

    routing_operations = []
    total_swap_count = 0
    max_routing_depth = 0

    for slice_idx, instruction in enumerate(qc.data):
        op_name = instruction.operation.name.lower()

        if op_name in routing_op_names:
            op_qubits = [qubit_indices[q] for q in instruction.qubits]

            routing_op = {
                "name": instruction.operation.name,
                "qubits": op_qubits,
                "routing_type": "swap" if op_name == "swap" else "other"
            }

            routing_operations.append((slice_idx, [routing_op]))
            max_routing_depth = slice_idx + 1

            if op_name == "swap":
                total_swap_count += 1

    # Convert to dense representation
    routing_ops_per_slice = []
    routing_idx = 0

    for slice_idx in range(len(qc.data)):
        if (routing_idx < len(routing_operations) and
            routing_operations[routing_idx][0] == slice_idx):
            routing_ops_per_slice.append(routing_operations[routing_idx][1])
            routing_idx += 1
        else:
            routing_ops_per_slice.append([])

    return routing_ops_per_slice, total_swap_count, max_routing_depth


def analyze_routing_overhead(logical_circuit, compiled_circuit):
    """
    Analyzes routing overhead by comparing logical and compiled circuits.
    Returns metrics about circuit depth, operation counts, and routing overhead.
    """
    logical_depth = len(logical_circuit.data)
    compiled_depth = len(compiled_circuit.data)
    logical_op_count = len(logical_circuit.data)
    compiled_op_count = len(compiled_circuit.data)

    # Count routing operations
    routing_op_names = {'swap', 'bridge', 'iswap'}
    routing_op_count = 0
    swap_count = 0

    for instruction in compiled_circuit.data:
        op_name = instruction.operation.name.lower()
        if op_name in routing_op_names:
            routing_op_count += 1
            if op_name == 'swap':
                swap_count += 1

    routing_overhead_depth = max(0, compiled_depth - logical_depth)
    routing_depth = compiled_depth
    routing_overhead_percentage = (routing_op_count / compiled_op_count * 100) if compiled_op_count > 0 else 0

    return {
        "logical_depth": logical_depth,
        "compiled_depth": compiled_depth,
        "routing_overhead_depth": routing_overhead_depth,
        "logical_op_count": logical_op_count,
        "compiled_op_count": compiled_op_count,
        "routing_op_count": routing_op_count,
        "swap_count": swap_count,
        "routing_depth": routing_depth,
        "routing_overhead_percentage": routing_overhead_percentage
    }

def create_visualization_data(logical_circuit, compiled_circuit, device_info_dict=None):
    """
    Creates visualization data from logical and compiled quantum circuits.
    """

    # Process logical circuit
    logical_ops = extract_operations_per_slice(logical_circuit)

    logical_info = LogicalCircuitInfo(
        num_qubits=logical_circuit.num_qubits,
        interaction_graph_ops_per_slice=logical_ops
    )

    # Clear logical_ops from memory immediately
    del logical_ops
    gc.collect()

    # Process compiled circuit
    compiled_ops = extract_operations_per_slice(compiled_circuit)

    compiled_info = CompiledCircuitInfo(
        num_qubits=compiled_circuit.num_qubits,
        compiled_interaction_graph_ops_per_slice=compiled_ops
    )

    # Clear compiled_ops from memory
    del compiled_ops
    gc.collect()

    # Process routing information
    routing_ops, swap_count, routing_depth = extract_routing_operations_per_slice(compiled_circuit)

    routing_info = RoutingCircuitInfo(
        num_qubits=compiled_circuit.num_qubits,
        routing_ops_per_slice=routing_ops,
        total_swap_count=swap_count,
        routing_depth=routing_depth
    )

    # Clear routing data
    del routing_ops
    gc.collect()

    # Create device info
    if device_info_dict is None:
        device_info_dict = {
            "source_coupling_map_file": "optimized_device.json",
            "topology_type": "grid",
            "num_qubits_on_device": compiled_circuit.num_qubits,
            "connectivity_graph_coupling_map": []
        }

    device_info = DeviceInfo(**device_info_dict)

    # Create final visualization data
    viz_data = VisualizationData(
        logical_circuit_info=logical_info,
        compiled_circuit_info=compiled_info,
        routing_circuit_info=routing_info,
        device_info=device_info
    )

    return viz_data


