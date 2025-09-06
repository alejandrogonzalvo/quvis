import React, { useState, useEffect, useCallback } from "react";
import type { Playground } from "../../scene/Playground.js";
import { colors } from "../theme/colors.js";

interface FidelityControlsProps {
    playground: Playground | null;
    initialValues: {
        oneQubitBase: number;
        twoQubitBase: number;
    };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    topPosition: string;
}

const FidelityControls: React.FC<FidelityControlsProps> = ({
    playground,
    initialValues,
    isCollapsed,
    onToggleCollapse,
    topPosition,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [oneQubitFidelity, setOneQubitFidelity] = useState(
        initialValues.oneQubitBase,
    );
    const [twoQubitFidelity, setTwoQubitFidelity] = useState(
        initialValues.twoQubitBase,
    );

    useEffect(() => {
        setOneQubitFidelity(initialValues.oneQubitBase);
        setTwoQubitFidelity(initialValues.twoQubitBase);
    }, [initialValues]);

    const handleOneQubitFidelityChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(event.target.value);
            setOneQubitFidelity(value);
            if (playground) {
                playground.updateFidelityParameters({ oneQubitBase: value });
            }
        },
        [playground],
    );

    const handleTwoQubitFidelityChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(event.target.value);
            setTwoQubitFidelity(value);
            if (playground) {
                playground.updateFidelityParameters({ twoQubitBase: value });
            }
        },
        [playground],
    );

    const panelStyle: React.CSSProperties = {
        position: "fixed",
        top: topPosition,
        left: "20px",
        background: colors.background.panelAlt,
        color: colors.text.primary,
        padding: "15px",
        borderRadius: "8px",
        width: "280px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "0.9em",
        zIndex: 10,
        boxShadow: `0 2px 10px ${colors.shadow.light}`,
        transition: "all 0.3s ease",
        overflow: "hidden",
    };

    const headerStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        transition: "background-color 0.2s ease",
        borderBottom: `1px solid ${colors.border.separator}`,
        paddingBottom: "10px",
        marginBottom: "0",
    };

    const headerHoverStyle: React.CSSProperties = {
        backgroundColor: colors.ui.surface,
    };

    const headerTitleStyle: React.CSSProperties = {
        margin: "0",
        fontSize: "14px",
        fontWeight: 600,
        color: colors.text.primary,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    };

    const toggleIconStyle: React.CSSProperties = {
        fontSize: "12px",
        color: colors.text.secondary,
        fontWeight: 600,
        transition: "transform 0.3s ease, color 0.2s ease",
        width: "16px",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
    };

    const contentStyle: React.CSSProperties = {
        opacity: 1,
        maxHeight: "300px",
        overflow: "hidden",
        transition: "all 0.3s ease",
        marginTop: "20px",
    };

    const collapsedContentStyle: React.CSSProperties = {
        opacity: 0,
        maxHeight: "0",
        overflow: "hidden",
        transition: "all 0.3s ease",
        marginTop: "0",
    };

    const controlGroupStyle: React.CSSProperties = {
        marginBottom: "15px",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: "8px",
        fontWeight: 500,
        color: colors.text.primary,
    };

    const sliderContainerStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
    };

    const sliderStyle: React.CSSProperties = {
        flex: 1,
        marginRight: "10px",
        cursor: "pointer",
    };

    const valueStyle: React.CSSProperties = {
        minWidth: "40px",
        textAlign: "right",
        fontWeight: 600,
        color: colors.text.primary,
    };

    return (
        <div style={panelStyle}>
            <div
                style={{
                    ...headerStyle,
                    ...(isHovered ? headerHoverStyle : {})
                }}
                onClick={onToggleCollapse}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <h4 style={headerTitleStyle}>
                    Fidelity Controls
                </h4>
                <div 
                    style={{
                        ...toggleIconStyle,
                        transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                        color: isHovered ? colors.text.primary : colors.text.secondary,
                    }}
                >
                    ▼
                </div>
            </div>

            <div style={isCollapsed ? collapsedContentStyle : contentStyle}>
                <div style={controlGroupStyle}>
                    <label htmlFor="one-qubit-fidelity" style={labelStyle}>
                        One-Qubit Gate Fidelity
                    </label>
                    <div style={sliderContainerStyle}>
                        <input
                            type="range"
                            id="one-qubit-fidelity"
                            min="0.90"
                            max="1.0"
                            step="0.001"
                            value={oneQubitFidelity}
                            onChange={handleOneQubitFidelityChange}
                            style={sliderStyle}
                        />
                        <span style={valueStyle}>
                            {oneQubitFidelity.toFixed(3)}
                        </span>
                    </div>
                </div>

                <div style={controlGroupStyle}>
                    <label htmlFor="two-qubit-fidelity" style={labelStyle}>
                        Two-Qubit Gate Fidelity
                    </label>
                    <div style={sliderContainerStyle}>
                        <input
                            type="range"
                            id="two-qubit-fidelity"
                            min="0.90"
                            max="1.0"
                            step="0.001"
                            value={twoQubitFidelity}
                            onChange={handleTwoQubitFidelityChange}
                            style={sliderStyle}
                        />
                        <span style={valueStyle}>
                            {twoQubitFidelity.toFixed(3)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FidelityControls;
