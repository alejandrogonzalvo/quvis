import React, { useState } from 'react';
import { colors } from '../theme/colors.js';
import type { Playground } from '../../scene/Playground.js';

interface LightBackgroundToggleProps {
    lightMode: boolean;
    onToggle: (lightMode: boolean) => void;
    playground?: Playground | null;
    bottomPosition: string;
}

const LightBackgroundToggle: React.FC<LightBackgroundToggleProps> = ({
    lightMode,
    onToggle,
    playground,
    bottomPosition,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const handleClick = () => {
        const newLightMode = !lightMode;
        onToggle(newLightMode);
        if (playground) {
            playground.setLightBackground(newLightMode);
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: bottomPosition,
        right: '20px',
        zIndex: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
    };

    const toggleButtonStyle: React.CSSProperties = {
        width: '48px',
        height: '48px',
        backgroundColor: isHovered 
            ? colors.ui.surface 
            : colors.background.panel,
        border: `1px solid ${colors.border.light}`,
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: colors.text.primary,
        transition: 'all 0.2s ease',
        boxShadow: `0 2px 10px ${colors.shadow.light}`,
        position: 'relative',
    };

    const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '100%',
        right: '0',
        marginBottom: '8px',
        padding: '8px 12px',
        backgroundColor: colors.background.panelSolid,
        color: colors.text.primary,
        fontSize: '12px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        boxShadow: `0 2px 10px ${colors.shadow.medium}`,
        opacity: showTooltip ? 1 : 0,
        visibility: showTooltip ? 'visible' : 'hidden',
        transform: showTooltip ? 'translateY(0)' : 'translateY(4px)',
        transition: 'all 0.2s ease',
        pointerEvents: 'none',
        zIndex: 100,
    };

    // Tooltip arrow
    const tooltipArrowStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        right: '16px',
        width: '0',
        height: '0',
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: `4px solid ${colors.background.panelSolid}`,
    };

    // Use sun and moon unicode symbols
    const icon = lightMode ? '☀️' : '🌙';
    const tooltipText = lightMode 
        ? 'Switch to dark background' 
        : 'Switch to light background';

    return (
        <div style={containerStyle}>
            <button
                style={toggleButtonStyle}
                onClick={handleClick}
                onMouseEnter={() => {
                    setIsHovered(true);
                    setShowTooltip(true);
                }}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setShowTooltip(false);
                }}
                title={tooltipText}
            >
                {icon}
                <div style={tooltipStyle}>
                    {tooltipText}
                    <div style={tooltipArrowStyle} />
                </div>
            </button>
        </div>
    );
};

export default LightBackgroundToggle;