import argparse
import json
from qiskit.converters import circuit_to_dag
from dataclasses import dataclass, asdict

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

def load_coupling_map(coupling_map_filepath: str) -> dict:
    """Loads a coupling map from a JSON file."""
    try:
        with open(coupling_map_filepath, 'r') as f:
            device_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Coupling map file not found at {coupling_map_filepath}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {coupling_map_filepath}")
        return None
    return device_data

def validate_coupling_map(device_data: dict, num_circuit_qubits: int, coupling_map_filepath: str) -> bool:
    """Validates the device data and coupling map."""
    coupling_map_list: list = device_data.get("coupling_map")
    num_device_qubits: int = device_data.get("num_qubits")

    if coupling_map_list is None or num_device_qubits is None:
        print("Error: The coupling map file must contain 'coupling_map' (list) and 'num_qubits' (int).")
        return False
    if not isinstance(num_device_qubits, int) or num_device_qubits <= 0:
        print(f"Error: 'num_qubits' in {coupling_map_filepath} must be a positive integer. Found: {num_device_qubits}")
        return False
    if num_circuit_qubits > num_device_qubits:
        print(
            f"Warning: The circuit has {num_circuit_qubits} qubits, but the device (from {coupling_map_filepath}) only has {num_device_qubits} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit."
        )
        return False
    return True

def extract_operations_per_slice(qc):
    """Extracts operations per slice from a quantum circuit."""
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
    Extracts only routing operations (SWAP gates and other routing-related operations) per slice.
    
    Args:
        qc: Quantum circuit (typically the transpiled circuit)
    
    Returns:
        tuple: (routing_ops_per_slice, total_swap_count, routing_depth)
    """
    dag = circuit_to_dag(qc)
    routing_ops_per_slice = []
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}
    total_swap_count = 0
    routing_depth = 0
    
    # Operations that are typically inserted for routing
    routing_op_names = {'swap', 'bridge', 'iswap'}  # Can be extended
    
    for layer_idx, layer in enumerate(dag.layers()):
        slice_routing_ops = []
        has_routing_ops = False
        
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name.lower()
            
            # Check if this is a routing operation
            if op_name in routing_op_names:
                op_qubit_indices = [qubit_indices[q] for q in node.qargs]
                slice_routing_ops.append({
                    "name": op.name,
                    "qubits": op_qubit_indices,
                    "routing_type": "swap" if op_name == "swap" else "other"
                })
                has_routing_ops = True
                
                if op_name == "swap":
                    total_swap_count += 1
        
        # Only add slices that contain routing operations
        if has_routing_ops:
            routing_ops_per_slice.append(slice_routing_ops)
            routing_depth = layer_idx + 1  # Track the depth including routing
        else:
            # Add empty slice to maintain time alignment with other views
            routing_ops_per_slice.append([])
    
    return routing_ops_per_slice, total_swap_count, routing_depth

def analyze_routing_overhead(logical_circuit, compiled_circuit):
    """
    Analyze the routing overhead by comparing logical and compiled circuits.
    
    Args:
        logical_circuit: The original decomposed circuit
        compiled_circuit: The transpiled circuit
    
    Returns:
        dict: Analysis results including routing metrics
    """
    logical_ops = extract_operations_per_slice(logical_circuit)
    compiled_ops = extract_operations_per_slice(compiled_circuit)
    routing_ops, swap_count, routing_depth = extract_routing_operations_per_slice(compiled_circuit)
    
    # Calculate metrics
    logical_depth = len(logical_ops)
    compiled_depth = len(compiled_ops)
    routing_overhead_depth = compiled_depth - logical_depth
    
    # Count total operations
    logical_op_count = sum(len(slice_ops) for slice_ops in logical_ops)
    compiled_op_count = sum(len(slice_ops) for slice_ops in compiled_ops)
    routing_op_count = sum(len(slice_ops) for slice_ops in routing_ops)
    
    return {
        "logical_depth": logical_depth,
        "compiled_depth": compiled_depth,
        "routing_overhead_depth": max(0, routing_overhead_depth),
        "logical_op_count": logical_op_count,
        "compiled_op_count": compiled_op_count,
        "routing_op_count": routing_op_count,
        "swap_count": swap_count,
        "routing_depth": routing_depth,
        "routing_overhead_percentage": (routing_op_count / compiled_op_count * 100) if compiled_op_count > 0 else 0
    }

def get_common_parser(description: str) -> argparse.ArgumentParser:
    """Creates a common argument parser for compiler scripts."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "-q", "--qubits", 
        type=int, 
        default=3, 
        help="Number of qubits for the circuit (default: 3)"
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
        help="Path to the output JSON file."
    )
    return parser 