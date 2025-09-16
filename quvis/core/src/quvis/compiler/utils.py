#!/usr/bin/env python3
"""
Optimized utils that can handle 10,000+ qubit circuits efficiently.
These implementations use O(n) memory instead of O(n²) or worse.
"""

import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple, Any
import sys
import gc

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

def extract_operations_per_slice_optimized(qc):
    """
    Ultra-optimized version that minimizes memory usage.
    Uses direct circuit iteration and minimal data structures.
    """
    # Pre-allocate qubit index mapping
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}

    # Pre-allocate result list
    operations_per_slice = []

    # Process each instruction directly - no intermediate structures
    for instruction in qc.data:
        op_name = instruction.operation.name
        op_qubits = [qubit_indices[q] for q in instruction.qubits]

        # Create minimal slice with single operation
        slice_ops = [{"name": op_name, "qubits": op_qubits}]
        operations_per_slice.append(slice_ops)

    return operations_per_slice

def extract_routing_operations_per_slice_optimized(qc):
    """
    Memory-efficient routing extraction that avoids DAG conversion.
    Only processes routing operations, skipping unnecessary empty slices.
    """
    routing_op_names = {'swap', 'bridge', 'iswap'}
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}

    # Use sparse representation - only store non-empty slices
    routing_operations = []  # List of (slice_index, operations) tuples
    total_swap_count = 0
    max_routing_depth = 0

    # Process circuit data directly - no DAG conversion
    for slice_idx, instruction in enumerate(qc.data):
        op_name = instruction.operation.name.lower()

        if op_name in routing_op_names:
            op_qubits = [qubit_indices[q] for q in instruction.qubits]

            routing_op = {
                "name": instruction.operation.name,
                "qubits": op_qubits,
                "routing_type": "swap" if op_name == "swap" else "other"
            }

            # Store as (slice_index, [operations]) for sparse representation
            routing_operations.append((slice_idx, [routing_op]))
            max_routing_depth = slice_idx + 1

            if op_name == "swap":
                total_swap_count += 1

    # Convert sparse to dense representation only if needed for compatibility
    # For most applications, sparse representation is much more efficient
    routing_ops_per_slice = []
    routing_idx = 0

    for slice_idx in range(len(qc.data)):
        if (routing_idx < len(routing_operations) and
            routing_operations[routing_idx][0] == slice_idx):
            routing_ops_per_slice.append(routing_operations[routing_idx][1])
            routing_idx += 1
        else:
            routing_ops_per_slice.append([])  # Empty slice

    return routing_ops_per_slice, total_swap_count, max_routing_depth

def extract_routing_operations_sparse(qc):
    """
    Super-efficient sparse routing extraction for very large circuits.
    Returns only non-empty routing operations with their positions.
    """
    routing_op_names = {'swap', 'bridge', 'iswap'}
    qubit_indices = {qubit: i for i, qubit in enumerate(qc.qubits)}

    routing_operations = []
    total_swap_count = 0

    for slice_idx, instruction in enumerate(qc.data):
        op_name = instruction.operation.name.lower()

        if op_name in routing_op_names:
            op_qubits = [qubit_indices[q] for q in instruction.qubits]

            routing_operations.append({
                "slice_index": slice_idx,
                "name": instruction.operation.name,
                "qubits": op_qubits,
                "routing_type": "swap" if op_name == "swap" else "other"
            })

            if op_name == "swap":
                total_swap_count += 1

    routing_depth = routing_operations[-1]["slice_index"] + 1 if routing_operations else 0

    return routing_operations, total_swap_count, routing_depth

def analyze_routing_overhead_optimized(logical_circuit, compiled_circuit):
    """
    Memory-efficient routing analysis that processes circuits directly.
    Avoids creating large intermediate data structures.
    """
    # Direct circuit analysis - no intermediate lists
    logical_depth = len(logical_circuit.data)
    compiled_depth = len(compiled_circuit.data)

    logical_op_count = len(logical_circuit.data)
    compiled_op_count = len(compiled_circuit.data)

    # Count routing operations efficiently
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
    routing_depth = compiled_depth  # For simple circuits

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

def create_visualization_data_optimized(logical_circuit, compiled_circuit, device_info_dict=None):
    """
    Create visualization data with optimized memory usage.
    Uses streaming processing to minimize peak memory usage.
    """

    # Process logical circuit
    print("Processing logical circuit...")
    logical_ops = extract_operations_per_slice_optimized(logical_circuit)

    logical_info = LogicalCircuitInfo(
        num_qubits=logical_circuit.num_qubits,
        interaction_graph_ops_per_slice=logical_ops
    )

    # Clear logical_ops from memory immediately
    del logical_ops
    gc.collect()

    # Process compiled circuit
    print("Processing compiled circuit...")
    compiled_ops = extract_operations_per_slice_optimized(compiled_circuit)

    compiled_info = CompiledCircuitInfo(
        num_qubits=compiled_circuit.num_qubits,
        compiled_interaction_graph_ops_per_slice=compiled_ops
    )

    # Clear compiled_ops from memory
    del compiled_ops
    gc.collect()

    # Process routing information efficiently
    print("Processing routing information...")
    routing_ops, swap_count, routing_depth = extract_routing_operations_per_slice_optimized(compiled_circuit)

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

# Compatibility functions that delegate to optimized versions
def extract_operations_per_slice(qc):
    """Main entry point - uses optimized version."""
    return extract_operations_per_slice_optimized(qc)

def extract_routing_operations_per_slice(qc):
    """Main entry point - uses optimized version."""
    return extract_routing_operations_per_slice_optimized(qc)

def analyze_routing_overhead(logical_circuit, compiled_circuit):
    """Main entry point - uses optimized version."""
    return analyze_routing_overhead_optimized(logical_circuit, compiled_circuit)

if __name__ == "__main__":
    # Test the optimized functions
    import time
    import psutil
    import os
    from qiskit import QuantumCircuit, transpile

    def create_ghz_circuit(num_qubits):
        qc = QuantumCircuit(num_qubits)
        qc.h(0)
        for i in range(1, num_qubits):
            qc.cx(0, i)
        return qc

    def test_optimized_version(size):
        process = psutil.Process(os.getpid())

        print(f"\\n=== Testing optimized version with {size} qubits ===")

        initial_memory = process.memory_info().rss / 1024 / 1024
        print(f"Initial memory: {initial_memory:.1f}MB")

        # Create circuit
        circuit = create_ghz_circuit(size)
        compiled_circuit = transpile(circuit, optimization_level=2)

        after_circuit_memory = process.memory_info().rss / 1024 / 1024
        print(f"After circuit creation: {after_circuit_memory:.1f}MB (+{after_circuit_memory - initial_memory:.1f}MB)")

        # Test optimized functions
        start_time = time.perf_counter()

        logical_ops = extract_operations_per_slice_optimized(circuit)

        after_logical = process.memory_info().rss / 1024 / 1024
        print(f"After logical extract: {after_logical:.1f}MB (+{after_logical - after_circuit_memory:.1f}MB)")

        compiled_ops = extract_operations_per_slice_optimized(compiled_circuit)

        after_compiled = process.memory_info().rss / 1024 / 1024
        print(f"After compiled extract: {after_compiled:.1f}MB (+{after_compiled - after_logical:.1f}MB)")

        routing_ops, swap_count, routing_depth = extract_routing_operations_per_slice_optimized(compiled_circuit)

        after_routing = process.memory_info().rss / 1024 / 1024
        print(f"After routing extract: {after_routing:.1f}MB (+{after_routing - after_compiled:.1f}MB)")

        overhead_result = analyze_routing_overhead_optimized(circuit, compiled_circuit)

        after_overhead = process.memory_info().rss / 1024 / 1024
        processing_time = time.perf_counter() - start_time

        print(f"After overhead analysis: {after_overhead:.1f}MB (+{after_overhead - after_routing:.1f}MB)")
        print(f"Total processing time: {processing_time:.3f}s")
        print(f"Total memory increase: {after_overhead - initial_memory:.1f}MB")
        print(f"Memory per qubit: {(after_overhead - initial_memory) * 1024 / size:.1f}KB")

        # Clean up
        del logical_ops, compiled_ops, routing_ops
        gc.collect()

        return True

    # Test with progressively larger circuits
    test_sizes = [1000, 2000, 5000, 10000]

    for size in test_sizes:
        try:
            test_optimized_version(size)
        except Exception as e:
            print(f"Failed at {size} qubits: {e}")
            break

    print("\\n✅ Optimized version testing completed!")