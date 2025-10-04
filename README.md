[![PyPI version](https://img.shields.io/pypi/v/quvis.svg)](https://pypi.org/project/quvis/)
[![Python Version](https://img.shields.io/pypi/pyversions/quvis)](https://pypi.org/project/quvis/)
[![Downloads](https://img.shields.io/pypi/dm/quvis.svg)](https://pypi.org/project/quvis/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Type checked: mypy](https://img.shields.io/badge/type%20checked-mypy-blue.svg)](https://mypy-lang.org/)
[![Tests](https://img.shields.io/github/actions/workflow/status/alejandrogonzalvo/quvis/tests.yml?branch=main&label=tests)](https://github.com/alejandrogonzalvo/quvis/actions)

# Quvis - Quantum Circuit Visualization Platform

Quvis is a quantum circuit visualization platform that provides interactive 3D visualization of logical and compiled circuits.

## 🚀 Quick Start

### Interactive Playground (Web App)

Run the interactive web playground locally:

```bash
git clone https://github.com/alejandrogonzalvo/quvis-web.git
cd quvis-web
pip install poetry
poetry install
npm install

# Option 1: Start both backend and frontend automatically
./scripts/start-dev.sh

# Option 2: Start manually (2 terminals)
# Terminal 1: FastAPI backend
./scripts/start-backend.sh
# Terminal 2: Vite frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Installation

### Option 1: Install from PyPI (Recommended)

```bash
# Install the latest stable version
pip install quvis
```

### Option 2: Install from Source (Development)

```bash
# Clone the repository
git clone https://github.com/your-repo/quvis.git
cd quvis

# Install in development mode
pip install -e .

# Or using Poetry
poetry install
```

### Prerequisites

- Python 3.12+
- Node.js 16+ (for web interface)
- npm or yarn (for frontend dependencies)

### Running Examples

After installation, you can run the examples directly:

```bash
# Run the main examples
python examples/library_usage.py

```

## **Usage**

### Basic Usage

```python
from quvis import Visualizer
from qiskit import QuantumCircuit

# Create visualizer
quvis = Visualizer()

# Add any quantum circuit
circuit = QuantumCircuit(4)
circuit.h(0)
circuit.cx(0, 1)
circuit.cx(1, 2)
circuit.cx(2, 3)

# Add and visualize - opens your browser with interactive 3D view!
quvis.add_circuit(circuit, algorithm_name="Bell State Chain")
quvis.visualize()
```

### Multi-Circuit Comparison

```python
from quvis import Visualizer
from qiskit.circuit.library import QFT
from qiskit import transpile

quvis = Visualizer()

# Add logical circuit
logical_qft = QFT(4)
quvis.add_circuit(logical_qft, algorithm_name="QFT (Logical)")

# Add compiled circuit with hardware constraints
coupling_map = [[0, 1], [1, 2], [2, 3]]
compiled_qft = transpile(logical_qft, coupling_map=coupling_map, optimization_level=2)
quvis.add_circuit(
    compiled_qft,
    coupling_map={"coupling_map": coupling_map, "num_qubits": 4, "topology_type": "line"},
    algorithm_name="QFT (Compiled)"
)

# Visualize both circuits with tabs - logical (green) vs compiled (orange)
quvis.visualize()
```

## 🤝 **Contributing**

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 **License**

This project is licensed under the MIT License.
