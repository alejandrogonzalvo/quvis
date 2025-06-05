import React from "react";

interface VisualizationModeSwitcherProps {
    currentMode: "compiled" | "logical";
    onModeChange: (mode: "compiled" | "logical") => void;
    disabled?: boolean; // Optional prop to disable the switcher
}

const VisualizationModeSwitcher: React.FC<VisualizationModeSwitcherProps> = ({
    currentMode,
    onModeChange,
    disabled = false,
}) => {
    const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
        padding: "8px 12px",
        margin: "0 5px",
        border: isActive
            ? "1px solid #007bff"
            : "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: isActive ? "#007bff" : "rgba(255, 255, 255, 0.1)",
        color: "white", // Always white text for buttons
        fontWeight: isActive ? "bold" : "normal",
        opacity: disabled ? 0.5 : 1, // Dimmed when component is disabled
    });

    const containerStyle: React.CSSProperties = {
        position: "fixed",
        top: "15px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        backgroundColor: "rgba(50, 50, 50, 0.8)", // Dark panel background
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)", // Consistent shadow
        display: "flex",
        alignItems: "center",
        fontFamily: "Arial, sans-serif", // Consistent font
    };

    const labelStyle: React.CSSProperties = {
        marginRight: "10px",
        fontWeight: "bold",
        fontSize: "0.9em",
        color: "white", // White text for label
    };

    return (
        <div style={containerStyle}>
            <span style={labelStyle}>View Mode:</span>
            <button
                style={getButtonStyle(currentMode === "logical")}
                onClick={() => !disabled && onModeChange("logical")}
                disabled={disabled} // HTML disabled attribute handles interaction blocking
            >
                Logical
            </button>
            <button
                style={getButtonStyle(currentMode === "compiled")}
                onClick={() => !disabled && onModeChange("compiled")}
                disabled={disabled} // HTML disabled attribute handles interaction blocking
            >
                Compiled
            </button>
        </div>
    );
};

export default VisualizationModeSwitcher;
