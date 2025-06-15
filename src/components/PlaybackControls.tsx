import React from "react";
import * as RCSlider from "rc-slider";
import "rc-slider/assets/index.css";

interface PlaybackControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    speed: number;
    onSpeedChange: (newSpeed: number) => void;
    disabled: boolean;
    isAtEnd: boolean;
}

// Determine the actual slider component, trying to access .default for CJS/ESM interop
const defaultSliderExport = (
    RCSlider as unknown as { default?: React.ElementType }
).default;
const ActualSlider: React.ElementType =
    defaultSliderExport || (RCSlider as unknown as React.ElementType);

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    isPlaying,
    onPlayPause,
    speed,
    onSpeedChange,
    disabled,
    isAtEnd,
}) => {
    const containerStyle: React.CSSProperties = {
        position: "fixed",
        bottom: "20px", // Positioned above the timeline slider
        right: "20px",
        width: "250px",
        padding: "15px",
        boxSizing: "border-box",
        zIndex: 10,
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        color: "white",
        fontFamily: "Arial, sans-serif",
    };

    const titleStyle: React.CSSProperties = {
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: "10px",
    };

    const controlsRowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        marginBottom: "10px",
    };

    const buttonStyle: React.CSSProperties = {
        background: "rgba(255, 255, 255, 0.1)",
        color: "white",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "4px",
        padding: "5px 10px",
        cursor: "pointer",
        fontSize: "1em",
        lineHeight: "1",
        minWidth: "40px",
    };

    const disabledButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        opacity: 0.5,
        cursor: "not-allowed",
    };

    const sliderContainerStyle: React.CSSProperties = {
        padding: "0 10px",
    };

    const sliderLabelStyle: React.CSSProperties = {
        textAlign: "center",
        marginBottom: "5px",
        fontSize: "0.9em",
    };

    const handleStyle: React.CSSProperties = {
        borderColor: "#007bff",
        backgroundColor: "#007bff",
        opacity: 1,
        height: 14,
        width: 14,
        marginTop: -5,
    };

    const trackStyle: React.CSSProperties = {
        backgroundColor: "#007bff",
        height: 4,
    };

    const railStyle: React.CSSProperties = {
        backgroundColor: "#555",
        height: 4,
    };

    const isPlayPauseDisabled = disabled || (isAtEnd && !isPlaying);

    const minSpeedMs = 0.1;
    const maxSpeedMs = 100;
    const sliderMin = 0;
    const sliderMax = 1000; // Use a larger range for more precision

    const logMin = Math.log(minSpeedMs);
    const logMax = Math.log(maxSpeedMs);
    const scale = (logMax - logMin) / (sliderMax - sliderMin);

    const speedToSliderValue = (speedInMs: number): number => {
        const clampedSpeed = Math.max(
            minSpeedMs,
            Math.min(speedInMs, maxSpeedMs),
        );
        const logClamped = Math.log(clampedSpeed);
        return sliderMin + (logClamped - logMin) / scale;
    };

    const sliderValueToSpeed = (sliderValue: number): number => {
        const speedInMs = Math.exp(logMin + (sliderValue - sliderMin) * scale);
        return speedInMs / 1000; // Convert to seconds for parent component
    };

    const handleSliderChange = (newValue: number | number[]) => {
        if (typeof newValue === "number") {
            const newSpeedInSeconds = sliderValueToSpeed(newValue);
            onSpeedChange(newSpeedInSeconds);
        }
    };

    const formatSpeed = (speedInMs: number): string => {
        if (speedInMs < 10) {
            return speedInMs.toFixed(1);
        }
        return speedInMs.toFixed(0);
    };

    const currentSpeedMs = speed * 1000;
    const sliderValue = speedToSliderValue(currentSpeedMs);

    return (
        <div style={containerStyle}>
            <div style={titleStyle}>Playback Controls</div>
            <div style={controlsRowStyle}>
                <button
                    onClick={onPlayPause}
                    disabled={isPlayPauseDisabled}
                    style={
                        isPlayPauseDisabled ? disabledButtonStyle : buttonStyle
                    }
                >
                    {isPlaying ? "❚❚" : "▶"}
                </button>
            </div>
            <div style={sliderLabelStyle}>
                Speed: {formatSpeed(currentSpeedMs)} ms/slice
            </div>
            <div style={sliderContainerStyle}>
                <ActualSlider
                    min={sliderMin}
                    max={sliderMax}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    disabled={disabled}
                    handleStyle={handleStyle}
                    trackStyle={trackStyle}
                    railStyle={railStyle}
                />
            </div>
        </div>
    );
};

export default PlaybackControls;
