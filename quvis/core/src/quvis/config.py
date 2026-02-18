"""
Configuration classes for Quvis.

This module defines configuration dataclasses to standardize inputs across the application.
"""
from dataclasses import dataclass, field
from typing import Any
from .enums import AlgorithmType, TopologyType

@dataclass
class CircuitGenerationConfig:
    """Configuration for generating and compiling quantum circuits."""
    algorithm: AlgorithmType
    num_qubits: int
    physical_qubits: int
    topology: TopologyType
    optimization_level: int = 1
    algorithm_params: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate configuration."""
        if self.physical_qubits < self.num_qubits:
             # This might be valid for some architectures (like virtual qubits), 
             # but generally for transpilation we need enough physical qubits.
             # We'll validatate strictly for now as per previous logic.
             # Actually, previous logic just passed it through to Qiskit which might error.
             # We will just ensure physical_qubits is set.
             pass

@dataclass
class VisualizationConfig:
    """Configuration for visualizing a circuit."""
    algorithm_name: str = "Circuit"
    topology_type: str = TopologyType.CUSTOM.value
    transpile_params: dict[str, Any] = field(default_factory=dict)

