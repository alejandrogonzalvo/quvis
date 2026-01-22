import React from 'react';
import { Link } from 'react-router-dom';
import CodeBlock from '../components/CodeBlock.js';

const DocsPage: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: '#0a0a10',
            color: '#e4e4e7',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Sidebar */}
            <aside style={{
                width: '280px',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                position: 'fixed',
                height: '100vh',
                overflowY: 'auto',
                backgroundColor: '#0a0a10',
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <Link to="/" style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#fff',
                        textDecoration: 'none',
                        letterSpacing: '-0.02em'
                    }}>
                        Quvis Docs
                    </Link>
                </div>

                <nav>
                    <SectionHeader title="Getting Started" />
                    <ul style={listStyle}>
                        <li><a href="#playground-guide" style={linkStyle}>Playground Guide</a></li>
                        <li><a href="#circuit-parameters" style={linkStyle}>Circuit Parameters</a></li>
                        <li><a href="#visualization-controls" style={linkStyle}>Visualization Controls</a></li>
                    </ul>

                    <SectionHeader title="Architecture" />
                    <ul style={listStyle}>
                        <li><a href="#circuit-compilation" style={linkStyle}>Integration with Qiskit</a></li>
                        <li><a href="#topology-mapping" style={linkStyle}>Topology Mapping</a></li>
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{
                marginLeft: '280px',
                padding: '4rem 6rem',
                maxWidth: '900px',
                width: '100%',
                lineHeight: 1.7,
            }}>
                <section id="playground-guide" style={{ marginBottom: '4rem' }}>
                    <h1 style={h1Style}>Playground Guide</h1>
                    <p style={pStyle}>
                        The Quvis Playground is an interactive environment designed to bridge the transparency gap in quantum compilation.
                        It clarifies complex quantum behavior for learners while offering qualitative analysis tools for researchers.
                    </p>
                </section>

                <section id="dual-nature" style={{ marginBottom: '4rem' }}>
                    <h2 style={h2Style}>The Dual Nature of Quvis</h2>
                    <p style={pStyle}>
                        Quvis is built on the philosophy that understanding quantum algorithms requires visibility into both their
                        theoretical structure and their physical implementation.
                    </p>

                    <h3 style={h3Style}>Logical vs. Compiled Views</h3>
                    <p style={pStyle}>
                        The tool provides two distinct yet interconnected views of the same circuit:
                    </p>
                    <ul style={contentListStyle}>
                        <li>
                            <strong>Logical View:</strong> Visualizes the algorithm as designed. This hardware-agnostic representation
                            reveals the intrinsic data dependencies and structure of the algorithm, effectively showing "what you want to compute".
                        </li>
                        <li>
                            <strong>Compiled View:</strong> Visualizes the algorithm as it runs on the machine. This hardware-aware view
                            exposes the reality of NISQ devices, showing the SWAP gates and routing overhead required to map the
                            logical qubits onto a restricted physical topology (e.g., Grid, Heavy Hex).
                        </li>
                    </ul>
                    <p style={pStyle}>
                        By comparing these views, users can directly observe the cost of compilation and the impact of hardware constraints
                        on algorithm efficiency.
                    </p>
                </section>

                <section id="circuit-parameters" style={{ marginBottom: '4rem' }}>
                    <h2 style={h2Style}>Circuit Parameters</h2>
                    <p style={pStyle}>
                        When generating a circuit, you can configure the following parameters:
                    </p>
                    <ul style={contentListStyle}>
                        <li><strong>Algorithm:</strong> Choose from presets like QFT (Quantum Fourier Transform), QAOA, or GHZ states.</li>
                        <li><strong>Qubits:</strong> The number of logical qubits in your circuit.</li>
                        <li><strong>Topology:</strong> The physical layout of the quantum processor (e.g., Grid, Ring, Heavy Hex).</li>
                        <li><strong>Optimization Level:</strong> Controls how aggressively Qiskit optimizes the circuit (0-3).</li>
                    </ul>
                </section>

                <section id="visualization-controls" style={{ marginBottom: '4rem' }}>
                    <h2 style={h2Style}>Visualization Controls</h2>
                    <p style={pStyle}>
                        Once generated, you can inspect the circuit using the 3D view:
                    </p>
                    <ul style={contentListStyle}>
                        <li><strong>Timeline:</strong> Scrub through the circuit execution slice-by-slice.</li>
                        <li><strong>Camera:</strong> Left-click to rotate, right-click to pan, scroll to zoom. Press '0' to reset.</li>
                        <li><strong>Layers:</strong> Toggle Connection Lines or Bloch Spheres for clearer views.</li>
                        <li><strong>Heatmap:</strong> Visualize gate density or error rates across the device.</li>
                    </ul>
                </section>

                <hr style={{ border: 0, borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '4rem 0' }} />

                <section id="circuit-compilation" style={{ marginBottom: '4rem' }}>
                    <h1 style={h1Style}>Integration with Qiskit</h1>
                    <p style={pStyle}>
                        Quvis is designed to work seamlessly with <a href="https://qiskit.org" style={{ color: '#a78bfa', textDecoration: 'none' }}>Qiskit</a>,
                        IBM's open-source framework for quantum computing. It acts as a visualization backend that can be inserted directly into your experimentation workflow.
                    </p>

                    <h3 style={h3Style}>How it Intertwines</h3>
                    <p style={pStyle}>
                        The core philosophy is simple: <strong>Define in Qiskit, Visualize in Quvis.</strong>
                        You don't need to learn a new circuit definition language. You continue to use `QuantumCircuit` and `transpile` from Qiskit,
                        and pass the results to the Quvis `Visualizer`.
                    </p>

                    <h3 style={h3Style}>Compiling Circuits</h3>
                    <p style={pStyle}>
                        Compilation (or transpilation) is the process of mapping a high-level quantum circuit to a specific customized physical device.
                        Quvis allows you to visualize this process by accepting both the "logical" (pre-compilation) and "physical" (post-compilation) circuits side-by-side.
                    </p>

                    <CodeBlock code={`from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT
from quvis import Visualizer

# 1. Create your Logical Circuit using standard Qiskit
qft = QFT(4)

# 2. Initiate the Quvis Visualizer
quvis = Visualizer()
quvis.add_circuit(qft, algorithm_name="QFT (Logical)")

# 3. Define the Physical Constraints (Topology)
# Example: A linear line of qubits [0]--[1]--[2]--[3]
coupling_map = [[0, 1], [1, 2], [2, 3]]

# 4. Compile the circuit using Qiskit's transpiler
compiled_qft = transpile(qft, coupling_map=coupling_map, optimization_level=2)

# 5. Add the Compiled Circuit to Quvis
# We pass the topology metadata so Quvis can render the device correctly
quvis.add_circuit(
    compiled_qft,
    coupling_map={
        "coupling_map": coupling_map,
        "num_qubits": 4,
        "topology_type": "line"
    },
    algorithm_name="QFT (Compiled)"
)

# 6. Launch the Visualization
quvis.visualize()`} language="python" />

                    <p style={pStyle}><br />
                        In the code above, `transpile()` handles the heavy lifting of inserting SWAP gates to satisfy the linear topology.
                        Quvis then takes this compiled artifact and renders it in 3D, showing exactly where those overhead operations were placed.
                    </p>
                </section>

                <section id="topology-mapping" style={{ marginBottom: '4rem' }}>
                    <h2 style={h2Style}>Topology Mapping</h2>
                    <p style={pStyle}>
                        A key feature of Quvis is visualizing the "Routing Overhead". When you run a logical circuit on physical hardware,
                        qubits are not fully connected. The compiler must insert SWAP gates to move information between non-adjacent qubits.
                    </p>
                    <p style={pStyle}>
                        In the playground, you will often see extra gates appear in the "Compiled" view compared to the "Logical" view.
                        These represent the cost of running algorithms on simpler topologies like a **Line** or **Ring**.
                    </p>
                </section>
            </main>
        </div>
    );
};

// Styles
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div style={{
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#a1a1aa',
        marginBottom: '1rem',
        marginTop: '2rem',
        fontWeight: 600,
    }}>
        {title}
    </div>
);

const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
};

const linkStyle: React.CSSProperties = {
    display: 'block',
    padding: '0.5rem 0',
    color: '#e4e4e7',
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
} as any;

const contentListStyle: React.CSSProperties = {
    paddingLeft: '1.5rem',
    marginBottom: '1.5rem',
    color: '#d4d4d8',
};

const h1Style: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    letterSpacing: '-0.02em',
    color: '#fff',
};

const h2Style: React.CSSProperties = {
    fontSize: '1.8rem',
    fontWeight: 600,
    marginTop: '3rem',
    marginBottom: '1rem',
    color: '#fff',
};

const h3Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginTop: '2rem',
    marginBottom: '0.75rem',
    color: '#fff',
};

const pStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    fontSize: '1.1rem',
    color: '#d4d4d8',
};

export default DocsPage;
