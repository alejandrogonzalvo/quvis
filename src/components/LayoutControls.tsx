import React, { useState, useEffect } from "react";
import { Playground } from "../Playground.js"; // Adjust path as necessary

interface LayoutControlsProps {
    playground: Playground | null;
    initialValues: {
        repelForce: number;
        idealDistance: number;
        iterations: number;
        coolingFactor: number;
    };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    topPosition: string; // e.g., "340px"
    setIsLoading: (isLoading: boolean) => void;
}

const basePanelStyle: React.CSSProperties = {
    position: "fixed",
    left: "20px",
    backgroundColor: "rgba(50, 50, 50, 0.8)",
    padding: "15px",
    borderRadius: "8px",
    color: "white",
    fontFamily: "Arial, sans-serif",
    zIndex: 10,
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

const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em",
    marginTop: "10px",
};

const tabButtonStyle: React.CSSProperties = {
    padding: "10px 15px",
    border: "none",
    background: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "1em",
    borderBottom: "2px solid transparent",
    marginBottom: "-1px",
};

const activeTabButtonStyle: React.CSSProperties = {
    ...tabButtonStyle,
    borderBottom: "2px solid #007bff",
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
    const [activeTab, setActiveTab] = useState<"grid" | "force">("grid");
    const [repelForce, setRepelForce] = useState(initialValues.repelForce);
    const [idealDistance, setIdealDistance] = useState(
        initialValues.idealDistance,
    );
    const [iterations, setIterations] = useState(initialValues.iterations);
    const [coolingFactor, setCoolingFactor] = useState(
        initialValues.coolingFactor,
    );

    useEffect(() => {
        setRepelForce(initialValues.repelForce);
        setIdealDistance(initialValues.idealDistance);
        setIterations(initialValues.iterations);
        setCoolingFactor(initialValues.coolingFactor);
    }, [initialValues]);

    useEffect(() => {
        // Only run simulation updates if the force tab is active
        if (activeTab === "force") {
            const handler = setTimeout(() => {
                setIsLoading(true);
                playground?.updateLayoutParameters(
                    {
                        repelForce,
                        idealDistance,
                        iterations,
                        coolingFactor,
                    },
                    () => {
                        setIsLoading(false);
                    },
                );
            }, 500); // Debounce for 500ms

            return () => {
                clearTimeout(handler);
            };
        }
    }, [
        repelForce,
        iterations,
        coolingFactor,
        playground,
        setIsLoading,
        activeTab,
    ]);

    // Separate useEffect for idealDistance to avoid triggering force layout updates
    useEffect(() => {
        if (activeTab === "grid") {
            const handler = setTimeout(() => {
                playground?.updateIdealDistance(idealDistance);
            }, 100); // Shorter debounce for responsiveness

            return () => {
                clearTimeout(handler);
            };
        }
    }, [idealDistance, playground, activeTab]);

    const handleRepelForceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setRepelForce(value);
    };

    const handleIdealDistanceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setIdealDistance(value);
    };

    const handleIterationsChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(event.target.value, 10);
        setIterations(value);
    };

    const handleCoolingFactorChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setCoolingFactor(value);
    };

    const handleRecompileLayout = () => {
        setIsLoading(true);
        playground?.recompileLayout(() => {
            setIsLoading(false);
        });
    };

    const handleGridLayout = () => {
        playground?.applyGridLayout();
    };

    if (!playground) {
        return null;
    }

    const panelStyle = { ...basePanelStyle, top: topPosition };

    return (
        <div style={panelStyle}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #666",
                    paddingBottom: "10px",
                    marginBottom: isCollapsed ? "0" : "10px",
                }}
            >
                <h4 style={{ margin: "0" }}>Layout Controls</h4>
                <button
                    onClick={onToggleCollapse}
                    style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "1.2em",
                        padding: "0 5px",
                    }}
                >
                    {isCollapsed ? "▶" : "▼"}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    <div
                        style={{
                            display: "flex",
                            borderBottom: "1px solid #666",
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
                        <>
                            <div style={controlGroupStyle}>
                                <label
                                    htmlFor="ideal-distance"
                                    style={labelStyle}
                                >
                                    Ideal Distance:{" "}
                                    <span style={valueStyle}>
                                        {idealDistance.toFixed(1)}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    id="ideal-distance"
                                    min="0.5"
                                    max="5"
                                    step="0.1"
                                    value={idealDistance}
                                    onChange={handleIdealDistanceChange}
                                    style={sliderStyle}
                                />
                            </div>
                            <button
                                onClick={handleGridLayout}
                                style={{ ...buttonStyle, marginTop: "20px" }}
                            >
                                Apply Grid Layout
                            </button>
                        </>
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
                                    min="0.01"
                                    max="1.0"
                                    step="0.01"
                                    value={repelForce}
                                    onChange={handleRepelForceChange}
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
                                    min="50"
                                    max="10000"
                                    step="50"
                                    value={iterations}
                                    onChange={handleIterationsChange}
                                    style={sliderStyle}
                                />
                            </div>

                            <div style={controlGroupStyle}>
                                <label
                                    htmlFor="cooling-factor"
                                    style={labelStyle}
                                >
                                    Cooling Factor:{" "}
                                    <span style={valueStyle}>
                                        {coolingFactor.toFixed(2)}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    id="cooling-factor"
                                    min="0.8"
                                    max="1.0"
                                    step="0.01"
                                    value={coolingFactor}
                                    onChange={handleCoolingFactorChange}
                                    style={sliderStyle}
                                />
                            </div>

                            <button
                                onClick={handleRecompileLayout}
                                style={buttonStyle}
                            >
                                Re-run Simulation
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default LayoutControls;
