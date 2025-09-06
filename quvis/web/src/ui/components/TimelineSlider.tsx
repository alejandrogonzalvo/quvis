import React, { useEffect, useCallback } from 'react';
import * as RCSlider from 'rc-slider'; // Import as namespace
import 'rc-slider/assets/index.css';
import { colors } from '../theme/colors.js';

interface TimelineSliderProps {
    min: number;
    max: number;
    value: number;
    onChange: (newValue: number) => void;
    disabled: boolean;
    label?: string;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
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
    isCollapsed,
    onToggleCollapse,
}) => {
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: isCollapsed ? '10px' : '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: '800px',
        padding: '15px', // Matched AppearanceControls
        boxSizing: 'border-box',
        zIndex: 10,
        backgroundColor: colors.background.panel,
        borderRadius: '8px', // Matched AppearanceControls
        boxShadow: `0 2px 10px ${colors.shadow.light}`, // Matched AppearanceControls
        color: colors.text.primary, // Matched AppearanceControls (for text color inheritance)
        fontFamily: 'Arial, sans-serif', // Matched AppearanceControls
        transition: 'bottom 0.3s ease-in-out',
    };

    const toggleButtonStyle: React.CSSProperties = {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'transparent',
        border: 'none',
        color: colors.text.primary,
        cursor: 'pointer',
        fontSize: '1em',
        zIndex: 11,
    };

    const contentWrapperStyle: React.CSSProperties = {
        transition: 'all 0.3s ease-in-out',
        maxHeight: isCollapsed ? '0' : '100px',
        overflow: 'hidden',
        opacity: isCollapsed ? 0 : 1,
    };

    const topLabelStyle: React.CSSProperties = {
        display: 'block',
        textAlign: 'center',
        marginBottom: '10px',
        fontSize: '1.2em',
    };

    const controlsRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '10px', // Space between this row and the slider
    };

    const arrowButtonStyle: React.CSSProperties = {
        background: colors.interactive.button.background,
        color: colors.text.primary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: '4px',
        padding: '5px 10px',
        margin: '0 10px',
        cursor: 'pointer',
        fontSize: '1.5em',
        lineHeight: '1',
    };

    const disabledArrowButtonStyle: React.CSSProperties = {
        ...arrowButtonStyle,
        opacity: 0.5,
        cursor: 'not-allowed',
    };

    const valueDisplayStyle: React.CSSProperties = {
        fontSize: '1.2em',
        textAlign: 'center',
        minWidth: '100px', // Ensure space for "Slice: X / Y"
    };

    // Custom styles for rc-slider to better fit a dark theme
    const handleStyle: React.CSSProperties = {
        borderColor: colors.primary.main, // Blue border for the handle
        backgroundColor: colors.primary.main, // Blue background for the handle
        opacity: 1,
        height: 18, // Slightly larger handle
        width: 18,
        marginTop: -7, // Adjust vertical position
    };

    const trackStyle: React.CSSProperties = {
        backgroundColor: colors.interactive.slider.selected, // Blue track for the selected part
        height: 4, // Thinner track
    };

    const railStyle: React.CSSProperties = {
        backgroundColor: colors.interactive.slider.rail, // Darker rail for the unselected part
        height: 4, // Thinner rail
    };

    const isOverallDisabled = disabled || max < min;

    const handleRcSliderChange = useCallback(
        (newValue: number | number[]) => {
            if (typeof newValue === 'number' && !isOverallDisabled) {
                onChange(newValue);
            }
        },
        [onChange, isOverallDisabled]
    );

    const handleLeftArrowClick = useCallback(() => {
        if (!isOverallDisabled && value > min) {
            onChange(value - 1);
        }
    }, [value, min, onChange, isOverallDisabled]);

    const handleRightArrowClick = useCallback(() => {
        if (!isOverallDisabled && value < max) {
            onChange(value + 1);
        }
    }, [value, max, onChange, isOverallDisabled]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isOverallDisabled) return;

            if (event.key === 'ArrowLeft') {
                event.preventDefault(); // Prevent browser scroll or other default actions
                handleLeftArrowClick();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault(); // Prevent browser scroll or other default actions
                handleRightArrowClick();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleLeftArrowClick, handleRightArrowClick, isOverallDisabled]); // Dependencies for the keydown handler

    if (!ActualSlider) {
        // Fallback or error if Slider component could not be resolved
        return <div>Error loading slider component.</div>;
    }

    const isLeftDisabled = isOverallDisabled || value <= min;
    const isRightDisabled = isOverallDisabled || value >= max;

    return (
        <div style={containerStyle}>
            <button onClick={onToggleCollapse} style={toggleButtonStyle}>
                {isCollapsed ? '▲' : '▼'}
            </button>
            <div style={contentWrapperStyle}>
                {label && <span style={topLabelStyle}>{label}</span>}

                {max >= min && (
                    <div style={controlsRowStyle}>
                        <button
                            onClick={handleLeftArrowClick}
                            disabled={isLeftDisabled}
                            style={
                                isLeftDisabled
                                    ? disabledArrowButtonStyle
                                    : arrowButtonStyle
                            }
                        >
                            ‹
                        </button>
                        <div style={valueDisplayStyle}>
                            Slice: {value} / {max}
                        </div>
                        <button
                            onClick={handleRightArrowClick}
                            disabled={isRightDisabled}
                            style={
                                isRightDisabled
                                    ? disabledArrowButtonStyle
                                    : arrowButtonStyle
                            }
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>

            <ActualSlider
                min={min}
                max={max}
                value={value}
                onChange={handleRcSliderChange}
                disabled={isOverallDisabled}
                handleStyle={handleStyle}
                trackStyle={trackStyle}
                railStyle={railStyle}
            />
        </div>
    );
};

export default TimelineSlider;
