import React from "react";
import { colors } from "../theme/colors.js";

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
            ? `1px solid ${colors.primary.main}`
            : `1px solid ${colors.border.light}`,
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: isActive
            ? colors.primary.main
            : colors.interactive.button.background,
        color: colors.text.primary,
        fontWeight: isActive ? "bold" : "normal",
        opacity: disabled ? 0.5 : 1,
    });

    const containerStyle: React.CSSProperties = {
        position: "fixed",
        top: "15px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        backgroundColor: colors.background.panel,
        padding: "8px",
        borderRadius: "8px",
        boxShadow: `0 2px 10px ${colors.shadow.light}`,
        display: "flex",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
    };

    const labelStyle: React.CSSProperties = {
        marginRight: "10px",
        fontWeight: "bold",
        fontSize: "0.9em",
        color: colors.text.primary,
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
