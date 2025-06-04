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
    const buttonStyle = (isActive: boolean) => ({
        padding: "8px 12px",
        margin: "0 5px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: isActive
            ? "#007bff"
            : disabled
              ? "#e9ecef"
              : "#f8f9fa",
        color: isActive ? "white" : disabled ? "#6c757d" : "black",
        fontWeight: isActive ? "bold" : "normal",
        opacity: disabled ? 0.65 : 1,
    });

    return (
        <div
            style={{
                position: "fixed",
                top: "15px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1001, // Ensure it's above other elements like tooltips or control panels
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                padding: "8px",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
            }}
        >
            <span
                style={{
                    marginRight: "10px",
                    fontWeight: "bold",
                    fontSize: "0.9em",
                    color: "#333",
                }}
            >
                View Mode:
            </span>
            <button
                style={buttonStyle(currentMode === "logical")}
                onClick={() => !disabled && onModeChange("logical")}
                disabled={disabled}
            >
                Logical
            </button>
            <button
                style={buttonStyle(currentMode === "compiled")}
                onClick={() => !disabled && onModeChange("compiled")}
                disabled={disabled}
            >
                Compiled
            </button>
        </div>
    );
};

export default VisualizationModeSwitcher;
