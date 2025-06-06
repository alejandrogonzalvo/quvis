import React from "react";
import "./LoadingIndicator.css";

const LoadingIndicator: React.FC = () => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <span className="loading-text">Rendering...</span>
        </div>
    );
};

export default LoadingIndicator;
