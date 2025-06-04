import React, { useState, useEffect } from "react";
import { Playground } from "../Playground.js";

interface HeatmapControlsProps {
    playground: Playground | null;
    initialValues: {
        maxSlices: number; // This initialValue might be the special -1 if previously set
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
    // If initialValues.maxSlices is -1 (for "All"), map it to 0 for the slider's state
    const [sliderValue, setSliderValue] = useState(
        initialValues.maxSlices === -1 ? 0 : initialValues.maxSlices,
    );

    useEffect(() => {
        // Sync slider if initialValues change from outside
        setSliderValue(
            initialValues.maxSlices === -1 ? 0 : initialValues.maxSlices,
        );
    }, [initialValues.maxSlices]);

    useEffect(() => {
        if (
            playground &&
            playground.grid &&
            playground.grid.heatmapLegend &&
            playground.grid.lastEffectiveSlicesForHeatmap !== undefined &&
            playground.grid.lastMaxObservedRawHeatmapSum !== undefined
        ) {
            // The div with id "heatmap-legend-container" is rendered by this component.
            // Calling update() on the legend will now try to re-acquire its container if needed.
            playground.grid.heatmapLegend.update(
                playground.grid.maxSlicesForHeatmap, // The setting (-1 for All, or X)
                playground.grid.lastEffectiveSlicesForHeatmap, // Actual number of slices used in last heatmap calc
                playground.grid.lastMaxObservedRawHeatmapSum, // Max raw sum observed for points in last heatmap calc
            );
        }
    }, [
        playground,
        sliderValue,
        playground?.grid?.lastEffectiveSlicesForHeatmap,
        playground?.grid?.lastMaxObservedRawHeatmapSum,
        playground?.currentSlice,
    ]); // Rerun if these values change

    const handleMaxSlicesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const currentSliderVal = parseInt(event.target.value, 10);
        setSliderValue(currentSliderVal);

        const actualMaxSlices = currentSliderVal === 0 ? -1 : currentSliderVal; // -1 signifies "all slices"
        console.log(
            `HeatmapControls: handleMaxSlicesChange called. currentSliderVal=${currentSliderVal}, actualMaxSlices=${actualMaxSlices}. Playground available: ${!!playground}`,
        );
        playground?.updateHeatmapSlices(actualMaxSlices);
    };

    if (!playground) {
        return null;
    }

    const displayValue = sliderValue === 0 ? "All" : sliderValue.toString();

    return (
        <div style={panelStyle}>
            <label htmlFor="heatmap-slices" style={labelStyle}>
                Heatmap History (Slices)
            </label>
            <input
                type="range"
                id="heatmap-slices"
                min="0" // Min is now 0
                max="10"
                step="1"
                value={sliderValue}
                onChange={handleMaxSlicesChange}
                style={sliderStyle}
            />
            <span style={valueDisplayStyle}>{displayValue}</span>
            {/* Container for the Heatmap Legend */}
            <div
                id="heatmap-legend-container"
                style={{ marginTop: "20px", width: "100%" }}
            ></div>
        </div>
    );
};

export default HeatmapControls;
