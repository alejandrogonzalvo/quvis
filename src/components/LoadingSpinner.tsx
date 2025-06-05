import React from "react";

const loadingSpinnerStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    border: "8px solid #f3f3f3" /* Light grey */,
    borderTop: "8px solid #3498db" /* Blue */,
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    animation: "spin 1s linear infinite",
    zIndex: 20000, // Ensure it's above other content
};

const keyframesStyle = `
@keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
}
`;

const LoadingSpinner: React.FC = () => {
    return (
        <>
            <style>{keyframesStyle}</style>
            <div style={loadingSpinnerStyle}></div>
        </>
    );
};

export default LoadingSpinner;
