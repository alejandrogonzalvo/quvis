import React, { useState, useEffect } from "react";
import type { Playground } from "../Playground.js";
import { colors } from "../theme/colors.js";

interface AppearanceControlsProps {
    playground: Playground | null;
    initialValues: {
        qubitSize: number;
        connectionThickness: number;
        inactiveAlpha: number;
        baseSize: number;
        renderBlochSpheres: boolean;
        renderConnectionLines: boolean;
    };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onRenderBlochSpheresChange: (checked: boolean) => void;
    onRenderConnectionLinesChange: (checked: boolean) => void;
}

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    left: "20px",
    backgroundColor: colors.background.panel,
    padding: "15px",
    borderRadius: "8px",
    color: colors.text.primary,
    fontFamily: "Arial, sans-serif",
    zIndex: 10,
    width: "280px",
    boxShadow: `0 2px 10px ${colors.shadow.light}`,
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

const toggleContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "15px",
};

const toggleLabelStyle: React.CSSProperties = {
    fontSize: "0.9em",
};

const AppearanceControls: React.FC<AppearanceControlsProps> = ({
    playground,
    initialValues,
    isCollapsed,
    onToggleCollapse,
    onRenderBlochSpheresChange,
    onRenderConnectionLinesChange,
}) => {
    const [qubitSize, setQubitSize] = useState(initialValues.qubitSize);
    const [connectionThickness, setConnectionThickness] = useState(
        initialValues.connectionThickness,
    );
    const [inactiveAlpha, setInactiveAlpha] = useState(
        initialValues.inactiveAlpha,
    );
    const [baseSize, setBaseSize] = useState(initialValues.baseSize);
    const [renderBlochSpheres, setRenderBlochSpheres] = useState(
        initialValues.renderBlochSpheres,
    );
    const [renderConnectionLines, setRenderConnectionLines] = useState(
        initialValues.renderConnectionLines,
    );

    useEffect(() => {
        setQubitSize(initialValues.qubitSize);
        setConnectionThickness(initialValues.connectionThickness);
        setInactiveAlpha(initialValues.inactiveAlpha);
        setBaseSize(initialValues.baseSize);
        setRenderBlochSpheres(initialValues.renderBlochSpheres);
        setRenderConnectionLines(initialValues.renderConnectionLines);
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

    const handleBaseSizeChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setBaseSize(value);
        playground?.updateAppearanceParameters({ baseSize: value });
    };

    const handleRenderBlochSpheresChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const checked = event.target.checked;
        setRenderBlochSpheres(checked);
        onRenderBlochSpheresChange(checked);
    };

    const handleRenderConnectionLinesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const checked = event.target.checked;
        setRenderConnectionLines(checked);
        onRenderConnectionLinesChange(checked);
    };

    if (!playground) {
        return null; // Or a loading state for the controls
    }

    return (
        <div style={panelStyle}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `1px solid ${colors.border.separator}`,
                    paddingBottom: "10px",
                    marginBottom: isCollapsed ? "0" : "20px",
                }}
            >
                <h4
                    style={{
                        marginTop: "0",
                        marginBottom: "0",
                    }}
                >
                    Appearance
                </h4>
                <button
                    onClick={onToggleCollapse}
                    style={{
                        background: "none",
                        border: "none",
                        color: colors.text.primary,
                        cursor: "pointer",
                        fontSize: "1.2em",
                        padding: "0",
                        lineHeight: "1",
                    }}
                >
                    {isCollapsed ? "▶" : "▼"}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    <div style={toggleContainerStyle}>
                        <label
                            htmlFor="render-bloch-spheres"
                            style={toggleLabelStyle}
                        >
                            Render Bloch Spheres
                        </label>
                        <input
                            type="checkbox"
                            id="render-bloch-spheres"
                            checked={renderBlochSpheres}
                            onChange={handleRenderBlochSpheresChange}
                        />
                    </div>
                    <div style={toggleContainerStyle}>
                        <label
                            htmlFor="render-connection-lines"
                            style={toggleLabelStyle}
                        >
                            Render Connection Lines
                        </label>
                        <input
                            type="checkbox"
                            id="render-connection-lines"
                            checked={renderConnectionLines}
                            onChange={handleRenderConnectionLinesChange}
                        />
                    </div>
                    <div style={controlGroupStyle}>
                        <label htmlFor="qubit-size" style={labelStyle}>
                            Qubit Size:{" "}
                            <span style={valueStyle}>
                                {qubitSize.toFixed(2)}
                            </span>
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
                        <label
                            htmlFor="connection-thickness"
                            style={labelStyle}
                        >
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
                            <span style={valueStyle}>
                                {inactiveAlpha.toFixed(2)}
                            </span>
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

                    <div style={controlGroupStyle}>
                        <label htmlFor="heatmap-base-size" style={labelStyle}>
                            Heatmap Base Size:{" "}
                            <span style={valueStyle}>
                                {baseSize.toFixed(0)}
                            </span>
                        </label>
                        <input
                            type="range"
                            id="heatmap-base-size"
                            min="0"
                            max="4000"
                            step="10"
                            value={baseSize}
                            onChange={handleBaseSizeChange}
                            style={sliderStyle}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default AppearanceControls;
