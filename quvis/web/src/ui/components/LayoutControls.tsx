import React, { useState, useEffect } from "react";
import type { Playground } from "../../scene/Playground.js";
import { colors } from "../theme/colors.js";

interface LayoutControlsProps {
    playground: Playground | null;
    initialValues: {
        repelForce: number;
        idealDistance: number;
        gridIdealDistance: number;
        iterations: number;
        coolingFactor: number;
        attractForce?: number;
    };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    topPosition: string;
    setIsLoading: (loading: boolean) => void;
}

const basePanelStyle: React.CSSProperties = {
    position: "fixed",
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

const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    backgroundColor: colors.primary.main,
    color: colors.text.primary,
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em",
    marginTop: "10px",
    transition: "all 0.2s ease",
};

const tabButtonStyle: React.CSSProperties = {
    padding: "10px 15px",
    border: "none",
    background: "none",
    color: colors.text.primary,
    cursor: "pointer",
    fontSize: "1em",
    borderBottom: "2px solid transparent",
    marginBottom: "-1px",
    transition: "all 0.2s ease",
};

const activeTabButtonStyle: React.CSSProperties = {
    ...tabButtonStyle,
    borderBottom: `2px solid ${colors.primary.main}`,
    fontWeight: "bold",
};

const LayoutControls: React.FC<LayoutControlsProps> = ({
    playground,
    initialValues,
    isCollapsed,
    onToggleCollapse,
    topPosition,
    setIsLoading,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [activeTab, setActiveTab] = useState<"grid" | "force">("grid");
    const [repelForce, setRepelForce] = useState(initialValues.repelForce);
    const [idealDistance, setIdealDistance] = useState(
        initialValues.idealDistance,
    );
    const [gridIdealDistance, setGridIdealDistance] = useState(
        initialValues.gridIdealDistance,
    );
    const [iterations, setIterations] = useState(initialValues.iterations);
    const [coolingFactor, setCoolingFactor] = useState(
        initialValues.coolingFactor,
    );
    const [attractForce, setAttractForce] = useState(
        initialValues.attractForce ?? 0.1,
    );

    useEffect(() => {
        setRepelForce(initialValues.repelForce);
        setIdealDistance(initialValues.idealDistance);
        setGridIdealDistance(initialValues.gridIdealDistance);
        setIterations(initialValues.iterations);
        setCoolingFactor(initialValues.coolingFactor);
        setAttractForce(initialValues.attractForce ?? 0.1);
    }, [initialValues]);

    const handleRepelForceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setRepelForce(parseFloat(event.target.value));
    };

    const handleIdealDistanceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setIdealDistance(parseFloat(event.target.value));
    };

    const handleGridIdealDistanceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setGridIdealDistance(parseFloat(event.target.value));
    };

    const handleIterationsChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setIterations(parseInt(event.target.value));
    };

    const handleCoolingFactorChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setCoolingFactor(parseFloat(event.target.value));
    };

    const handleAttractForceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setAttractForce(parseFloat(event.target.value));
    };

    const handleGridButtonClick = () => {
        setActiveTab("grid");
        playground?.updateIdealDistance(gridIdealDistance);
        playground?.applyGridLayout();
    };

    const handleForceButtonClick = () => {
        setActiveTab("force");
        setIsLoading(true);
        playground?.updateLayoutParameters(
            {
                repelForce,
                idealDistance,
                iterations,
                coolingFactor,
                attractForce,
            },
            () => {
                setIsLoading(false);
            },
        );
    };

    const panelStyle: React.CSSProperties = {
        ...basePanelStyle,
        top: topPosition,
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
                    Layout Controls
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
                <div
                    style={{
                        display: "flex",
                        borderBottom: `1px solid ${colors.border.separator}`,
                        marginBottom: "20px",
                    }}
                >
                    <button
                        style={
                            activeTab === "grid"
                                ? activeTabButtonStyle
                                : tabButtonStyle
                        }
                        onClick={() => setActiveTab("grid")}
                    >
                        Grid
                    </button>
                    <button
                        style={
                            activeTab === "force"
                                ? activeTabButtonStyle
                                : tabButtonStyle
                        }
                        onClick={() => setActiveTab("force")}
                    >
                        Force-based
                    </button>
                </div>

                {activeTab === "grid" && (
                    <div>
                        <div style={controlGroupStyle}>
                            <label htmlFor="grid-ideal-distance" style={labelStyle}>
                                Ideal Distance:{" "}
                                <span style={valueStyle}>
                                    {gridIdealDistance.toFixed(1)}
                                </span>
                            </label>
                            <input
                                type="range"
                                id="grid-ideal-distance"
                                min="1.0"
                                max="10.0"
                                step="0.5"
                                value={gridIdealDistance}
                                onChange={handleGridIdealDistanceChange}
                                style={sliderStyle}
                            />
                        </div>
                        <div style={controlGroupStyle}>
                            <button style={buttonStyle} onClick={handleGridButtonClick}>
                                Apply Grid Layout
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "force" && (
                    <>
                        <div style={controlGroupStyle}>
                            <label htmlFor="repel-force" style={labelStyle}>
                                Repel Force:{" "}
                                <span style={valueStyle}>
                                    {repelForce.toFixed(2)}
                                </span>
                            </label>
                            <input
                                type="range"
                                id="repel-force"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={repelForce}
                                onChange={handleRepelForceChange}
                                style={sliderStyle}
                            />
                        </div>

                        <div style={controlGroupStyle}>
                            <label htmlFor="ideal-distance" style={labelStyle}>
                                Ideal Distance:{" "}
                                <span style={valueStyle}>
                                    {idealDistance.toFixed(1)}
                                </span>
                            </label>
                            <input
                                type="range"
                                id="ideal-distance"
                                min="1.0"
                                max="10.0"
                                step="0.5"
                                value={idealDistance}
                                onChange={handleIdealDistanceChange}
                                style={sliderStyle}
                            />
                        </div>

                        <div style={controlGroupStyle}>
                            <label htmlFor="iterations" style={labelStyle}>
                                Iterations:{" "}
                                <span style={valueStyle}>{iterations}</span>
                            </label>
                            <input
                                type="range"
                                id="iterations"
                                min="100"
                                max="20000"
                                step="100"
                                value={iterations}
                                onChange={handleIterationsChange}
                                style={sliderStyle}
                            />
                        </div>

                        <div style={controlGroupStyle}>
                            <label htmlFor="cooling-factor" style={labelStyle}>
                                Cooling Factor:{" "}
                                <span style={valueStyle}>
                                    {coolingFactor.toFixed(2)}
                                </span>
                            </label>
                            <input
                                type="range"
                                id="cooling-factor"
                                min="0.85"
                                max="1.0"
                                step="0.01"
                                value={coolingFactor}
                                onChange={handleCoolingFactorChange}
                                style={sliderStyle}
                            />
                        </div>

                        <div style={controlGroupStyle}>
                            <label htmlFor="attract-force" style={labelStyle}>
                                Attract Force:{" "}
                                <span style={valueStyle}>
                                    {attractForce.toFixed(3)}
                                </span>
                            </label>
                            <input
                                type="range"
                                id="attract-force"
                                min="0"
                                max="1"
                                step="0.001"
                                value={attractForce}
                                onChange={handleAttractForceChange}
                                style={sliderStyle}
                            />
                        </div>

                        <div style={controlGroupStyle}>
                            <button style={buttonStyle} onClick={handleForceButtonClick}>
                                Apply Force Layout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LayoutControls;
