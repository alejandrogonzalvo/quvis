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

    useEffect(() => {
        setMaxSlices(initialValues.maxSlices);
        setBaseSize(initialValues.baseSize);
    }, [initialValues]);

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
            </div>
        </div>
    );
};

export default HeatmapControls;
