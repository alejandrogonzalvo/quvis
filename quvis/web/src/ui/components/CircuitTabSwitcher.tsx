import React, { useState } from 'react';
import { colors } from '../theme/colors.js';

interface CircuitInfo {
    algorithm_name: string;
    circuit_type: 'logical' | 'compiled';
    circuit_stats: {
        original_gates?: number;
        transpiled_gates?: number;
        depth: number;
        qubits: number;
        swap_count?: number;
    };
}

interface CircuitTabSwitcherProps {
    circuits: CircuitInfo[];
    currentCircuitIndex: number;
    onCircuitChange: (index: number) => void;
    disabled?: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const CircuitTabSwitcher: React.FC<CircuitTabSwitcherProps> = ({
    circuits,
    currentCircuitIndex,
    onCircuitChange,
    disabled = false,
    isCollapsed,
    onToggleCollapse,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: colors.ui.background,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        border: `1px solid ${colors.ui.border}`,
        padding: '12px',
        minWidth: isCollapsed ? '200px' : '400px',
        maxWidth: isCollapsed
            ? '200px'
            : circuits.length > 5
              ? '700px'
              : '90vw',
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'all 0.3s ease',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'background-color 0.2s ease',
        marginBottom: isCollapsed ? '0' : '8px',
    };

    const headerHoverStyle: React.CSSProperties = {
        backgroundColor: colors.ui.surface,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '12px',
        fontWeight: 600,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        userSelect: 'none',
        margin: '0 8px',
    };

    const toggleIconStyle: React.CSSProperties = {
        fontSize: '12px',
        color: colors.text.secondary,
        fontWeight: 600,
        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
        transition: 'transform 0.3s ease',
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const tabsContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        flexWrap: circuits.length > 5 ? 'nowrap' : 'wrap',
        justifyContent: circuits.length > 5 ? 'flex-start' : 'center',
        opacity: isCollapsed ? 0 : 1,
        maxHeight: isCollapsed ? '0' : '200px',
        overflow: circuits.length > 5 ? 'auto' : 'hidden',
        transition: 'all 0.3s ease',
        // Add scrollbar styling
        scrollbarWidth: 'thin',
        scrollbarColor: `${colors.ui.border} transparent`,
    };

    // Add custom scrollbar styles for webkit browsers
    const scrollbarStyles =
        circuits.length > 5
            ? `
        .circuit-tabs-container::-webkit-scrollbar {
            height: 8px;
        }
        .circuit-tabs-container::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 4px;
        }
        .circuit-tabs-container::-webkit-scrollbar-thumb {
            background: ${colors.ui.border};
            border-radius: 4px;
        }
        .circuit-tabs-container::-webkit-scrollbar-thumb:hover {
            background: ${colors.text.secondary};
        }
    `
            : '';

    const getTabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '8px 12px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: isActive ? colors.ui.accent : colors.ui.surface,
        color: isActive ? colors.text.primary : colors.text.secondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        textAlign: 'center',
        minWidth: '120px',
        flex: '0 0 auto',
    });

    const tabNameStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
    };

    const tabInfoStyle: React.CSSProperties = {
        fontSize: '11px',
        opacity: 0.8,
        lineHeight: '14px',
    };

    const typeIndicatorStyle = (
        type: 'logical' | 'compiled'
    ): React.CSSProperties => ({
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color:
            type === 'logical'
                ? colors.circuit.logical
                : colors.circuit.compiled,
        backgroundColor:
            type === 'logical'
                ? `${colors.circuit.logical}20`
                : `${colors.circuit.compiled}20`,
        padding: '2px 6px',
        borderRadius: '3px',
        marginTop: '2px',
        alignSelf: 'center',
    });

    const formatCircuitInfo = (circuit: CircuitInfo): string => {
        const stats = circuit.circuit_stats;
        const parts = [`${stats.qubits}Q`, `${stats.depth}D`];

        if (
            circuit.circuit_type === 'compiled' &&
            stats.swap_count !== undefined
        ) {
            parts.push(`${stats.swap_count}S`);
        }

        return parts.join(' • ');
    };

    return (
        <div style={containerStyle}>
            {circuits.length > 5 && <style>{scrollbarStyles}</style>}
            <div
                style={{
                    ...headerStyle,
                    ...(isHovered ? headerHoverStyle : {}),
                }}
                onClick={onToggleCollapse}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <span style={labelStyle}>Circuit Tabs ({circuits.length})</span>
                <div style={toggleIconStyle}>▼</div>
            </div>

            {!isCollapsed && (
                <div
                    className="circuit-tabs-container"
                    style={tabsContainerStyle}
                >
                    {circuits.map((circuit, index) => (
                        <button
                            key={index}
                            style={getTabStyle(index === currentCircuitIndex)}
                            onClick={() => onCircuitChange(index)}
                            disabled={disabled}
                        >
                            <span
                                style={typeIndicatorStyle(circuit.circuit_type)}
                            >
                                {circuit.circuit_type}
                            </span>
                            <span style={tabNameStyle}>
                                {circuit.algorithm_name}
                            </span>
                            <span style={tabInfoStyle}>
                                {formatCircuitInfo(circuit)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CircuitTabSwitcher;
