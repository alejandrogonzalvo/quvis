import React, { useRef, useEffect, useState } from 'react';
import { Playground, TooltipData } from '../scene/Playground.js';
import TimelineSlider from './components/TimelineSlider.js';
import AppearanceControls from './components/AppearanceControls.js';
import LayoutControls from './components/LayoutControls.js';
import FidelityControls from './components/FidelityControls.js';
import PlaygroundParameterSelection, {
    PlaygroundParams,
} from './components/PlaygroundParameterSelection.js';
import LoadingIndicator from './components/LoadingIndicator.js';
import CircuitTabSwitcher from './components/CircuitTabSwitcher.js';
import HeatmapControls from './components/HeatmapControls.js';
import Tooltip from './components/Tooltip.js';
import PlaybackControls from './components/PlaybackControls.js';
import DebugInfo from './components/DebugInfo.js';
import LightBackgroundToggle from './components/LightBackgroundToggle.js';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp.js';
import BackendConnectionError from './components/BackendConnectionError.js';
import { colors } from './theme/colors.js';
import { getCircuitGenerationUrl } from '../config/api.js';

const BASE_TOP_MARGIN_PX = 20;
const INTER_PANEL_SPACING_PX = 20;
const COLLAPSED_PANEL_HEADER_HEIGHT_PX = 50;
const PANEL_BOTTOM_PADDING_PX = 15;
const CONTROL_GROUP_APPROX_HEIGHT_PX = 65;

const APPEARANCE_PANEL_SLIDER_COUNT = 4;
const APPEARANCE_PANEL_EXPANDED_CONTENT_HEIGHT =
    APPEARANCE_PANEL_SLIDER_COUNT * CONTROL_GROUP_APPROX_HEIGHT_PX;
const APPEARANCE_HEADER_ADJUSTMENT_PX = 20;
const APPEARANCE_PANEL_EXPANDED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX +
    APPEARANCE_PANEL_EXPANDED_CONTENT_HEIGHT +
    PANEL_BOTTOM_PADDING_PX +
    APPEARANCE_HEADER_ADJUSTMENT_PX;
const APPEARANCE_PANEL_COLLAPSED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX + PANEL_BOTTOM_PADDING_PX;

// Constants for FidelityControls panel
const FIDELITY_PANEL_SLIDER_COUNT = 2;
const FIDELITY_PANEL_EXPANDED_CONTENT_HEIGHT =
    FIDELITY_PANEL_SLIDER_COUNT * CONTROL_GROUP_APPROX_HEIGHT_PX;
const FIDELITY_HEADER_ADJUSTMENT_PX = 10;
const FIDELITY_PANEL_EXPANDED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX +
    FIDELITY_PANEL_EXPANDED_CONTENT_HEIGHT +
    PANEL_BOTTOM_PADDING_PX +
    FIDELITY_HEADER_ADJUSTMENT_PX;
const FIDELITY_PANEL_COLLAPSED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX + PANEL_BOTTOM_PADDING_PX;

// Constants for right-side components
const PLAYBACK_CONTROLS_EXPANDED_HEIGHT_PX = 143;  // Container padding (30px) + header (24px) + content (70px)
const PLAYBACK_CONTROLS_COLLAPSED_HEIGHT_PX = 54;  // Container padding (30px) + header (24px) only
const DEBUG_INFO_HEIGHT_PX = 80;
const LIGHT_TOGGLE_HEIGHT_PX = 48;
const BASE_BOTTOM_MARGIN_PX = 20;

const App: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const playgroundRef = useRef<Playground | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState<string>('Loading');
    const [compilationProgress, setCompilationProgress] = useState<string[]>(
        []
    );
    const [currentParams, setCurrentParams] = useState<PlaygroundParams | null>(
        null
    );

    const [currentCircuitIndex, setCurrentCircuitIndex] = useState<number>(0);
    const [circuitInfo, setCircuitInfo] = useState<
        Array<{
            algorithm_name: string;
            circuit_type: 'logical' | 'compiled';
            circuit_stats: any;
        }>
    >([]);

    // State for timeline
    const [maxSliceIndex, setMaxSliceIndex] = useState<number>(0);
    const [actualSliceCount, setActualSliceCount] = useState<number>(0);
    const [currentSliceValue, setCurrentSliceValue] = useState<number>(0);
    const [isTimelineInitialized, setIsTimelineInitialized] =
        useState<boolean>(false);
    const [isPlaygroundInitialized, setIsPlaygroundInitialized] =
        useState<boolean>(false);

    // State for AppearanceControls initial values (matching Playground defaults)
    const [initialAppearance, setInitialAppearance] = useState({
        qubitSize: 1.0,
        connectionThickness: 0.05,
        inactiveAlpha: 0.1,
        renderBlochSpheres: false,
        renderConnectionLines: true,
    });

    // State for LayoutControls initial values (matching Playground defaults)
    const [initialLayout, setInitialLayout] = useState({
        repelForce: 0.6,
        idealDistance: 1.0,
        gridIdealDistance: 1.0,
        iterations: 500,
        coolingFactor: 1.0,
        attractForce: 0.1,
    });

    // State for HeatmapControls initial values (matching Playground defaults)
    const [initialHeatmapSettings, setInitialHeatmapSettings] = useState({
        maxSlices: -1,
        baseSize: 500.0,
    });

    // State for FidelityControls initial values
    const [initialFidelitySettings, setInitialFidelitySettings] = useState({
        oneQubitBase: 0.99,
        twoQubitBase: 0.98,
    });

    // State for Tooltip
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipContent, setTooltipContent] = useState('');
    const [tooltipX, setTooltipX] = useState(0);
    const [tooltipY, setTooltipY] = useState(0);

    // State for panel collapse
    const [isAppearanceCollapsed, setIsAppearanceCollapsed] = useState(false);
    const [isLayoutCollapsed, setIsLayoutCollapsed] = useState(false);
    const [isFidelityCollapsed, setIsFidelityCollapsed] = useState(false);
    const [isHeatmapCollapsed, setIsHeatmapCollapsed] = useState(false);
    const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
    const [isPlaybackCollapsed, setIsPlaybackCollapsed] = useState(false);
    const [isCircuitTabsCollapsed, setIsCircuitTabsCollapsed] = useState(false);
    const [isKeyboardShortcutsVisible, setIsKeyboardShortcutsVisible] = useState(false);

    // State for playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(0.01); // 10ms per slice

    // State for Debug Info
    const [fps, setFps] = useState(0);
    const [layoutTime, setLayoutTime] = useState(0);

    // State for UI visibility
    const [isUiVisible, setIsUiVisible] = useState(true);

    // State for light background mode
    const [lightMode, setLightMode] = useState(false);

    // State for Playground data (for library mode)
    const [playgroundData, setPlaygroundData] = useState<any>(null);

    // State for backend connection error
    const [showBackendError, setShowBackendError] = useState(false);

    // Check backend connection on startup
    useEffect(() => {
        const checkBackendConnection = async () => {
            try {
                const apiUrl = getCircuitGenerationUrl();
                // Only check if using external API (not Vite middleware)
                if (apiUrl && apiUrl.startsWith('http')) {
                    const healthUrl = apiUrl.replace('/api/generate-circuit', '/api/health');
                    const response = await fetch(healthUrl, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000)
                    });
                    if (!response.ok) {
                        setShowBackendError(true);
                    }
                }
            } catch (error) {
                // Backend not available
                const apiUrl = getCircuitGenerationUrl();
                if (apiUrl && apiUrl.startsWith('http')) {
                    setShowBackendError(true);
                }
            }
        };

        checkBackendConnection();
    }, []);

    // Check for library mode on app initialization
    useEffect(() => {
        // Check if we're in library mode via environment variables
        const isLibraryModeFromEnv =
            (import.meta as any).env.VITE_LIBRARY_MODE === 'true';
        const libraryDataFile =
            (import.meta as any).env.VITE_LIBRARY_DATA_FILE ||
            'temp_circuit_data.json';

        if (isLibraryModeFromEnv) {
            console.log('🚀 Library mode activated');

            // Immediately set library mode
            // setIsLibraryMode(true); // This was causing an error, removed

            // Load the data with retry mechanism
            const loadLibraryData = async () => {
                const maxRetries = 15; // Increased retries for better reliability
                let retryCount = 0;

                const attemptLoad = async (): Promise<void> => {
                    try {
                        const dataResponse = await fetch(
                            `/${libraryDataFile}?t=${Date.now()}`
                        );
                        if (dataResponse.ok) {
                            const data = await dataResponse.json();
                            console.log('✅ Circuit data loaded successfully');

                            // All data should be in library_multi format
                            setCurrentCircuitIndex(0);
                            setCircuitInfo(
                                data.circuits.map((circuit: any) => ({
                                    algorithm_name: circuit.algorithm_name,
                                    circuit_type: circuit.circuit_type,
                                    circuit_stats: circuit.circuit_stats,
                                }))
                            );
                            console.log(
                                `🔄 Loaded ${data.circuits.length} circuits`
                            );

                            setPlaygroundData(data);
                            return;
                        } else {
                            throw new Error(
                                `HTTP ${dataResponse.status}: ${dataResponse.statusText}`
                            );
                        }
                    } catch (error) {
                        retryCount++;

                        // Different handling for different error types
                        let errorMessage = 'Unknown error';
                        let isNetworkError = false;

                        if (
                            error instanceof TypeError &&
                            error.message.includes('NetworkError')
                        ) {
                            errorMessage = 'Development server not ready yet';
                            isNetworkError = true;
                        } else if (
                            error instanceof TypeError &&
                            error.message.includes('fetch')
                        ) {
                            errorMessage = 'Server not responding';
                            isNetworkError = true;
                        } else if (error instanceof Error) {
                            errorMessage = error.message;
                        }

                        if (retryCount >= maxRetries) {
                            console.error(
                                `❌ Failed to load circuit data after ${maxRetries} attempts`
                            );
                            console.error(`💡 Last error: ${errorMessage}`);
                            return;
                        }

                        // Progressive delay: start faster for network errors, slower for others
                        const baseDelay = isNetworkError ? 500 : 1000;
                        const delay = Math.min(
                            baseDelay * Math.pow(1.5, retryCount - 1),
                            5000
                        );

                        if (retryCount <= 3) {
                            console.log(
                                `⏳ Waiting for server... (${retryCount}/${maxRetries})`
                            );
                        }

                        await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                        );
                        return attemptLoad();
                    }
                };

                await attemptLoad();
            };

            loadLibraryData();
        }
    }, []);

    const toggleAppearanceCollapse = () => {
        setIsAppearanceCollapsed(!isAppearanceCollapsed);
        setTooltipVisible(false);
    };

    const toggleLayoutCollapse = () => {
        setIsLayoutCollapsed(!isLayoutCollapsed);
    };

    const toggleFidelityCollapse = () => {
        setIsFidelityCollapsed(!isFidelityCollapsed);
    };

    const toggleHeatmapCollapse = () => {
        setIsHeatmapCollapsed(!isHeatmapCollapsed);
    };

    const toggleTimelineCollapse = () => {
        setIsTimelineCollapsed(!isTimelineCollapsed);
    };

    const togglePlaybackCollapse = () => {
        setIsPlaybackCollapsed(!isPlaybackCollapsed);
    };

    const toggleCircuitTabsCollapse = () => {
        setIsCircuitTabsCollapsed(!isCircuitTabsCollapsed);
    };

    const toggleKeyboardShortcuts = () => {
        setIsKeyboardShortcutsVisible(!isKeyboardShortcutsVisible);
    };

    const collapseAllPanels = () => {
        setIsAppearanceCollapsed(true);
        setIsLayoutCollapsed(true);
        setIsFidelityCollapsed(true);
        setIsHeatmapCollapsed(true);
        setIsTimelineCollapsed(true);
        setIsPlaybackCollapsed(true);
        setIsCircuitTabsCollapsed(true);
    };

    const expandAllPanels = () => {
        setIsAppearanceCollapsed(false);
        setIsLayoutCollapsed(false);
        setIsFidelityCollapsed(false);
        setIsHeatmapCollapsed(false);
        setIsTimelineCollapsed(false);
        setIsPlaybackCollapsed(false);
        setIsCircuitTabsCollapsed(false);
    };

    const handleRenderBlochSpheresChange = (checked: boolean) => {
        playgroundRef.current?.setBlochSpheresVisible(checked);
    };

    const handleRenderConnectionLinesChange = (checked: boolean) => {
        playgroundRef.current?.setConnectionLinesVisible(checked);
    };

    // Callback for when QubitGrid has loaded slice data
    const handleSlicesLoaded = (
        sliceCount: number,
        initialSliceIndex: number
    ) => {
        setActualSliceCount(sliceCount); // Store the raw slice count
        setMaxSliceIndex(sliceCount > 0 ? sliceCount - 1 : 0); // Max index for slider
        setCurrentSliceValue(initialSliceIndex);
        setIsTimelineInitialized(true);
        setIsLoading(false);
    };

    // Callback for when visualization mode has switched and slice parameters might have changed
    const handleModeSwitched = (
        newSliceCount: number,
        newCurrentSliceIndex: number
    ) => {
        setActualSliceCount(newSliceCount);
        setMaxSliceIndex(newSliceCount > 0 ? newSliceCount - 1 : 0);
        setCurrentSliceValue(newCurrentSliceIndex);
        // Ensure timeline is marked as initialized if there are slices, otherwise not.
        // This handles cases where a mode might have 0 slices.
        setIsTimelineInitialized(newSliceCount > 0);
    };

    const handleTooltipUpdate = (data: any | null) => {
        if (!data) {
            setTooltipVisible(false);
            return;
        }

        // Helper function for pluralization
        const pluralize = (count: number, singular: string) => {
            return count === 1 ? singular : `${singular}s`;
        };

        let content = `Qubit ${data.id}\n`;
        const isQubitGateData =
            data.oneQubitGatesInWindow !== undefined &&
            data.twoQubitGatesInWindow !== undefined &&
            data.sliceWindowForGateCount !== undefined;
        if (isQubitGateData) {
            const oneQubitGateLabel = pluralize(
                data.oneQubitGatesInWindow,
                '1-Qubit Gate'
            );
            const twoQubitGateLabel = pluralize(
                data.twoQubitGatesInWindow,
                '2-Qubit Gate'
            );

            content += `${oneQubitGateLabel}: ${data.oneQubitGatesInWindow}\n`;
            content += `${twoQubitGateLabel}: ${data.twoQubitGatesInWindow}`;

            if (data.fidelity !== undefined) {
                content += `\nFidelity: ${data.fidelity.toFixed(4)}`;
            }
        } else if (data.stateName) {
            content += `|${data.stateName}⟩`;
        }

        setTooltipContent(content);
        setTooltipX(data.x);
        setTooltipY(data.y);
        setTooltipVisible(true);
    };

    const handleParameterGeneration = async (params: PlaygroundParams) => {
        setIsLoading(true);
        setCurrentParams(params);
        setLoadingStage('Preparing');
        setCompilationProgress([]);

        // Reset playground and timeline related states
        if (playgroundRef.current) {
            playgroundRef.current.dispose();
            playgroundRef.current = null;
        }
        setIsPlaygroundInitialized(false);
        setIsTimelineInitialized(false);
        setMaxSliceIndex(0);
        setActualSliceCount(0);
        setCurrentSliceValue(0);
        setPlaygroundData(null); // Reset playground data

        try {
            setLoadingStage('Compiling Circuit');
            setCompilationProgress(['Initializing circuit generation...']);

            // Call the circuit generation API
            const response = await fetch(getCircuitGenerationUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    algorithm: params.algorithm,
                    num_qubits: params.numQubits,
                    physical_qubits: params.physicalQubits,
                    topology: params.topology,
                    optimization_level: params.optimizationLevel,
                    custom_params: params.customParams || {},
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const result = await response.json();

            if (!result.generation_successful) {
                throw new Error(result.error || 'Circuit generation failed');
            }

            // Add compilation progress info - playground always generates multi-circuit format
            const logicalCircuit = result.circuits.find(
                (c: any) => c.circuit_type === 'logical'
            );
            const compiledCircuit = result.circuits.find(
                (c: any) => c.circuit_type === 'compiled'
            );

            const progress = [
                'Circuit generation completed',
                `Generated ${logicalCircuit?.circuit_stats?.original_gates || 0} logical gates`,
                `Transpiled to ${compiledCircuit?.circuit_stats?.transpiled_gates || 0} physical gates`,
                `Added ${compiledCircuit?.circuit_stats?.swap_count || 0} SWAP gates for routing`,
                `Routing overhead: ${compiledCircuit?.routing_analysis?.routing_overhead_percentage?.toFixed(1) || 0}%`,
            ];

            setCompilationProgress(progress);

            // Small delay to show the compilation results
            await new Promise((resolve) => setTimeout(resolve, 1000));

            setLoadingStage('Rendering Visualization');
            setCompilationProgress([
                ...progress,
                'Initializing 3D renderer...',
            ]);

            // Playground always generates multi-circuit data (logical + compiled)
            setCurrentCircuitIndex(0);
            setCircuitInfo(
                result.circuits.map((circuit: any) => ({
                    algorithm_name: circuit.algorithm_name,
                    circuit_type: circuit.circuit_type,
                    circuit_stats: circuit.circuit_stats,
                }))
            );
            console.log(
                `🔄 Playground generated ${result.circuits.length} circuits`
            );

            // Set the playground data - this will trigger the useEffect to create the Playground
            setPlaygroundData(result);
        } catch (error) {
            console.error('❌ Circuit generation failed:', error);
            setIsLoading(false);
            setLoadingStage('Loading');
            setCompilationProgress([]);
            setCurrentParams(null);

            // Check if it's a network error (backend not available)
            if (error instanceof TypeError && error.message.includes('fetch')) {
                setShowBackendError(true);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === '0' && playgroundRef.current) {
                playgroundRef.current.resetCamera();
            } else if (event.key.toLowerCase() === 'c') {
                collapseAllPanels();
            } else if (event.key.toLowerCase() === 'e') {
                expandAllPanels();
            } else if (
                event.code === 'Space' &&
                isPlaygroundInitialized &&
                actualSliceCount > 0
            ) {
                event.preventDefault();
                handlePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPlaygroundInitialized, actualSliceCount]);

    useEffect(() => {
        if (!isPlaying || !isPlaygroundInitialized) {
            return;
        }

        if (currentSliceValue >= maxSliceIndex) {
            setIsPlaying(false); // Stop at the end
            return;
        }

        const timerId = setTimeout(() => {
            // Directly increment slice value
            const nextSlice = currentSliceValue + 1;
            if (nextSlice <= maxSliceIndex) {
                setCurrentSliceValue(nextSlice);
                if (playgroundRef.current) {
                    playgroundRef.current.setCurrentSlice(nextSlice);
                }
            }
        }, playbackSpeed * 1000);

        return () => clearTimeout(timerId);
    }, [
        isPlaying,
        currentSliceValue,
        maxSliceIndex,
        playbackSpeed,
        isPlaygroundInitialized,
    ]);

    useEffect(() => {
        if (!mountRef.current) {
            return;
        }

        if (!playgroundData) {
            return;
        }

        if (playgroundRef.current) {
            return;
        }

        const playgroundInstance = new Playground(
            mountRef.current,
            playgroundData,
            'compiled',
            handleSlicesLoaded,
            handleTooltipUpdate,
            handleModeSwitched
        );
        playgroundRef.current = playgroundInstance;
        setIsPlaygroundInitialized(true);
        playgroundInstance.animate();

        if (isLoading) {
            setCompilationProgress((prev) => [
                ...prev,
                '3D visualization loaded',
                'Ready for interaction',
            ]);
            setTimeout(() => {
                setIsLoading(false);
                setLoadingStage('Loading');
                setCompilationProgress([]);
                setCurrentParams(null);
            }, 500); // Small delay to show completion
        }

        setInitialAppearance({
            qubitSize: playgroundInstance.currentQubitSize,
            connectionThickness: playgroundInstance.currentConnectionThickness,
            inactiveAlpha: playgroundInstance.currentInactiveAlpha,
            renderBlochSpheres: playgroundInstance.areBlochSpheresVisible,
            renderConnectionLines: playgroundInstance.areConnectionLinesVisible,
        });
        setInitialLayout({
            repelForce: playgroundInstance.currentRepelForce,
            idealDistance: playgroundInstance.currentIdealDistance,
            gridIdealDistance: 1.0, // Default value
            iterations: playgroundInstance.currentIterations,
            coolingFactor: playgroundInstance.currentCoolingFactor,
        });
        setInitialHeatmapSettings({
            maxSlices: playgroundInstance.maxHeatmapSlices,
            baseSize: playgroundInstance.currentBaseSize,
        });
        setInitialFidelitySettings({
            oneQubitBase: playgroundInstance.currentOneQubitFidelityBase,
            twoQubitBase: playgroundInstance.currentTwoQubitFidelityBase,
        });
        // Initialize light mode from playground background state
        setLightMode(playgroundInstance.isLightBackground());

        // Set up keyboard controller help toggle callback
        const keyboardController = playgroundInstance.getKeyboardController();
        if (keyboardController) {
            keyboardController.setHelpToggleCallback(() => {
                setIsKeyboardShortcutsVisible(prev => !prev);
            });
        }
    }, [playgroundData]);

    // Effect specifically for dataset changes to dispose the old playground
    useEffect(() => {
        return () => {
            // This cleanup runs when playgroundData is about to change OR on unmount.
            if (playgroundRef.current) {
                console.log(
                    'Disposing playground due to dataset change or unmount. Instance ID:',
                    playgroundRef.current.instanceId
                );
                playgroundRef.current.dispose();
                playgroundRef.current = null;
                setIsPlaygroundInitialized(false);
                setIsTimelineInitialized(false);
                // Reset other related states if necessary
                setActualSliceCount(0);
                setMaxSliceIndex(0);
            }
        };
    }, [playgroundData]); // Only run this effect when playgroundData changes

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (playgroundRef.current) {
                setFps(playgroundRef.current.currentFPS);
                const newLayoutTime =
                    playgroundRef.current.lastLayoutCalculationTime;
                if (newLayoutTime > 0) {
                    setLayoutTime(newLayoutTime);
                    // Resetting it in the source might be an option if we only want to show it once
                    // For now, we'll just keep showing the last value.
                }
            }
        }, 500); // Poll for debug info every 500ms

        return () => clearInterval(intervalId);
    }, [isPlaygroundInitialized]); // Rerun when playground is initialized

    const handleTimelineChange = (newSliceIndex: number) => {
        if (isPlaying) {
            setIsPlaying(false);
        }
        setCurrentSliceValue(newSliceIndex);
        if (playgroundRef.current) {
            playgroundRef.current.setCurrentSlice(newSliceIndex);
        }
    };

    // Callback for circuit tab switching
    const handleCircuitChange = (circuitIndex: number) => {
        if (playgroundRef.current) {
            playgroundRef.current.switchToCircuit(circuitIndex);
            setCurrentCircuitIndex(circuitIndex);
        }
    };

    const handlePlayPause = () => {
        if (currentSliceValue >= maxSliceIndex && !isPlaying) {
            return; // Don't start playing if at the end
        }
        setIsPlaying((prev) => !prev);
    };

    const handleSpeedChange = (newSpeed: number) => {
        setPlaybackSpeed(newSpeed);
    };

    const handleLightModeToggle = (newLightMode: boolean) => {
        setLightMode(newLightMode);
        if (playgroundRef.current) {
            playgroundRef.current.setLightBackground(newLightMode);
        }
    };

    // Left-side panel positioning (existing logic)
    const fidelityPanelTop = isAppearanceCollapsed
        ? `${BASE_TOP_MARGIN_PX + APPEARANCE_PANEL_COLLAPSED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`
        : `${BASE_TOP_MARGIN_PX + APPEARANCE_PANEL_EXPANDED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`;
    const layoutPanelTop = isFidelityCollapsed
        ? `${parseInt(fidelityPanelTop) + FIDELITY_PANEL_COLLAPSED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`
        : `${parseInt(fidelityPanelTop) + FIDELITY_PANEL_EXPANDED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`;

    // Right-side component positioning (new unified system)
    const playbackControlsHeight = isPlaybackCollapsed 
        ? PLAYBACK_CONTROLS_COLLAPSED_HEIGHT_PX 
        : PLAYBACK_CONTROLS_EXPANDED_HEIGHT_PX;
    
    const debugInfoBottom = `${BASE_BOTTOM_MARGIN_PX + playbackControlsHeight + INTER_PANEL_SPACING_PX}px`;
    const lightToggleBottom = `${parseInt(debugInfoBottom) + DEBUG_INFO_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`;

    return (
        <div className="App">
            {isLoading && (
                <LoadingIndicator
                    stage={loadingStage}
                    progress={compilationProgress}
                    algorithm={currentParams?.algorithm}
                    numQubits={currentParams?.numQubits}
                    topology={currentParams?.topology}
                />
            )}
            {!playgroundData ? (
                <PlaygroundParameterSelection
                    onGenerate={handleParameterGeneration}
                />
            ) : (
                <>
                    <div
                        ref={mountRef}
                        style={{ width: '100vw', height: '100vh' }}
                    />
                    {isUiVisible && (
                        <>
                            {/* Show CircuitTabSwitcher for multi-circuit mode */}
                            <CircuitTabSwitcher
                                circuits={circuitInfo}
                                currentCircuitIndex={currentCircuitIndex}
                                onCircuitChange={handleCircuitChange}
                                disabled={!isPlaygroundInitialized}
                                isCollapsed={isCircuitTabsCollapsed}
                                onToggleCollapse={toggleCircuitTabsCollapse}
                            />
                            <AppearanceControls
                                playground={playgroundRef.current}
                                initialValues={initialAppearance}
                                isCollapsed={isAppearanceCollapsed}
                                onToggleCollapse={toggleAppearanceCollapse}
                                onRenderBlochSpheresChange={
                                    handleRenderBlochSpheresChange
                                }
                                onRenderConnectionLinesChange={
                                    handleRenderConnectionLinesChange
                                }
                            />
                            <FidelityControls
                                playground={playgroundRef.current}
                                initialValues={initialFidelitySettings}
                                isCollapsed={isFidelityCollapsed}
                                onToggleCollapse={toggleFidelityCollapse}
                                topPosition={fidelityPanelTop}
                            />
                            <LayoutControls
                                playground={playgroundRef.current}
                                initialValues={initialLayout}
                                isCollapsed={isLayoutCollapsed}
                                onToggleCollapse={toggleLayoutCollapse}
                                topPosition={layoutPanelTop}
                                setIsLoading={setIsLoading}
                            />
                            <HeatmapControls
                                playground={playgroundRef.current}
                                initialValues={initialHeatmapSettings}
                                isCollapsed={isHeatmapCollapsed}
                                onToggleCollapse={toggleHeatmapCollapse}
                            />
                            {isTimelineInitialized && actualSliceCount > 0 && (
                                <>
                                    <LightBackgroundToggle
                                        lightMode={lightMode}
                                        onToggle={handleLightModeToggle}
                                        playground={playgroundRef.current}
                                        bottomPosition={lightToggleBottom}
                                    />
                                    <DebugInfo
                                        fps={fps}
                                        layoutTime={layoutTime}
                                        bottomPosition={debugInfoBottom}
                                    />
                                    <PlaybackControls
                                        isPlaying={isPlaying}
                                        onPlayPause={handlePlayPause}
                                        speed={playbackSpeed}
                                        onSpeedChange={handleSpeedChange}
                                        disabled={
                                            !isPlaygroundInitialized ||
                                            actualSliceCount === 0
                                        }
                                        isAtEnd={
                                            currentSliceValue >= maxSliceIndex
                                        }
                                        isCollapsed={isPlaybackCollapsed}
                                        onToggleCollapse={
                                            togglePlaybackCollapse
                                        }
                                    />
                                </>
                            )}
                            {isTimelineInitialized && actualSliceCount > 0 && (
                                <TimelineSlider
                                    min={0}
                                    max={maxSliceIndex}
                                    value={currentSliceValue}
                                    onChange={handleTimelineChange}
                                    disabled={actualSliceCount === 0}
                                    label="Time Slice"
                                    isCollapsed={isTimelineCollapsed}
                                    onToggleCollapse={toggleTimelineCollapse}
                                />
                            )}
                            {isTimelineInitialized &&
                                actualSliceCount === 0 && (
                                    <div
                                        style={{
                                            position: 'fixed',
                                            bottom: '30px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            color: colors.text.primary,
                                            background: colors.shadow.medium,
                                            padding: '10px',
                                            borderRadius: '5px',
                                        }}
                                    >
                                        Loading slice data or no slices found.
                                    </div>
                                )}
                            <Tooltip
                                visible={tooltipVisible}
                                content={tooltipContent}
                                x={tooltipX}
                                y={tooltipY}
                            />
                        </>
                    )}
                </>
            )}

            <KeyboardShortcutsHelp
                isVisible={isKeyboardShortcutsVisible}
                onClose={() => setIsKeyboardShortcutsVisible(false)}
            />

            <BackendConnectionError
                isVisible={showBackendError}
                onClose={() => setShowBackendError(false)}
                apiUrl={getCircuitGenerationUrl()}
            />
        </div>
    );
};

export default App;
