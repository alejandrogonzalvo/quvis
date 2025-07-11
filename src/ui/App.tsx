import React, { useEffect, useRef, useState } from "react";
import { Playground, TooltipData } from "../scene/Playground.js";
import TimelineSlider from "./components/TimelineSlider.js";
import AppearanceControls from "./components/AppearanceControls.js";
import LayoutControls from "./components/LayoutControls.js";
import HeatmapControls from "./components/HeatmapControls.js";
import Tooltip from "./components/Tooltip.js";
import DatasetSelection from "./components/DatasetSelection.js";
import FidelityControls from "./components/FidelityControls.js";
import LoadingIndicator from "./components/LoadingIndicator.js";
import VisualizationModeSwitcher from "./components/VisualizationModeSwitcher.js";
import PlaybackControls from "./components/PlaybackControls.js";
import DebugInfo from "./components/DebugInfo.js";
import { colors } from "./theme/colors.js";

const BASE_TOP_MARGIN_PX = 20;
const INTER_PANEL_SPACING_PX = 20;
const COLLAPSED_PANEL_HEADER_HEIGHT_PX = 50;
const PANEL_BOTTOM_PADDING_PX = 15;
const CONTROL_GROUP_APPROX_HEIGHT_PX = 65;

const APPEARANCE_PANEL_SLIDER_COUNT = 5;
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

const App: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const playgroundRef = useRef<Playground | null>(null);

    // State for loading indicator
    const [isLoading, setIsLoading] = useState(false);

    // State for dataset selection
    const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

    const [visualizationMode, setVisualizationMode] = useState<
        "compiled" | "logical"
    >("compiled");

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
        baseSize: 500.0,
        renderBlochSpheres: false,
        renderConnectionLines: true,
    });

    // State for LayoutControls initial values (matching Playground defaults)
    const [initialLayout, setInitialLayout] = useState({
        repelForce: 0.6,
        idealDistance: 1.0,
        iterations: 500,
        coolingFactor: 1.0,
    });

    // State for HeatmapControls initial values (matching Playground defaults)
    const [initialHeatmapSlices, setInitialHeatmapSlices] = useState(5);

    // State for FidelityControls initial values
    const [initialFidelitySettings, setInitialFidelitySettings] = useState({
        oneQubitBase: 0.99,
        twoQubitBase: 0.98,
    });

    // State for Tooltip
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipContent, setTooltipContent] = useState("");
    const [tooltipX, setTooltipX] = useState(0);
    const [tooltipY, setTooltipY] = useState(0);

    // State for panel collapse
    const [isAppearanceCollapsed, setIsAppearanceCollapsed] = useState(false);
    const [isLayoutCollapsed, setIsLayoutCollapsed] = useState(false);
    const [isFidelityCollapsed, setIsFidelityCollapsed] = useState(false);

    // State for playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(0.1); // seconds per slice

    // State for Debug Info
    const [fps, setFps] = useState(0);
    const [layoutTime, setLayoutTime] = useState(0);

    // State for UI visibility
    const [isUiVisible, setIsUiVisible] = useState(true);

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

    const handleRenderBlochSpheresChange = (checked: boolean) => {
        playgroundRef.current?.setBlochSpheresVisible(checked);
    };

    const handleRenderConnectionLinesChange = (checked: boolean) => {
        playgroundRef.current?.setConnectionLinesVisible(checked);
    };

    // Callback for dataset selection
    const handleDatasetSelect = (datasetName: string) => {
        setIsLoading(true);
        setSelectedDataset(datasetName);
        // Reset playground and timeline related states if a new dataset is selected
        if (playgroundRef.current) {
            playgroundRef.current.dispose();
            playgroundRef.current = null;
        }
        setIsPlaygroundInitialized(false);
        setIsTimelineInitialized(false);
        setMaxSliceIndex(0); // Reset max index
        setActualSliceCount(0); // Reset actual count
        setCurrentSliceValue(0);
    };

    // Callback for when QubitGrid has loaded slice data
    const handleSlicesLoaded = (
        sliceCount: number,
        initialSliceIndex: number,
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
        newCurrentSliceIndex: number,
    ) => {
        setActualSliceCount(newSliceCount);
        setMaxSliceIndex(newSliceCount > 0 ? newSliceCount - 1 : 0);
        setCurrentSliceValue(newCurrentSliceIndex);
        // Ensure timeline is marked as initialized if there are slices, otherwise not.
        // This handles cases where a mode might have 0 slices.
        setIsTimelineInitialized(newSliceCount > 0);
    };

    const handleTooltipUpdate = (data: TooltipData | null) => {
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
                "1-Qubit Gate",
            );
            const twoQubitGateLabel = pluralize(
                data.twoQubitGatesInWindow,
                "2-Qubit Gate",
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "0" && playgroundRef.current) {
                playgroundRef.current.resetCamera();
            } else if (event.key.toLowerCase() === "h") {
                setIsUiVisible((prev) => !prev);
            } else if (
                event.code === "Space" &&
                isPlaygroundInitialized &&
                actualSliceCount > 0
            ) {
                event.preventDefault();
                handlePlayPause();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
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
        if (mountRef.current && selectedDataset) {
            if (!playgroundRef.current) {
                // Playground does not exist, create it (e.g., on initial load or dataset change)
                const playgroundInstance = new Playground(
                    mountRef.current,
                    selectedDataset,
                    visualizationMode,
                    handleSlicesLoaded,
                    handleTooltipUpdate,
                    handleModeSwitched,
                );
                playgroundRef.current = playgroundInstance;
                setIsPlaygroundInitialized(true);
                playgroundInstance.animate();

                setInitialAppearance({
                    qubitSize: playgroundInstance.currentQubitSize,
                    connectionThickness:
                        playgroundInstance.currentConnectionThickness,
                    inactiveAlpha: playgroundInstance.currentInactiveAlpha,
                    baseSize: playgroundInstance.currentBaseSize,
                    renderBlochSpheres:
                        playgroundInstance.areBlochSpheresVisible,
                    renderConnectionLines:
                        playgroundInstance.areConnectionLinesVisible,
                });
                setInitialLayout({
                    repelForce: playgroundInstance.currentRepelForce,
                    idealDistance: playgroundInstance.currentIdealDistance,
                    iterations: playgroundInstance.currentIterations,
                    coolingFactor: playgroundInstance.currentCoolingFactor,
                });
                setInitialHeatmapSlices(playgroundInstance.maxHeatmapSlices);
                setInitialFidelitySettings({
                    oneQubitBase:
                        playgroundInstance.currentOneQubitFidelityBase,
                    twoQubitBase:
                        playgroundInstance.currentTwoQubitFidelityBase,
                });
            } else {
                // Playground exists, check if only visualizationMode changed
                // Access the current visualization mode of the playground instance
                // This requires Playground to expose its current mode or for us to track the 'last used mode for creation'
                // For now, we assume if playgroundRef.current exists, and visualizationMode in state changes,
                // it's a mode switch on the existing instance.
                // This part of the logic might need refinement if dataset can change without playgroundRef being nullified first.
                playgroundRef.current.setVisualizationMode(visualizationMode);
            }
        }

        // Cleanup logic for when selectedDataset changes OR component unmounts
        return () => {
            if (selectedDataset && playgroundRef.current) {
                // This cleanup should only run if the selectedDataset is about to change,
                // or if the component is unmounting.
                // We don't want to dispose if only visualizationMode changed.
                // This is tricky. A simple way is to check if the new selectedDataset (from a potential future render) is different.
                // However, a change in selectedDataset *will* nullify playgroundRef.current via handleDatasetSelect
                // So, this cleanup as is, might be okay if handleDatasetSelect always runs first for dataset changes.
            }
            // If the effect is re-running due to selectedDataset changing, handleDatasetSelect should have already disposed.
            // If the component is unmounting, this will dispose.
            // If only visualizationMode changed, we DON'T want to dispose here.
            // The current structure: handleDatasetSelect disposes and nulls playgroundRef.current.
            // So, if selectedDataset changes, playgroundRef.current will be null when this effect runs for the new dataset.
        };
    }, [selectedDataset, visualizationMode]);

    // Effect specifically for dataset changes to dispose the old playground
    useEffect(() => {
        return () => {
            // This cleanup runs when selectedDataset is about to change OR on unmount.
            if (playgroundRef.current) {
                console.log(
                    "Disposing playground due to dataset change or unmount. Instance ID:",
                    playgroundRef.current.instanceId,
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
    }, [selectedDataset]); // Only run this effect when selectedDataset changes

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

    const handleModeChange = (mode: "compiled" | "logical") => {
        setVisualizationMode(mode);
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

    const fidelityPanelTop = isAppearanceCollapsed
        ? `${BASE_TOP_MARGIN_PX + APPEARANCE_PANEL_COLLAPSED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`
        : `${BASE_TOP_MARGIN_PX + APPEARANCE_PANEL_EXPANDED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`;
    const layoutPanelTop = isFidelityCollapsed
        ? `${parseInt(fidelityPanelTop) + FIDELITY_PANEL_COLLAPSED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`
        : `${parseInt(fidelityPanelTop) + FIDELITY_PANEL_EXPANDED_HEIGHT_PX + INTER_PANEL_SPACING_PX}px`;

    return (
        <div className="App">
            {isLoading && <LoadingIndicator />}
            {!selectedDataset ? (
                <DatasetSelection onSelect={handleDatasetSelect} />
            ) : (
                <>
                    <div
                        ref={mountRef}
                        style={{ width: "100vw", height: "100vh" }}
                    />
                    {isUiVisible && (
                        <>
                            <VisualizationModeSwitcher
                                currentMode={visualizationMode}
                                onModeChange={handleModeChange}
                                disabled={!isPlaygroundInitialized}
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
                                initialValues={{
                                    maxSlices: initialHeatmapSlices,
                                }}
                            />
                            {isTimelineInitialized && actualSliceCount > 0 && (
                                <>
                                    <DebugInfo
                                        fps={fps}
                                        layoutTime={layoutTime}
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
                                />
                            )}
                            {isTimelineInitialized &&
                                actualSliceCount === 0 && (
                                    <div
                                        style={{
                                            position: "fixed",
                                            bottom: "30px",
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            color: colors.text.primary,
                                            background: colors.shadow.medium,
                                            padding: "10px",
                                            borderRadius: "5px",
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
        </div>
    );
};

export default App;
