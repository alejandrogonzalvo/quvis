import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../theme/colors.js';
import CodeBlock from '../components/CodeBlock.js';


const LandingPage: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a10',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflowX: 'hidden',
        }}>
            {/* Navbar */}
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem 4rem',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                backdropFilter: scrolled ? 'blur(10px)' : 'none',
                backgroundColor: scrolled ? 'rgba(10, 10, 16, 0.8)' : 'transparent',
                borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                transition: 'all 0.3s ease',
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/logo.png" alt="Quvis Logo" style={{ width: '32px', height: '32px' }} />
                    Quvis
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <a href="https://github.com/alejandrogonzalvo/quvis" target="_blank" rel="noopener noreferrer" style={navLinkStyle}>
                        GitHub
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                    <Link to="/docs" style={navLinkStyle}>
                        Documentation
                    </Link>
                    <Link to="/playground" style={smallButtonStyle}>
                        Playground
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header style={{
                position: 'relative',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}>
                {/* Video Background */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 0,
                        opacity: 0.3,
                    }}
                >
                    <source src="/quvis-summary-optimized.mp4" type="video/mp4" />
                </video>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(10,10,16,0.3), #0a0a10)',
                    zIndex: 1,
                }} />

                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 1rem', maxWidth: '900px' }}>
                    <a href="https://github.com/alejandrogonzalvo/quvis/releases" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            display: 'inline-block',
                            marginBottom: '1.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '2rem',
                            background: 'rgba(124, 58, 237, 0.1)',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            fontSize: '0.9rem',
                            color: '#e4e4e7',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}>
                            v0.27.2 is now available
                        </div>
                    </a>

                    <h1 style={{
                        fontSize: '5rem',
                        fontWeight: 800,
                        marginBottom: '1.5rem',
                        lineHeight: 1.1,
                        background: 'linear-gradient(to bottom right, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.03em',
                    }}>
                        Quvis
                    </h1>

                    <p style={{
                        fontSize: '1.5rem',
                        color: '#a1a1aa',
                        marginBottom: '3rem',
                        lineHeight: 1.6,
                        maxWidth: '800px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}>
                        Visualisation Framework for Large-Scale Quantum Circuits
                    </p>

                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                        <Link to="/playground" style={primaryButtonStyle}>
                            Enter Playground
                        </Link>
                        <a href="https://github.com/alejandrogonzalvo/quvis" target="_blank" rel="noopener noreferrer" style={secondaryButtonStyle}>
                            View on GitHub
                        </a>
                    </div>
                </div>
            </header>

            {/* Feature 1: Dual Nature */}
            <FeatureSection
                title="The Dual Nature of Execution"
                subtitle="Logical vs. Physical"
                description="Understand the cost of reality. Compare your clean logical circuits against their compiled counterparts running on specific device topologies."
                reversed={false}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '100%' }}>
                    <PlaceholderImage label="Logical View" color="rgba(59, 130, 246, 0.1)" />
                    <PlaceholderImage label="Compiled View (SWAPs)" color="rgba(239, 68, 68, 0.1)" />
                </div>
            </FeatureSection>

            {/* Feature 2: Qiskit Integration */}
            <FeatureSection
                title="Powered by Qiskit"
                subtitle="Industry Standard Backend"
                description="Quvis leverages Qiskit for robust transpilation. Configure optimization levels and layout methods directly from the interface."
                reversed={true}
            >
                <CodeBlock code={`from qiskit import QuantumCircuit, transpile
from quvis import Visualizer

# 1. Define your circuit in Qiskit
circuit = QuantumCircuit(4)
circuit.h(0)
circuit.cx(0, 1)

# 2. Compile for a specific topology
# e.g., Linear: 0-1-2-3
compiled = transpile(
    circuit, 
    coupling_map=[[0,1], [1,2], [2,3]]
)

# 3. Visualize the comparison
quvis = Visualizer()
quvis.add_circuit(circuit, "Logical")
quvis.add_circuit(compiled, "Compiled")
quvis.visualize()`} language="python" />
            </FeatureSection>

            {/* Feature 3: Spatio-Temporal */}
            <FeatureSection
                title="Spatio-Temporal Insight"
                subtitle="4D Analysis"
                description="Navigate through time. Scrub through circuit execution slice-by-slice to identify congestion and crosstalk on the physical chip."
                reversed={false}
            >
                <PlaceholderImage label="Timeline & 3D Visualization" color="rgba(16, 185, 129, 0.1)" />
            </FeatureSection>

            {/* Footer */}
            <footer style={{
                padding: '4rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                textAlign: 'center',
                color: '#52525b',
                marginTop: '4rem',
            }}>
                <p>&copy; 2026 Quvis. Built for the quantum community.</p>
            </footer>
        </div>
    );
};

// --- Components ---

const FeatureSection: React.FC<{
    title: string;
    subtitle: string;
    description: string;
    children: React.ReactNode;
    reversed: boolean;
}> = ({ title, subtitle, description, children, reversed }) => (
    <section style={{
        padding: '6rem 4rem',
        display: 'flex',
        flexDirection: reversed ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: '4rem',
        maxWidth: '1200px',
        margin: '0 auto',
    }}>
        <div style={{ flex: 1 }}>
            <div style={{
                color: '#7c3aed',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                fontSize: '0.9rem',
            }}>
                {subtitle}
            </div>
            <h2 style={{
                fontSize: '3rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                lineHeight: 1.1,
            }}>
                {title}
            </h2>
            <p style={{
                fontSize: '1.125rem',
                color: '#a1a1aa',
                lineHeight: 1.6,
            }}>
                {description}
            </p>
        </div>
        <div style={{
            flex: 1.2,
            height: '400px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            overflow: 'hidden',
        }}>
            {children}
        </div>
    </section>
);



const PlaceholderImage: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: '1.1rem',
        textAlign: 'center',
        padding: '1rem',
    }}>
        [PLACEHOLDER]
        <br />
        {label}
    </div>
);

// --- Styles ---

const navLinkStyle: React.CSSProperties = {
    color: '#a1a1aa',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'background 0.2s',
};

const primaryButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1rem 2.5rem',
    borderRadius: '2rem',
    background: '#7c3aed',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
    transition: 'transform 0.2s',
};

const secondaryButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1rem 2.5rem',
    borderRadius: '2rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
    transition: 'background 0.2s',
};

export default LandingPage;
