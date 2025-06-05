import React, { useState, useEffect, useCallback } from "react";
import { Playground } from "../Playground.js"; // Adjusted path with .js extension

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
        background: "rgba(40, 40, 40, 0.9)",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        width: "250px",
        fontFamily: "'Roboto', sans-serif",
        fontSize: "0.9em",
        zIndex: 10,
        transition: "height 0.3s ease, padding 0.3s ease, max-height 0.3s ease",
        overflow: "hidden",
    };

    const headerStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        marginBottom: isCollapsed ? "0" : "10px",
    };

    const contentStyle: React.CSSProperties = {
        maxHeight: isCollapsed ? "0" : "500px",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
        opacity: isCollapsed ? 0 : 1,
    };
    const controlGroupStyle: React.CSSProperties = {
        marginBottom: "15px",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: "3px",
        fontSize: "0.95em",
    };

    const sliderStyle: React.CSSProperties = {
        width: "100%",
        cursor: "pointer",
    };

    return (
        <div style={panelStyle}>
            <div style={headerStyle} onClick={onToggleCollapse}>
                <span>Fidelity Controls</span>
                <span>{isCollapsed ? "▶" : "▼"}</span>
            </div>
            <div style={contentStyle}>
                <div style={controlGroupStyle}>
                    <label htmlFor="oneQubitFidelity" style={labelStyle}>
                        1-Qubit Gate Fidelity: {oneQubitFidelity.toFixed(3)}
                    </label>
                    <input
                        type="range"
                        id="oneQubitFidelity"
                        min="0.900"
                        max="1.000"
                        step="0.001"
                        value={oneQubitFidelity}
                        onChange={handleOneQubitFidelityChange}
                        style={sliderStyle}
                        disabled={!playground}
                    />
                </div>

                <div style={controlGroupStyle}>
                    <label htmlFor="twoQubitFidelity" style={labelStyle}>
                        2-Qubit Gate Fidelity: {twoQubitFidelity.toFixed(3)}
                    </label>
                    <input
                        type="range"
                        id="twoQubitFidelity"
                        min="0.900"
                        max="1.000"
                        step="0.001"
                        value={twoQubitFidelity}
                        onChange={handleTwoQubitFidelityChange}
                        style={sliderStyle}
                        disabled={!playground}
                    />
                </div>
            </div>
        </div>
    );
};

export default FidelityControls;
