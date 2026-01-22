import React from 'react';
import { Link } from 'react-router-dom';

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
                        <li><a href="#circuit-compilation" style={linkStyle}>Circuit Compilation</a></li>
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
                        The Quvis Playground is an interactive environment for visualizing quantum circuits on realistic device topologies.
                        It combines Qiskit's powerful compilation engine with a real-time 3D rendering system.
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
                    <h1 style={h1Style}>Circuit Compilation</h1>
                    <p style={pStyle}>
                        Quvis uses a client-server architecture to ensure accurate circuit synthesis.
                    </p>
                    <h3 style={h3Style}>The Process</h3>
                    <ol style={contentListStyle}>
                        <li>Your parameters are sent to the **Python Backend**.</li>
                        <li>The backend uses **Qiskit** to generate the logical circuit.</li>
                        <li>The transpiler maps this logical circuit to the selected physical **Topology**.</li>
                        <li>Wait/SWAP gates are inserted to respect connectivity constraints.</li>
                        <li>The final "compiled" circuit is returned to the frontend for rendering.</li>
                    </ol>
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
