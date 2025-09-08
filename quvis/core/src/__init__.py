"""
Quvis Quantum Circuit Visualizer - Core Package

This package provides universal quantum circuit visualization with automatic compilation and routing analysis.

## Usage

```python
from src import visualize_circuit, Visualizer
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT, QAOAAnsatz

# Visualize any quantum circuit
circuit = QuantumCircuit(4)
circuit.h(0)
circuit.cx(0, 1)
visualize_circuit(circuit, coupling_map, algorithm_name="My Circuit")

# Use standard Qiskit algorithms
qft = QFT(num_qubits=5, do_swaps=True)
visualize_circuit(qft, coupling_map, algorithm_name="My QFT")
```
"""

# Main Library Mode Interfaces
from .quvis import Visualizer, visualize_circuit, create_example_circuit

# Interactive Playground API
from .playground_api import PlaygroundAPI, generate_playground_circuit

# Data Structures and Utilities
from .compiler_utils import (
    LogicalCircuitInfo, 
    CompiledCircuitInfo, 
    RoutingCircuitInfo, 
    DeviceInfo, 
    VisualizationData,
    extract_operations_per_slice,
    extract_routing_operations_per_slice,
    analyze_routing_overhead
)

__version__ = "v0.18.0"

__all__ = [
    # Main Interfaces
    "Visualizer",
    "visualize_circuit", 
    "create_example_circuit",
    
    # Playground API
    "PlaygroundAPI",
    "generate_playground_circuit",
    
    # Data Structures
    "LogicalCircuitInfo",
    "CompiledCircuitInfo", 
    "RoutingCircuitInfo",
    "DeviceInfo",
    "VisualizationData",
    
    # Utilities
    "extract_operations_per_slice",
    "extract_routing_operations_per_slice", 
    "analyze_routing_overhead"
]
