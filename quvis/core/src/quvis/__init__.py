"""
Quvis Quantum Circuit Visualizer - Core Package

This package provides universal quantum circuit visualization with automatic compilation and routing analysis.

## Usage

```python
from quvis import visualize_circuit, QuvisVisualizer
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
from .api.visualizer import QuvisVisualizer, visualize_circuit, create_example_circuit

# Interactive Playground API
from .api.playground import PlaygroundAPI

# Data Structures and Utilities
from .compiler.utils import (
    LogicalCircuitInfo, 
    CompiledCircuitInfo, 
    RoutingCircuitInfo, 
    DeviceInfo, 
    VisualizationData,
    extract_operations_per_slice,
    extract_routing_operations_per_slice,
    analyze_routing_overhead
)

__version__ = "3.0.0"

__all__ = [
    # Main Interfaces
    "QuvisVisualizer",
    "visualize_circuit", 
    "create_example_circuit",
    
    # Playground API
    "PlaygroundAPI",
    
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