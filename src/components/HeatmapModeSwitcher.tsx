import React from "react";

export type HeatmapMode = "interaction" | "fidelity";

interface HeatmapModeSwitcherProps {
    currentMode: HeatmapMode;
    onModeChange: (mode: HeatmapMode) => void;
    disabled?: boolean;
}

const HeatmapModeSwitcher: React.FC<HeatmapModeSwitcherProps> = ({
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
        color: "white",
        fontWeight: isActive ? "bold" : "normal",
        opacity: disabled ? 0.5 : 1,
    });

    const containerStyle: React.CSSProperties = {
        position: "fixed",
        top: "70px", // Adjusted to not overlap with VisualizationModeSwitcher
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
    };

    const labelStyle: React.CSSProperties = {
        marginRight: "10px",
        fontWeight: "bold",
        fontSize: "0.9em",
        color: "white",
    };

    return (
        <div style={containerStyle}>
            <span style={labelStyle}>Heatmap:</span>
            <button
                style={getButtonStyle(currentMode === "interaction")}
                onClick={() => !disabled && onModeChange("interaction")}
                disabled={disabled}
            >
                Interaction
            </button>
            <button
                style={getButtonStyle(currentMode === "fidelity")}
                onClick={() => !disabled && onModeChange("fidelity")}
                disabled={disabled}
            >
                Fidelity
            </button>
        </div>
    );
};

export default HeatmapModeSwitcher;
