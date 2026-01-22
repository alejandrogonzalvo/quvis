import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../theme/colors';

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
            {/* Ambient Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
                width: '60vw',
                height: '60vw',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(10, 10, 16, 0) 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 0,
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
                    <a href="https://github.com/alejandrogonzalvo/quvis" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                        GitHub
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                    <a href="/docs/self-hosting-guide.md" style={linkStyle}>
                        Docs
                    </a>
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
    ':hover': {
        color: '#fff',
    } as any,
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
