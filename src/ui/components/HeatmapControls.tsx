import React, { useState, useEffect, useCallback } from "react";
import type { Playground } from "../Playground.js";
import KeyboardControlsGuide from "./KeyboardControlsGuide.js";
import { colors } from "../theme/colors.js";

interface HeatmapControlsProps {
    playground: Playground | null;
    initialValues: {
        maxSlices: number;
    };
}

const SLIDER_MAX_VALUE = 100;

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: colors.background.panel,
    padding: "15px",
    borderRadius: "8px",
    color: colors.text.primary,
    fontFamily: "Arial, sans-serif",
    zIndex: 10,
    width: "200px",
    boxShadow: `0 2px 10px ${colors.shadow.light}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
};

const topLabelStyle: React.CSSProperties = {
    marginBottom: "10px",
    fontSize: "1em",
    textAlign: "center",
    display: "block",
    width: "100%",
};

const sliderStyle: React.CSSProperties = {
    width: "90%",
    cursor: "pointer",
    marginBottom: "15px",
};

const legendContainerStyle: React.CSSProperties = {
    width: "100%",
    marginBottom: "15px",
};

const HeatmapControls: React.FC<HeatmapControlsProps> = ({
    playground,
    initialValues,
}) => {
    const [sliderValue, setSliderValue] = useState(
        initialValues.maxSlices === -1 ? 0 : initialValues.maxSlices,
    );

    useEffect(() => {
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
            playground.grid.heatmapLegend.update(
                playground.grid.maxSlicesForHeatmap,
                playground.grid.lastEffectiveSlicesForHeatmap,
                playground.grid.lastMaxObservedRawHeatmapSum,
            );
        }
    }, [
        playground,
        sliderValue,
        playground?.grid?.lastEffectiveSlicesForHeatmap,
        playground?.grid?.lastMaxObservedRawHeatmapSum,
        playground?.currentSlice,
    ]);

    const updatePlaygroundHeatmapSlices = useCallback(
        (newSliderValue: number) => {
            const actualMaxSlices = newSliderValue === 0 ? -1 : newSliderValue;
            playground?.updateHeatmapSlices(actualMaxSlices);
        },
        [playground],
    );

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const currentSliderVal = parseInt(event.target.value, 10);
        setSliderValue(currentSliderVal);
        updatePlaygroundHeatmapSlices(currentSliderVal);
    };

    if (!playground) {
        return null;
    }

    const displayValueForSlider =
        sliderValue === 0 ? "All" : sliderValue.toString();

    return (
        <div style={panelStyle}>
            <label htmlFor="heatmap-slices-label" style={topLabelStyle}>
                Heatmap History (Slices): {displayValueForSlider}
            </label>

            <input
                type="range"
                id="heatmap-slices-slider"
                min="0"
                max={SLIDER_MAX_VALUE}
                step="1"
                value={sliderValue}
                onChange={handleSliderChange}
                style={sliderStyle}
            />

            <div
                id="heatmap-legend-container"
                style={legendContainerStyle}
            ></div>

            <KeyboardControlsGuide />
        </div>
    );
};

export default HeatmapControls;
