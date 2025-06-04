import React from "react";
import * as RCSlider from "rc-slider"; // Import as namespace
import "rc-slider/assets/index.css";

interface TimelineSliderProps {
    min: number;
    max: number;
    value: number;
    onChange: (newValue: number) => void;
    disabled: boolean;
    label?: string;
}

// Determine the actual slider component, trying to access .default for CJS/ESM interop
const defaultSliderExport = (
    RCSlider as unknown as { default?: React.ElementType }
).default;
const ActualSlider: React.ElementType =
    defaultSliderExport || (RCSlider as unknown as React.ElementType);

const TimelineSlider: React.FC<TimelineSliderProps> = ({
    min,
    max,
    value,
    onChange,
    disabled,
    label,
}) => {
    // The main container style remains the same
    const containerStyle: React.CSSProperties = {
        position: "fixed",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80%",
        maxWidth: "800px",
        padding: "10px 20px", // Added a bit more horizontal padding for the slider handles
        boxSizing: "border-box",
        zIndex: 10,
    };

    const labelStyle: React.CSSProperties = {
        color: "white",
        marginRight: "10px",
        display: "block",
        textAlign: "center",
        marginBottom: "10px",
        fontSize: "0.9em",
    };

    const valueDisplayStyle: React.CSSProperties = {
        color: "white",
        marginTop: "0px",
        fontSize: "0.9em",
        textAlign: "center",
    };

    // Custom styles for rc-slider to better fit a dark theme
    const handleStyle: React.CSSProperties = {
        borderColor: "#007bff", // Blue border for the handle
        backgroundColor: "#007bff", // Blue background for the handle
        opacity: 1,
        height: 18, // Slightly larger handle
        width: 18,
        marginTop: -7, // Adjust vertical position
    };

    const trackStyle: React.CSSProperties = {
        backgroundColor: "#007bff", // Blue track for the selected part
        height: 4, // Thinner track
    };

    const railStyle: React.CSSProperties = {
        backgroundColor: "#555", // Darker rail for the unselected part
        height: 4, // Thinner rail
    };

    const handleRcSliderChange = (newValue: number | number[]) => {
        // Assuming single value slider, so newValue should be number
        if (typeof newValue === "number") {
            onChange(newValue);
        }
        // If it could be a range, you might need to handle newValue as number[]
    };

    if (!ActualSlider) {
        // Fallback or error if Slider component could not be resolved
        return <div>Error loading slider component.</div>;
    }

    return (
        <div style={containerStyle}>
            {label && <span style={labelStyle}>{label}</span>}
            <ActualSlider
                min={min}
                max={max}
                value={value}
                onChange={handleRcSliderChange}
                disabled={disabled || max < min}
                handleStyle={handleStyle}
                trackStyle={trackStyle}
                railStyle={railStyle}
            />
            {max >= min && (
                <div style={valueDisplayStyle}>
                    Slice: {value} / {max}
                </div>
            )}
        </div>
    );
};

export default TimelineSlider;
