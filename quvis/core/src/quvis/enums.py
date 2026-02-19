"""
Enums for Quvis.

This module defines standard enums used across the application to avoid magic strings.
"""
from enum import Enum

class AlgorithmType(str, Enum):
    """Supported quantum algorithms."""
    QFT = "qft"
    QAOA = "qaoa"
    GHZ = "ghz"

class TopologyType(str, Enum):
    """Supported device topologies."""
    LINE = "line"
    RING = "ring"
    GRID = "grid"
    HEAVY_HEX = "heavy_hex"
    HEAVY_SQUARE = "heavy_square"
    HEXAGONAL = "hexagonal"
    FULL = "full"
    CUSTOM = "custom"
