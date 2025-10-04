import React, { useState, useEffect } from 'react';
import { colors } from '../theme/colors.js';

const MAX_QUBITS = 1000;
const version = "v0.27.0";

interface PlaygroundParameterSelectionProps {
    onGenerate: (params: PlaygroundParams) => void;
}

interface PlaygroundParams {
    algorithm: string;
    numQubits: number;
    physicalQubits: number;
    topology: string;
    optimizationLevel: number;
    customParams?: Record<string, any>;
}

const PlaygroundParameterSelection: React.FC<
    PlaygroundParameterSelectionProps
> = ({ onGenerate }) => {
    const [algorithm, setAlgorithm] = useState<string>('qft');
    const [logicalQubits, setLogicalQubits] = useState<number>(10);
    const [physicalQubits, setPhysicalQubits] = useState<number>(10);
    const [topology, setTopology] = useState<string>('grid');
    const [optimizationLevel, setOptimizationLevel] = useState<number>(1);
    const [customParams, setCustomParams] = useState<Record<string, any>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [logicalQubitsInput, setLogicalQubitsInput] = useState<string>(
        logicalQubits.toString()
    );
    const [physicalQubitsInput, setPhysicalQubitsInput] = useState<string>(
        physicalQubits.toString()
    );

    useEffect(() => {
        if (physicalQubits < logicalQubits) {
            setPhysicalQubits(logicalQubits);
        }
    }, [logicalQubits, physicalQubits]);

    useEffect(() => {
        setLogicalQubitsInput(logicalQubits.toString());
    }, [logicalQubits]);

    useEffect(() => {
        setPhysicalQubitsInput(physicalQubits.toString());
    }, [physicalQubits]);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: colors.background.main,
        color: colors.text.primary,
        fontFamily: '"Arial", sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
    };

    const mainTitleStyle: React.CSSProperties = {
        fontSize: '72px',
        fontWeight: 'bold',
        color: colors.primary.accent,
        textShadow: `3px 3px 6px ${colors.shadow.text}`,
        marginBottom: '10px',
        textAlign: 'center',
    };

    const versionStyle: React.CSSProperties = {
        fontSize: '16px',
        color: colors.text.disabled,
        marginBottom: '40px',
        textAlign: 'center',
    };

    const linkStyle: React.CSSProperties = {
        color: colors.primary.accent,
        textDecoration: 'none',
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: '40px',
        width: '100%',
        maxWidth: '400px',
    };

    const columnsContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: '80px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '1100px',
        marginBottom: '40px',
    };

    const columnStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        minWidth: '420px',
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: '20px',
        textAlign: 'center',
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        flexWrap: 'wrap',
    };

    const circuitButtonStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '15px 30px',
        fontSize: '18px',
        fontWeight: 'bold',
        border: `2px solid ${isActive ? colors.primary.accent : colors.border.main}`,
        borderRadius: '12px',
        backgroundColor: isActive
            ? colors.primary.accent
            : colors.background.panelSolid,
        color: isActive ? colors.background.main : colors.text.primary,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minWidth: '120px',
        textAlign: 'center',
        boxShadow: isActive ? `0 4px 15px ${colors.primary.accent}40` : 'none',
    });

    const topologyButtonStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        border: `2px solid ${isActive ? colors.primary.accent : colors.border.main}`,
        borderRadius: '8px',
        backgroundColor: isActive
            ? colors.primary.accent
            : colors.background.panelSolid,
        color: isActive ? colors.background.main : colors.text.primary,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minWidth: '100px',
        textAlign: 'center',
        boxShadow: isActive ? `0 2px 10px ${colors.primary.accent}40` : 'none',
    });

    const sliderContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '30px',
    };

    const sliderLabelStyle: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    };

    const sliderWrapperStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        width: '100%',
        maxWidth: '380px',
    };

    const sliderStyle: React.CSSProperties = {
        flex: 1,
        height: '6px',
        background: colors.border.main,
        borderRadius: '3px',
        outline: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
    };

    const sliderValueStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 'bold',
        color: colors.primary.accent,
        minWidth: '60px',
        textAlign: 'center',
        backgroundColor: colors.background.panelSolid,
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${colors.border.main}`,
    };

    const selectStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: '600',
        color: colors.text.primary,
        backgroundColor: colors.background.panelSolid,
        padding: '12px 20px',
        borderRadius: '8px',
        border: `2px solid ${colors.border.main}`,
        cursor: 'pointer',
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
        transition: 'all 0.3s ease',
    };

    const generateButtonStyle: React.CSSProperties = {
        padding: '20px 60px',
        fontSize: '24px',
        fontWeight: 'bold',
        backgroundColor: isGenerating
            ? colors.background.panel
            : colors.primary.accent,
        color: isGenerating ? colors.text.disabled : colors.background.main,
        border: 'none',
        borderRadius: '12px',
        cursor: isGenerating ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: isGenerating ? 0.6 : 1,
        boxShadow: isGenerating
            ? 'none'
            : `0 4px 20px ${colors.primary.accent}40`,
    };

    const qaoacParamsStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        marginTop: '20px',
        padding: '20px',
        backgroundColor: colors.background.panelSolid,
        borderRadius: '12px',
        border: `1px solid ${colors.border.main}`,
    };

    const handleGenerate = async () => {
        if (isGenerating) return;

        setIsGenerating(true);

        const params: PlaygroundParams = {
            algorithm,
            numQubits: logicalQubits,
            physicalQubits: physicalQubits,
            topology,
            optimizationLevel,
            customParams: getCustomParams(),
        };

        try {
            await onGenerate(params);
        } finally {
            setIsGenerating(false);
        }
    };

    const getCustomParams = () => {
        const params: Record<string, any> = {};

        // Add algorithm-specific parameters
        if (algorithm === 'qaoa') {
            params.reps = customParams.reps || 2;
        }

        return params;
    };

    const handleCustomParamChange = (key: string, value: any) => {
        setCustomParams((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleLogicalQubitsInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setLogicalQubitsInput(e.target.value);
    };

    const handleLogicalQubitsInputBlur = () => {
        let value = parseInt(logicalQubitsInput, 10);
        if (isNaN(value)) {
            value = 4; // Default to min
        }
        setLogicalQubits(Math.max(4, Math.min(value, MAX_QUBITS)));
    };

    const handlePhysicalQubitsInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setPhysicalQubitsInput(e.target.value);
    };

    const handlePhysicalQubitsInputBlur = () => {
        let value = parseInt(physicalQubitsInput, 10);
        if (isNaN(value)) {
            value = logicalQubits; // Default to min
        }
        setPhysicalQubits(Math.max(logicalQubits, Math.min(value, MAX_QUBITS)));
    };

    const renderQAOAParams = () => {
        if (algorithm === 'qaoa') {
            return (
                <div style={qaoacParamsStyle}>
                    <div style={sliderLabelStyle}>QAOA Layers (p-value)</div>
                    <div style={sliderWrapperStyle}>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={customParams.reps || 2}
                            onChange={(e) =>
                                handleCustomParamChange(
                                    'reps',
                                    parseInt(e.target.value)
                                )
                            }
                            style={sliderStyle}
                        />
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={customParams.reps || 2}
                            onChange={(e) =>
                                handleCustomParamChange(
                                    'reps',
                                    parseInt(e.target.value)
                                )
                            }
                            style={sliderValueStyle}
                        />
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={containerStyle}>
            <style>
                {`
                    /* Hide number input spinners */
                    input[type="number"]::-webkit-outer-spin-button,
                    input[type="number"]::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    
                    input[type="number"] {
                        -moz-appearance: textfield;
                    }
                `}
            </style>
            <h1 style={mainTitleStyle}>Quvis</h1>
            <p style={versionStyle}>
                Version {version} <br />
                Made by{' '}
                <a
                    href="https://github.com/alejandrogonzalvo/quvis"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                >
                    @alejandrogonzalvo
                </a>
            </p>

            <div style={columnsContainerStyle}>
                {/* Left Column */}
                <div style={columnStyle}>
                    {/* Circuit Selection */}
                    <div style={sectionStyle}>
                        <h2 style={sectionTitleStyle}>Circuit</h2>
                        <div style={buttonGroupStyle}>
                            <button
                                style={circuitButtonStyle(algorithm === 'ghz')}
                                onClick={() => setAlgorithm('ghz')}
                            >
                                GHZ
                            </button>
                            <button
                                style={circuitButtonStyle(algorithm === 'qft')}
                                onClick={() => setAlgorithm('qft')}
                            >
                                QFT
                            </button>
                            <button
                                style={circuitButtonStyle(algorithm === 'qaoa')}
                                onClick={() => setAlgorithm('qaoa')}
                            >
                                QAOA
                            </button>
                        </div>
                        {renderQAOAParams()}
                    </div>

                    {/* Logical Qubits Slider */}
                    <div style={sectionStyle}>
                        <div style={sliderContainerStyle}>
                            <div style={sliderLabelStyle}>Logical Qubits</div>
                            <div style={sliderWrapperStyle}>
                                <input
                                    type="range"
                                    min="4"
                                    max={MAX_QUBITS}
                                    value={logicalQubits}
                                    onChange={(e) =>
                                        setLogicalQubits(
                                            parseInt(e.target.value)
                                        )
                                    }
                                    style={sliderStyle}
                                />
                                <input
                                    type="number"
                                    min="4"
                                    max={MAX_QUBITS}
                                    value={logicalQubitsInput}
                                    onChange={handleLogicalQubitsInputChange}
                                    onBlur={handleLogicalQubitsInputBlur}
                                    style={sliderValueStyle}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={columnStyle}>
                    {/* Topology Selection */}
                    <div style={sectionStyle}>
                        <h2 style={sectionTitleStyle}>Topology</h2>
                        <div style={buttonGroupStyle}>
                            <button
                                style={topologyButtonStyle(topology === 'line')}
                                onClick={() => setTopology('line')}
                            >
                                Line
                            </button>
                            <button
                                style={topologyButtonStyle(topology === 'ring')}
                                onClick={() => setTopology('ring')}
                            >
                                Ring
                            </button>
                            <button
                                style={topologyButtonStyle(topology === 'grid')}
                                onClick={() => setTopology('grid')}
                            >
                                Grid
                            </button>
                            <button
                                style={topologyButtonStyle(
                                    topology === 'heavy_hex'
                                )}
                                onClick={() => setTopology('heavy_hex')}
                            >
                                Heavy Hex
                            </button>
                            <button
                                style={topologyButtonStyle(
                                    topology === 'heavy_square'
                                )}
                                onClick={() => setTopology('heavy_square')}
                            >
                                Heavy Square
                            </button>
                            <button
                                style={topologyButtonStyle(
                                    topology === 'hexagonal'
                                )}
                                onClick={() => setTopology('hexagonal')}
                            >
                                Hexagonal
                            </button>
                            <button
                                style={topologyButtonStyle(topology === 'full')}
                                onClick={() => setTopology('full')}
                            >
                                Full
                            </button>
                        </div>
                    </div>

                    {/* Physical Qubits Slider */}
                    <div style={sectionStyle}>
                        <div style={sliderContainerStyle}>
                            <div style={sliderLabelStyle}>Physical Qubits</div>
                            <div style={sliderWrapperStyle}>
                                <input
                                    type="range"
                                    min={logicalQubits}
                                    max={MAX_QUBITS}
                                    value={physicalQubits}
                                    onChange={(e) =>
                                        setPhysicalQubits(
                                            parseInt(e.target.value)
                                        )
                                    }
                                    style={sliderStyle}
                                />
                                <input
                                    type="number"
                                    min={logicalQubits}
                                    max={MAX_QUBITS}
                                    value={physicalQubitsInput}
                                    onChange={handlePhysicalQubitsInputChange}
                                    onBlur={handlePhysicalQubitsInputBlur}
                                    style={sliderValueStyle}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Optimization Level Dropdown */}
                    <div style={sectionStyle}>
                        <div style={sliderContainerStyle}>
                            <div style={sliderLabelStyle}>
                                Optimization Level
                            </div>
                            <select
                                value={optimizationLevel}
                                onChange={(e) =>
                                    setOptimizationLevel(
                                        parseInt(e.target.value)
                                    )
                                }
                                style={selectStyle}
                            >
                                <option value={0}>
                                    Level 0 - No optimization
                                </option>
                                <option value={1}>
                                    Level 1 - Light optimization
                                </option>
                                <option value={2}>
                                    Level 2 - Heavy optimization
                                </option>
                                <option value={3}>
                                    Level 3 - Max optimization
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                style={generateButtonStyle}
                disabled={isGenerating}
            >
                {isGenerating ? 'Generating...' : 'Visualize'}
            </button>
        </div>
    );
};

export default PlaygroundParameterSelection;
export type { PlaygroundParams };
