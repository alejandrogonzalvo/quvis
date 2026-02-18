"""
Factories for creating quantum circuits and coupling maps.

This module implements the Factory pattern to decouple object creation logic 
from the main application flow.
"""
import math
from collections.abc import Callable
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit.transpiler import CouplingMap

from .enums import AlgorithmType, TopologyType
from .config import CircuitGenerationConfig

class CircuitFactory:
    """Factory for creating quantum circuits based on AlgorithmType."""

    _creators: dict[AlgorithmType, Callable[[CircuitGenerationConfig], QuantumCircuit]] = {}

    @classmethod
    def register(cls, algorithm_type: AlgorithmType, creator: Callable[[CircuitGenerationConfig], QuantumCircuit]):
        """Register a new circuit creator."""
        cls._creators[algorithm_type] = creator

    @classmethod
    def create(cls, config: CircuitGenerationConfig) -> QuantumCircuit:
        """Create a quantum circuit from configuration."""
        creator = cls._creators.get(config.algorithm)
        if not creator:
             raise ValueError(f"Unsupported algorithm: {config.algorithm}")
        return creator(config)

def _create_qft(config: CircuitGenerationConfig) -> QuantumCircuit:
    return QFT(num_qubits=config.num_qubits, do_swaps=True, name=f"QFT-{config.num_qubits}")

def _create_ghz(config: CircuitGenerationConfig) -> QuantumCircuit:
    circuit = QuantumCircuit(config.num_qubits, name=f"GHZ-{config.num_qubits}")
    circuit.h(0)
    for i in range(1, config.num_qubits):
        circuit.cx(0, i)
    return circuit

def _create_qaoa(config: CircuitGenerationConfig) -> QuantumCircuit:
    reps = config.algorithm_params.get("reps", 2)
    circuit = QuantumCircuit(config.num_qubits, name=f"QAOA-{config.num_qubits}-p{reps}")

    for _ in range(reps):
        # Problem layer (ZZ interactions)
        for i in range(config.num_qubits - 1):
            circuit.rzz(0.5, i, i + 1)

        # Mixer layer (X rotations)
        for i in range(config.num_qubits):
            circuit.rx(0.3, i)

    return circuit

# Register default algorithms
CircuitFactory.register(AlgorithmType.QFT, _create_qft)
CircuitFactory.register(AlgorithmType.GHZ, _create_ghz)
CircuitFactory.register(AlgorithmType.QAOA, _create_qaoa)


class TopologyFactory:
    """Factory for creating coupling maps based on TopologyType."""

    _creators: dict[TopologyType, Callable[[int], CouplingMap]] = {}

    @classmethod
    def register(cls, topology_type: TopologyType, creator: Callable[[int], CouplingMap]):
        """Register a new topology creator."""
        cls._creators[topology_type] = creator

    @classmethod
    def create(cls, topology: TopologyType, physical_qubits: int) -> CouplingMap:
        """Create a coupling map."""
        creator = cls._creators.get(topology)
        if not creator:
            raise ValueError(f"Unsupported topology: {topology}")
        return creator(physical_qubits)

def _create_grid(physical_qubits: int) -> CouplingMap:
    n = int(physical_qubits**0.5)
    if n * n < physical_qubits:
        n += 1
    return CouplingMap.from_grid(n, n)

def _create_heavy_hex(physical_qubits: int) -> CouplingMap:
    distance = math.ceil((2 + math.sqrt(24 + 40 * physical_qubits)) / 10)
    if distance % 2 == 0:
        distance += 1
    return CouplingMap.from_heavy_hex(distance)

def _create_heavy_square(physical_qubits: int) -> CouplingMap:
    distance = math.ceil((1 + math.sqrt(1 + 3 * physical_qubits)) / 3)
    if distance % 2 == 0:
        distance += 1
    return CouplingMap.from_heavy_square(distance)

def _create_hexagonal(physical_qubits: int) -> CouplingMap:
    rows = max(2, int((physical_qubits / 2) ** 0.5))
    cols = max(2, physical_qubits // rows)
    return CouplingMap.from_hexagonal_lattice(rows, cols)

# Register default topologies
TopologyFactory.register(TopologyType.LINE, CouplingMap.from_line)
TopologyFactory.register(TopologyType.RING, CouplingMap.from_ring)
TopologyFactory.register(TopologyType.GRID, _create_grid)
TopologyFactory.register(TopologyType.HEAVY_HEX, _create_heavy_hex)
TopologyFactory.register(TopologyType.HEAVY_SQUARE, _create_heavy_square)
TopologyFactory.register(TopologyType.HEXAGONAL, _create_hexagonal)
TopologyFactory.register(TopologyType.FULL, CouplingMap.from_full)
