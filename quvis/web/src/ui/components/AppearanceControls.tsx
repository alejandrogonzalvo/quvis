import React, { useState, useEffect } from "react";
import type { Playground } from "../../scene/Playground.js";
import { colors } from "../theme/colors.js";

interface AppearanceControlsProps {
    playground: Playground | null;
    initialValues: {
        qubitSize: number;
        connectionThickness: number;
        inactiveAlpha: number;
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
    fontFamily: "Inter, system-ui, sans-serif",
    zIndex: 10,
    width: "280px",
    boxShadow: `0 2px 10px ${colors.shadow.light}`,
    transition: "all 0.3s ease",
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
    marginTop: "0",
    marginBottom: "0",
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
    maxHeight: "500px",
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
    const [isHovered, setIsHovered] = useState(false);
    const [qubitSize, setQubitSize] = useState(initialValues.qubitSize);
    const [connectionThickness, setConnectionThickness] = useState(
        initialValues.connectionThickness,
    );
    const [inactiveAlpha, setInactiveAlpha] = useState(
        initialValues.inactiveAlpha,
    );
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
        setRenderBlochSpheres(initialValues.renderBlochSpheres);
        setRenderConnectionLines(initialValues.renderConnectionLines);
    }, [initialValues]);

    const handleQubitSizeChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setQubitSize(value);
        if (playground) {
            playground.updateAppearanceParameters({ qubitSize: value });
        }
    };

    const handleConnectionThicknessChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setConnectionThickness(value);
        if (playground) {
            playground.updateAppearanceParameters({
                connectionThickness: value,
            });
        }
    };

    const handleInactiveAlphaChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setInactiveAlpha(value);
        if (playground) {
            playground.updateAppearanceParameters({ inactiveAlpha: value });
        }
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
                    ...headerStyle,
                    ...(isHovered ? headerHoverStyle : {})
                }}
                onClick={onToggleCollapse}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <h4 style={headerTitleStyle}>
                    Appearance
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
            </div>
        </div>
    );
};

export default AppearanceControls;
