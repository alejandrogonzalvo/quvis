import React from "react";
import "./LoadingIndicator.css";

interface LoadingIndicatorProps {
    stage?: string;
    progress?: string[];
    algorithm?: string;
    numQubits?: number;
    topology?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
    stage = "Loading",
    progress = [],
    algorithm,
    numQubits,
    topology
}) => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            
            <div className="loading-content">
                <div className="loading-stage">{stage}...</div>
                
                {(algorithm || numQubits || topology) && (
                    <div className="loading-info">
                        {algorithm && <span className="circuit-info">Circuit: {algorithm.toUpperCase()}</span>}
                        {numQubits && <span className="circuit-info">Qubits: {numQubits}</span>}
                        {topology && <span className="circuit-info">Topology: {topology.replace('_', ' ')}</span>}
                    </div>
                )}
                
                {progress.length > 0 && (
                    <div className="loading-progress">
                        {progress.map((step, index) => (
                            <div key={index} className="progress-step">
                                <span className="progress-indicator">✓</span>
                                <span className="progress-text">{step}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingIndicator;
