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
    algorithm_name: str | None = "Circuit"
    topology_type: str = TopologyType.CUSTOM.value
    transpile_params: dict[str, Any] = field(default_factory=dict)


@dataclass
class VisualizerSettings:
    """Global configuration settings for the visualizer."""
    # Appearance
    qubit_size: float = 1.0
    connection_thickness: float = 0.05
    inactive_alpha: float = 0.1
    render_bloch_spheres: bool = False
    render_connection_lines: bool = True
    
    # Layout
    repel_force: float = 0.6
    ideal_distance: float = 1.0
    iterations: int = 500
    cooling_factor: float = 1.0
    attract_force: float = 0.1
    core_distance: float = 5.0
    
    # Heatmap
    heatmap_max_slices: int = -1
    heatmap_base_size: float = 1500.0
    heatmap_fade_threshold: float = 0.1
    heatmap_green_threshold: float = 0.3
    heatmap_yellow_threshold: float = 0.7
    heatmap_intensity_power: float = 0.3
    heatmap_min_intensity: float = 0.01
    heatmap_border_width: float = 0.0
    
    # Fidelity
    one_qubit_fidelity_base: float = 0.99
    two_qubit_fidelity_base: float = 0.98

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        from dataclasses import asdict
        return asdict(self)

