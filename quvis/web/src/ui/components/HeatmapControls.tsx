import React, { useState, useEffect } from "react";
import type { Playground } from "../../scene/Playground.js";
import { colors } from "../theme/colors.js";

interface HeatmapControlsProps {
    playground: Playground | null;
    initialValues: {
        maxSlices: number;
        baseSize: number;
    };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const HeatmapControls: React.FC<HeatmapControlsProps> = ({
    playground,
    initialValues,
    isCollapsed,
    onToggleCollapse,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [maxSlices, setMaxSlices] = useState(initialValues.maxSlices);
    const [baseSize, setBaseSize] = useState(initialValues.baseSize);
    const [lightMode, setLightMode] = useState(false);
    
    // Color parameters state
    const [fadeThreshold, setFadeThreshold] = useState(0.1);
    const [greenThreshold, setGreenThreshold] = useState(0.3);
    const [yellowThreshold, setYellowThreshold] = useState(0.7);
    const [intensityPower, setIntensityPower] = useState(0.3);
    const [minIntensity, setMinIntensity] = useState(0.01);
    const [borderWidth, setBorderWidth] = useState(0.0);

    useEffect(() => {
        setMaxSlices(initialValues.maxSlices);
        setBaseSize(initialValues.baseSize);
        // Initialize light mode from playground background state
        if (playground) {
            setLightMode(playground.isLightBackground());
            
            // Initialize color parameters from playground
            const colorParams = playground.getHeatmapColorParameters();
            setFadeThreshold(colorParams.fadeThreshold);
            setGreenThreshold(colorParams.greenThreshold);
            setYellowThreshold(colorParams.yellowThreshold);
            setIntensityPower(colorParams.intensityPower);
            setMinIntensity(colorParams.minIntensity);
            setBorderWidth(colorParams.borderWidth);
        }
    }, [initialValues, playground]);

    const handleMaxSlicesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(event.target.value, 10);
        setMaxSlices(value);
        if (playground) {
            playground.updateHeatmapSlices(value);
        }
    };

    const handleBaseSizeChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setBaseSize(value);
        if (playground) {
            playground.updateAppearanceParameters({ baseSize: value });
        }
    };

    const handleLightModeChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = event.target.checked;
        setLightMode(value);
        if (playground) {
            playground.setLightBackground(value);
        }
    };

    const handleFadeThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setFadeThreshold(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ fadeThreshold: value });
        }
    };

    const handleGreenThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setGreenThreshold(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ greenThreshold: value });
        }
    };

    const handleYellowThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setYellowThreshold(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ yellowThreshold: value });
        }
    };

    const handleIntensityPowerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setIntensityPower(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ intensityPower: value });
        }
    };

    const handleMinIntensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setMinIntensity(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ minIntensity: value });
        }
    };

    const handleBorderWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setBorderWidth(value);
        if (playground) {
            playground.updateHeatmapColorParameters({ borderWidth: value });
            
        }
    };

    const panelStyle: React.CSSProperties = {
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: colors.background.panel,
        padding: "15px",
        borderRadius: "8px",
        color: colors.text.primary,
        fontFamily: "Inter, system-ui, sans-serif",
        zIndex: 10,
        width: "400px", // Made wider to accommodate controls without scrolling
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
        maxHeight: "800px", // Increased to accommodate color controls
        overflow: "auto", // Changed to auto to allow scrolling if needed
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
        fontSize: "0.9em",
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

    const descriptionStyle: React.CSSProperties = {
        fontSize: "0.8em",
        color: colors.text.secondary,
        marginTop: "8px",
        lineHeight: "1.4",
    };

    const checkboxContainerStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        marginTop: "4px",
    };

    const checkboxStyle: React.CSSProperties = {
        marginRight: "8px",
        cursor: "pointer",
        width: "16px",
        height: "16px",
    };

    const colorControlsStyle: React.CSSProperties = {
        marginTop: "12px",
        padding: "12px",
        backgroundColor: colors.ui.surface,
        borderRadius: "6px",
        border: `1px solid ${colors.border.separator}`,
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
                    Heatmap Controls
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
                    <label htmlFor="max-slices" style={labelStyle}>
                        Max Heatmap Slices
                    </label>
                    <div style={sliderContainerStyle}>
                        <input
                            type="range"
                            id="max-slices"
                            min="-1"
                            max="100"
                            step="1"
                            value={maxSlices}
                            onChange={handleMaxSlicesChange}
                            style={sliderStyle}
                        />
                        <span style={valueStyle}>
                            {maxSlices === -1 ? "All" : maxSlices}
                        </span>
                    </div>
                    <div style={descriptionStyle}>
                        Controls the time window for heat accumulation visualization. Set to "All" for cumulative view.
                    </div>
                </div>

                <div style={controlGroupStyle}>
                    <label htmlFor="heatmap-base-size" style={labelStyle}>
                        Heatmap Base Size
                    </label>
                    <div style={sliderContainerStyle}>
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
                        <span style={valueStyle}>
                            {baseSize.toFixed(0)}
                        </span>
                    </div>
                    <div style={descriptionStyle}>
                        Controls the size of heatmap visualization elements
                    </div>
                </div>

                <div style={controlGroupStyle}>
                    <label htmlFor="background-light-mode" style={labelStyle}>
                        Background
                    </label>
                    <div style={checkboxContainerStyle}>
                        <input
                            type="checkbox"
                            id="background-light-mode"
                            checked={lightMode}
                            onChange={handleLightModeChange}
                            style={checkboxStyle}
                        />
                        <span style={{ fontSize: "0.9em", color: colors.text.primary }}>
                            Light Background
                        </span>
                    </div>
                    <div style={descriptionStyle}>
                        Switch between dark and light backgrounds while keeping classic heatmap colors (Green → Yellow → Red)
                    </div>
                </div>

                <div style={controlGroupStyle}>
                    <label style={labelStyle}>
                        Color Controls
                    </label>
                    <div style={colorControlsStyle}>
                        {/* Threshold Controls */}
                        <div style={controlGroupStyle}>
                            <label style={{ ...labelStyle, marginBottom: "6px" }}>
                                Thresholds
                            </label>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Fade Start
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.001"
                                    value={fadeThreshold}
                                    onChange={handleFadeThresholdChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {fadeThreshold.toFixed(3)}
                                </span>
                            </div>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Green Zone
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.001"
                                    value={greenThreshold}
                                    onChange={handleGreenThresholdChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {greenThreshold.toFixed(3)}
                                </span>
                            </div>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Yellow Zone
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.001"
                                    value={yellowThreshold}
                                    onChange={handleYellowThresholdChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {yellowThreshold.toFixed(3)}
                                </span>
                            </div>
                        </div>

                        {/* Power and Intensity Controls */}
                        <div style={controlGroupStyle}>
                            <label style={{ ...labelStyle, marginBottom: "6px" }}>
                                Intensity Controls
                            </label>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Power Curve
                                </span>
                                <input
                                    type="range"
                                    min="0.01"
                                    max="2"
                                    step="0.01"
                                    value={intensityPower}
                                    onChange={handleIntensityPowerChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {intensityPower.toFixed(2)}
                                </span>
                            </div>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Min Intensity
                                </span>
                                <input
                                    type="range"
                                    min="0.001"
                                    max="0.2"
                                    step="0.001"
                                    value={minIntensity}
                                    onChange={handleMinIntensityChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {minIntensity.toFixed(3)}
                                </span>
                            </div>
                            <div style={sliderContainerStyle}>
                                <span style={{ fontSize: "0.8em", color: colors.text.secondary, minWidth: "80px" }}>
                                    Border Width
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="0.9"
                                    step="0.001"
                                    value={borderWidth}
                                    onChange={handleBorderWidthChange}
                                    style={sliderStyle}
                                />
                                <span style={valueStyle}>
                                    {borderWidth.toFixed(3)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style={descriptionStyle}>
                        Adjust color transition thresholds and intensity parameters. Fade Start controls green opacity (0% to 100%), Power curve controls smoothness, Min Intensity controls pixel visibility threshold, Border Width adds black contours for shape definition.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatmapControls;
