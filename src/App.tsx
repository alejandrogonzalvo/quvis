import React, { useEffect, useRef, useState } from "react";
import { Playground, TooltipData } from "./Playground.js"; // Ensure Playground is exported and path is correct
import TimelineSlider from "./components/TimelineSlider.js"; // Import the slider
import AppearanceControls from "./components/AppearanceControls.js"; // Reverted to .js extension
import LayoutControls from "./components/LayoutControls.js"; // Import LayoutControls
import HeatmapControls from "./components/HeatmapControls.js"; // Import HeatmapControls
import Tooltip from "./components/Tooltip.js"; // Import the Tooltip component
import DatasetSelection from "./components/DatasetSelection.js"; // Import the new component
import VisualizationModeSwitcher from "./components/VisualizationModeSwitcher.js"; // Import the new switcher
import "./../style.css"; // Assuming global styles are still desired

// Constants for panel height calculations (in pixels)
const BASE_TOP_MARGIN_PX = 20;
const INTER_PANEL_SPACING_PX = 20;
const COLLAPSED_PANEL_HEADER_HEIGHT_PX = 50; // Approx height of title + toggle button + top/bottom padding of header div
const PANEL_BOTTOM_PADDING_PX = 15; // From panelStyle
const CONTROL_GROUP_APPROX_HEIGHT_PX = 65; // Approx height for one slider group including its margin

const APPEARANCE_PANEL_SLIDER_COUNT = 4;
const APPEARANCE_PANEL_EXPANDED_CONTENT_HEIGHT =
    APPEARANCE_PANEL_SLIDER_COUNT * CONTROL_GROUP_APPROX_HEIGHT_PX;
const APPEARANCE_PANEL_EXPANDED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX +
    APPEARANCE_PANEL_EXPANDED_CONTENT_HEIGHT +
    PANEL_BOTTOM_PADDING_PX;
const APPEARANCE_PANEL_COLLAPSED_HEIGHT_PX =
    COLLAPSED_PANEL_HEADER_HEIGHT_PX + PANEL_BOTTOM_PADDING_PX;

// Layout panel also has a button at the end
// const LAYOUT_PANEL_SLIDER_COUNT = 4;
// const LAYOUT_PANEL_BUTTON_HEIGHT_PX = 45; // Approx height for the button + margin
// const LAYOUT_PANEL_EXPANDED_CONTENT_HEIGHT = (LAYOUT_PANEL_SLIDER_COUNT * CONTROL_GROUP_APPROX_HEIGHT_PX) + LAYOUT_PANEL_BUTTON_HEIGHT_PX;
// const LAYOUT_PANEL_EXPANDED_HEIGHT_PX = COLLAPSED_PANEL_HEADER_HEIGHT_PX + LAYOUT_PANEL_EXPANDED_CONTENT_HEIGHT + PANEL_BOTTOM_PADDING_PX;
// const LAYOUT_PANEL_COLLAPSED_HEIGHT_PX = COLLAPSED_PANEL_HEADER_HEIGHT_PX + PANEL_BOTTOM_PADDING_PX;

const App: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const playgroundRef = useRef<Playground | null>(null);

    // State for dataset selection
    const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

    // State for visualization mode
    const [visualizationMode, setVisualizationMode] = useState<
        "compiled" | "logical"
    >("compiled");

    // State for timeline
    const [maxSliceIndex, setMaxSliceIndex] = useState<number>(0); // Renamed from totalSlices, represents max slider index
    const [actualSliceCount, setActualSliceCount] = useState<number>(0); // New state for the actual number of slices
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
    });

    // State for LayoutControls initial values (matching Playground defaults)
    const [initialLayout, setInitialLayout] = useState({
        repelForce: 0.6,
        idealDistance: 5.0,
        iterations: 500,
        coolingFactor: 1.0,
    });

    // State for HeatmapControls initial values (matching Playground defaults)
    const [initialHeatmapSlices, setInitialHeatmapSlices] = useState(5);

    // State for Tooltip
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipContent, setTooltipContent] = useState("");
    const [tooltipX, setTooltipX] = useState(0);
    const [tooltipY, setTooltipY] = useState(0);

    // State for panel collapse
    const [isAppearanceCollapsed, setIsAppearanceCollapsed] = useState(false);
    const [isLayoutCollapsed, setIsLayoutCollapsed] = useState(false);

    const toggleAppearanceCollapse = () => {
        setIsAppearanceCollapsed(!isAppearanceCollapsed);
    };

    const toggleLayoutCollapse = () => {
        setIsLayoutCollapsed(!isLayoutCollapsed);
    };

    // Callback for dataset selection
    const handleDatasetSelect = (datasetName: string) => {
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
        // setVisualizationMode("compiled"); // Optionally reset mode on new dataset
    };

    // Callback for when QubitGrid has loaded slice data
    const handleSlicesLoaded = (
        sliceCount: number, // This is the actual number of slices from QubitGrid
        initialSliceIndex: number,
    ) => {
        console.log(
            `App: Slices loaded. Count: ${sliceCount}, Initial Index: ${initialSliceIndex}`,
        );
        setActualSliceCount(sliceCount); // Store the raw slice count
        setMaxSliceIndex(sliceCount > 0 ? sliceCount - 1 : 0); // Max index for slider
        setCurrentSliceValue(initialSliceIndex);
        setIsTimelineInitialized(true);
    };

    const handleTooltipUpdate = (data: TooltipData | null) => {
        if (data) {
            setTooltipContent(`Qubit ${data.id}: |${data.stateName}⟩`);
            setTooltipX(data.x);
            setTooltipY(data.y);
            setTooltipVisible(true);
        } else {
            setTooltipVisible(false);
        }
    };

    useEffect(() => {
        if (mountRef.current && selectedDataset && !playgroundRef.current) {
            // Check for selectedDataset and ensure playground isn't already initialized
            const playgroundInstance = new Playground(
                mountRef.current,
                selectedDataset, // Pass the selected dataset name
                visualizationMode, // Pass the current visualization mode
                handleSlicesLoaded,
                handleTooltipUpdate,
            );
            playgroundRef.current = playgroundInstance;
            setIsPlaygroundInitialized(true); // Set playground as initialized
            playgroundInstance.animate();

            // Set initial values for controls from the playground instance
            setInitialAppearance({
                qubitSize: playgroundInstance.currentQubitSize,
                connectionThickness:
                    playgroundInstance.currentConnectionThickness,
                inactiveAlpha: playgroundInstance.currentInactiveAlpha,
                baseSize: playgroundInstance.currentBaseSize,
            });
            setInitialLayout({
                repelForce: playgroundInstance.currentRepelForce,
                idealDistance: playgroundInstance.currentIdealDistance,
                iterations: playgroundInstance.currentIterations,
                coolingFactor: playgroundInstance.currentCoolingFactor,
            });
            setInitialHeatmapSlices(playgroundInstance.maxHeatmapSlices);
        }

        return () => {
            // Cleanup on component unmount or when selectedDataset changes
            if (playgroundRef.current) {
                playgroundRef.current.dispose();
                playgroundRef.current = null;
            }
            setIsTimelineInitialized(false); // Reset on unmount or dataset change
            setActualSliceCount(0); // Also reset actualSliceCount
            setIsPlaygroundInitialized(false); // Reset on unmount or dataset change
        };
    }, [selectedDataset, visualizationMode]); // Add visualizationMode to dependency array

    const handleTimelineChange = (newSliceIndex: number) => {
        if (playgroundRef.current) {
            playgroundRef.current.setCurrentSlice(newSliceIndex);
            setCurrentSliceValue(newSliceIndex);
        }
    };

    const handleModeChange = (mode: "compiled" | "logical") => {
        if (visualizationMode !== mode) {
            setVisualizationMode(mode);
            // The useEffect hook watching selectedDataset and visualizationMode
            // will handle disposing and re-creating the Playground instance.
        }
    };

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
            {!selectedDataset ? (
                <DatasetSelection onSelect={handleDatasetSelect} />
            ) : (
                <>
                    <VisualizationModeSwitcher
                        currentMode={visualizationMode}
                        onModeChange={handleModeChange}
                        disabled={!isPlaygroundInitialized} // Disable while playground is loading/initializing
                    />
                    {/* Container for the Three.js canvas */}
                    <div
                        ref={mountRef}
                        style={{ width: "100%", height: "100%" }}
                    />
                    {/* Future React UI components will go here, likely overlaid or adjacent */}
                    {/* <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white' }}>
                        <h1>Quantum Grid Visualizer - React</h1>
                    </div> */}

                    {isPlaygroundInitialized && (
                        <>
                            <AppearanceControls
                                playground={playgroundRef.current}
                                initialValues={initialAppearance}
                                isCollapsed={isAppearanceCollapsed}
                                onToggleCollapse={toggleAppearanceCollapse}
                            />
                            <LayoutControls
                                playground={playgroundRef.current}
                                initialValues={initialLayout}
                                isCollapsed={isLayoutCollapsed}
                                onToggleCollapse={toggleLayoutCollapse}
                                topPosition={`${BASE_TOP_MARGIN_PX + (isAppearanceCollapsed ? APPEARANCE_PANEL_COLLAPSED_HEIGHT_PX : APPEARANCE_PANEL_EXPANDED_HEIGHT_PX) + INTER_PANEL_SPACING_PX}px`}
                            />
                            <HeatmapControls
                                playground={playgroundRef.current}
                                initialValues={{
                                    maxSlices: initialHeatmapSlices,
                                }}
                            />
                        </>
                    )}

                    {isTimelineInitialized && actualSliceCount > 0 && (
                        <TimelineSlider
                            min={0}
                            max={maxSliceIndex} // Use maxSliceIndex for the slider's max prop
                            value={currentSliceValue}
                            onChange={handleTimelineChange}
                            disabled={actualSliceCount === 0} // Or simply actualSliceCount <= 1 for single slice no-slide
                            label="Time Slice"
                        />
                    )}
                    {isTimelineInitialized && actualSliceCount === 0 && (
                        <div
                            style={{
                                position: "fixed",
                                bottom: "30px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                color: "white",
                                background: "rgba(0,0,0,0.5)",
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
                    {/* The div for Heatmap Legend has been moved to HeatmapControls.tsx */}
                </>
            )}
        </div>
    );
};

export default App;
