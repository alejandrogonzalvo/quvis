import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../theme/colors.js';

const LandingPage: React.FC = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a10',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            position: 'relative',
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
                    opacity: 0.4,
                }}
            >
                <source src="/quvis-summary-optimized.mp4" type="video/mp4" />
            </video>

            {/* Overlay to ensure text readability */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(10, 10, 16, 0.7)',
                zIndex: 1,
            }} />

            {/* Navbar */}
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '2rem 4rem',
                position: 'relative',
                zIndex: 10,
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Quvis
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <a href="https://github.com/alejandrogonzalvo/quvis" target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                    <Link to="/docs" style={linkStyle}>
                        Docs
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80vh',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10,
                padding: '0 1rem',
            }}>
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.9rem',
                    color: '#a1a1aa',
                }}>
                    v0.27.2 is now available
                </div>

                <h1 style={{
                    fontSize: '5rem',
                    fontWeight: 800,
                    marginBottom: '1.5rem',
                    lineHeight: 1.1,
                    background: 'linear-gradient(to right, #fff, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    maxWidth: '800px',
                }}>
                    Interactive Quantum Visualization
                </h1>

                <p style={{
                    fontSize: '1.25rem',
                    color: '#a1a1aa',
                    maxWidth: '600px',
                    marginBottom: '3rem',
                    lineHeight: 1.6,
                }}>
                    Visualize quantum circuits with real-time 3D rendering.
                    Explore QFT, QAOA, and more with our interactive playground.
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <Link to="/playground" style={primaryButtonStyle}>
                        Enter Playground
                        <span style={{ marginLeft: '0.5rem' }}>→</span>
                    </Link>
                    <a href="https://github.com/alejandrogonzalvo/quvis" target="_blank" rel="noopener noreferrer" style={secondaryButtonStyle}>
                        Star on GitHub
                    </a>
                </div>

                {/* Feature Grid Mini-Preview */}
                <div style={{
                    marginTop: '5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2rem',
                    maxWidth: '1000px',
                    width: '100%',
                    opacity: 0.8,
                }}>
                    <FeatureCard title="3D Visualization" description="Interactive Bloch spheres and gate operations in 3D space." />
                    <FeatureCard title="Real-time Compilation" description="Powered by Qiskit for accurate circuit synthesis and transpilation." />
                    <FeatureCard title="Hardware Aware" description="Visualize mapping and routing on realistic device topologies." />
                </div>
            </main>
        </div>
    );
};

const linkStyle: React.CSSProperties = {
    color: '#a1a1aa',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    cursor: 'pointer', // Ensure it looks clickable
};

const primaryButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderRadius: '0.5rem',
    background: '#7c3aed',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
    transition: 'background 0.2s, transform 0.2s',
    border: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderRadius: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
    transition: 'background 0.2s',
};

const FeatureCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div style={{
        padding: '1.5rem',
        borderRadius: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'left',
    }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{title}</h3>
        <p style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: 1.5 }}>{description}</p>
    </div>
);

export default LandingPage;
