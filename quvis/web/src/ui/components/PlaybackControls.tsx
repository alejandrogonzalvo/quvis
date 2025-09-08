import React, { useState } from 'react';
import RCSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { colors } from '../theme/colors.js';

interface PlaybackControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    speed: number;
    onSpeedChange: (speed: number) => void;
    disabled: boolean;
    isAtEnd: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
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
    isCollapsed,
    onToggleCollapse,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '250px',
        padding: '15px',
        boxSizing: 'border-box',
        zIndex: 10,
        backgroundColor: colors.background.panel,
        borderRadius: '8px',
        boxShadow: `0 2px 10px ${colors.shadow.light}`,
        color: colors.text.primary,
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'all 0.3s ease',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'background-color 0.2s ease',
        marginBottom: isCollapsed ? '0' : '10px',
    };

    const headerHoverStyle: React.CSSProperties = {
        backgroundColor: colors.ui.surface,
    };

    const headerTitleStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 600,
        color: colors.text.primary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '0',
    };

    const toggleIconStyle: React.CSSProperties = {
        fontSize: '12px',
        color: colors.text.secondary,
        fontWeight: 600,
        transition: 'transform 0.3s ease, color 0.2s ease',
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
    };

    const contentStyle: React.CSSProperties = {
        opacity: 1,
        maxHeight: '150px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
    };

    const collapsedContentStyle: React.CSSProperties = {
        opacity: 0,
        maxHeight: '0',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
    };

    const controlsRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: '10px',
    };

    const buttonStyle: React.CSSProperties = {
        background: colors.background.panelSolid,
        color: colors.text.primary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: '4px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: '1em',
        lineHeight: '1',
        minWidth: '40px',
        transition: 'all 0.2s ease',
    };

    const disabledButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        opacity: 0.5,
        cursor: 'not-allowed',
    };

    const sliderContainerStyle: React.CSSProperties = {
        padding: '0 10px',
    };

    const sliderLabelStyle: React.CSSProperties = {
        fontSize: '0.9em',
        marginBottom: '8px',
        fontWeight: 500,
        color: colors.text.primary,
    };

    return (
        <div style={containerStyle}>
            <div
                style={{
                    ...headerStyle,
                    ...(isHovered ? headerHoverStyle : {}),
                }}
                onClick={onToggleCollapse}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <h4 style={headerTitleStyle}>Playback Controls</h4>
                <div
                    style={{
                        ...toggleIconStyle,
                        transform: isCollapsed
                            ? 'rotate(0deg)'
                            : 'rotate(180deg)',
                        color: isHovered
                            ? colors.text.primary
                            : colors.text.secondary,
                    }}
                >
                    ▼
                </div>
            </div>

            <div style={isCollapsed ? collapsedContentStyle : contentStyle}>
                <div style={controlsRowStyle}>
                    <button
                        onClick={onPlayPause}
                        disabled={disabled || isAtEnd}
                        style={
                            disabled || isAtEnd
                                ? disabledButtonStyle
                                : buttonStyle
                        }
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                </div>

                <div style={sliderContainerStyle}>
                    <div style={sliderLabelStyle}>
                        Speed:{' '}
                        {speed >= 0.001
                            ? `${(speed * 1000).toFixed(0)}ms`
                            : speed >= 0.000001
                              ? `${(speed * 1000000).toFixed(0)}μs`
                              : `${(speed * 1000000).toFixed(1)}μs`}{' '}
                        per slice
                    </div>
                    <ActualSlider
                        min={0.0000001}
                        max={0.1}
                        step={0.000001}
                        value={speed}
                        onChange={(value: number) => onSpeedChange(value)}
                        disabled={disabled}
                        trackStyle={{
                            backgroundColor: colors.primary.main,
                            height: 4,
                        }}
                        railStyle={{
                            backgroundColor: colors.ui.border,
                            height: 4,
                        }}
                        handleStyle={{
                            borderColor: colors.primary.main,
                            backgroundColor: colors.primary.main,
                            width: 16,
                            height: 16,
                            marginTop: -6,
                            opacity: disabled ? 0.5 : 1,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PlaybackControls;
