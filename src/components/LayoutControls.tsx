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
}

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "270px", // Positioned below the AppearanceControls (approx 20px top + 230px height + 20px margin)
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

const LayoutControls: React.FC<LayoutControlsProps> = ({
    playground,
    initialValues,
}) => {
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

    const handleRepelForceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setRepelForce(value);
        playground?.updateLayoutParameters({ repelForce: value });
    };

    const handleIdealDistanceChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setIdealDistance(value);
        playground?.updateLayoutParameters({ idealDistance: value });
    };

    const handleIterationsChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(event.target.value, 10);
        setIterations(value);
        playground?.updateLayoutParameters({ iterations: value });
    };

    const handleCoolingFactorChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseFloat(event.target.value);
        setCoolingFactor(value);
        playground?.updateLayoutParameters({ coolingFactor: value });
    };

    const handleRecompileLayout = () => {
        playground?.recompileLayout();
    };

    if (!playground) {
        return null;
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
                Layout Simulation
            </h4>

            <div style={controlGroupStyle}>
                <label htmlFor="repel-force" style={labelStyle}>
                    Repel Force:{" "}
                    <span style={valueStyle}>{repelForce.toFixed(2)}</span>
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
                <label htmlFor="ideal-distance" style={labelStyle}>
                    Ideal Distance:{" "}
                    <span style={valueStyle}>{idealDistance.toFixed(1)}</span>
                </label>
                <input
                    type="range"
                    id="ideal-distance"
                    min="0.5"
                    max="100"
                    step="0.1"
                    value={idealDistance}
                    onChange={handleIdealDistanceChange}
                    style={sliderStyle}
                />
            </div>

            <div style={controlGroupStyle}>
                <label htmlFor="iterations" style={labelStyle}>
                    Iterations: <span style={valueStyle}>{iterations}</span>
                </label>
                <input
                    type="range"
                    id="iterations"
                    min="50"
                    max="1000"
                    step="10"
                    value={iterations}
                    onChange={handleIterationsChange}
                    style={sliderStyle}
                />
            </div>

            <div style={controlGroupStyle}>
                <label htmlFor="cooling-factor" style={labelStyle}>
                    Cooling Factor:{" "}
                    <span style={valueStyle}>{coolingFactor.toFixed(3)}</span>
                </label>
                <input
                    type="range"
                    id="cooling-factor"
                    min="0.8"
                    max="1.0"
                    step="0.001"
                    value={coolingFactor}
                    onChange={handleCoolingFactorChange}
                    style={sliderStyle}
                />
            </div>

            <button onClick={handleRecompileLayout} style={buttonStyle}>
                Recompile Layout
            </button>
        </div>
    );
};

export default LayoutControls;
