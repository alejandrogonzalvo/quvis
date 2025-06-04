import React, { useState, useEffect } from "react";
import { Playground } from "../Playground.js";

interface HeatmapControlsProps {
    playground: Playground | null;
    initialValues: {
        maxSlices: number;
    };
}

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: "rgba(50, 50, 50, 0.8)",
    padding: "15px",
    borderRadius: "8px",
    color: "white",
    fontFamily: "Arial, sans-serif",
    zIndex: 10,
    width: "200px", // Adjusted width for a horizontal slider in a vertical panel
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
};

const labelStyle: React.CSSProperties = {
    marginBottom: "10px",
    fontSize: "0.9em",
    textAlign: "center",
    display: "block", // Ensure label takes full width for centering text
    width: "100%",
};

const sliderStyle: React.CSSProperties = {
    width: "90%", // Slider takes most of the panel width
    cursor: "pointer",
};

const valueDisplayStyle: React.CSSProperties = {
    display: "block", // Separate span for value below slider
    marginTop: "8px",
    fontSize: "0.9em",
    textAlign: "center",
    width: "100%",
};

const HeatmapControls: React.FC<HeatmapControlsProps> = ({
    playground,
    initialValues,
}) => {
    const [maxSlices, setMaxSlices] = useState(initialValues.maxSlices);

    useEffect(() => {
        setMaxSlices(initialValues.maxSlices);
    }, [initialValues.maxSlices]);

    const handleMaxSlicesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(event.target.value, 10);
        setMaxSlices(value);
        playground?.updateHeatmapSlices(value);
    };

    if (!playground) {
        return null;
    }

    return (
        <div style={panelStyle}>
            <label htmlFor="heatmap-slices" style={labelStyle}>
                Heatmap Slices
            </label>
            <input
                type="range"
                id="heatmap-slices"
                min="1"
                max="10" // Default max from original HTML, can be dynamic
                step="1"
                value={maxSlices}
                onChange={handleMaxSlicesChange}
                style={sliderStyle}
            />
            <span style={valueDisplayStyle}>{maxSlices}</span>
        </div>
    );
};

export default HeatmapControls;
