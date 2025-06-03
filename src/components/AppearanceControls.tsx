import React, { useState, useEffect } from "react";
import { Playground } from "../Playground.js"; // Adjust path as necessary

interface AppearanceControlsProps {
    playground: Playground | null;
    initialValues: {
        qubitSize: number;
        connectionThickness: number;
        inactiveAlpha: number;
    };
}

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    left: "20px",
    backgroundColor: "rgba(50, 50, 50, 0.8)",
    padding: "15px",
    borderRadius: "8px",
    color: "white",
    fontFamily: "Arial, sans-serif",
    zIndex: 10, // Ensure it's above the canvas but potentially below other modals
    width: "280px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
};

const controlGroupStyle: React.CSSProperties = {
    marginBottom: "15px",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontSize: "0.9em",
};

const sliderStyle: React.CSSProperties = {
    width: "100%",
    cursor: "pointer",
};

const valueStyle: React.CSSProperties = {
    marginLeft: "10px",
    fontSize: "0.9em",
};

const AppearanceControls: React.FC<AppearanceControlsProps> = ({
    playground,
    initialValues,
}) => {
    const [qubitSize, setQubitSize] = useState(initialValues.qubitSize);
    const [connectionThickness, setConnectionThickness] = useState(
        initialValues.connectionThickness,
    );
    const [inactiveAlpha, setInactiveAlpha] = useState(
        initialValues.inactiveAlpha,
    );

    useEffect(() => {
        setQubitSize(initialValues.qubitSize);
        setConnectionThickness(initialValues.connectionThickness);
        setInactiveAlpha(initialValues.inactiveAlpha);
    }, [initialValues]);

    const handleQubitSizeChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setQubitSize(value);
        playground?.updateAppearanceParameters({ qubitSize: value });
    };

    const handleConnectionThicknessChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setConnectionThickness(value);
        playground?.updateAppearanceParameters({ connectionThickness: value });
    };

    const handleInactiveAlphaChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setInactiveAlpha(value);
        playground?.updateAppearanceParameters({ inactiveAlpha: value });
    };

    if (!playground) {
        return null; // Or a loading state for the controls
    }

    return (
        <div style={panelStyle}>
            <h4
                style={{
                    marginTop: "0",
                    marginBottom: "20px",
                    borderBottom: "1px solid #666",
                    paddingBottom: "10px",
                }}
            >
                Appearance
            </h4>

            <div style={controlGroupStyle}>
                <label htmlFor="qubit-size" style={labelStyle}>
                    Qubit Size:{" "}
                    <span style={valueStyle}>{qubitSize.toFixed(2)}</span>
                </label>
                <input
                    type="range"
                    id="qubit-size"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={qubitSize}
                    onChange={handleQubitSizeChange}
                    style={sliderStyle}
                />
            </div>

            <div style={controlGroupStyle}>
                <label htmlFor="connection-thickness" style={labelStyle}>
                    Connection Thickness:{" "}
                    <span style={valueStyle}>
                        {connectionThickness.toFixed(3)}
                    </span>
                </label>
                <input
                    type="range"
                    id="connection-thickness"
                    min="0.01"
                    max="0.25"
                    step="0.005"
                    value={connectionThickness}
                    onChange={handleConnectionThicknessChange}
                    style={sliderStyle}
                />
            </div>

            <div style={controlGroupStyle}>
                <label htmlFor="inactive-alpha" style={labelStyle}>
                    Inactive Alpha:{" "}
                    <span style={valueStyle}>{inactiveAlpha.toFixed(2)}</span>
                </label>
                <input
                    type="range"
                    id="inactive-alpha"
                    min="0.0"
                    max="1.0"
                    step="0.01"
                    value={inactiveAlpha}
                    onChange={handleInactiveAlphaChange}
                    style={sliderStyle}
                />
            </div>
        </div>
    );
};

export default AppearanceControls;
