import * as THREE from "three";
import { CircuitDataManager } from "./CircuitDataManager.js";
import { LayoutManager } from "./LayoutManager.js";
import { RenderManager } from "./RenderManager.js";
import { VisualizationStateManager } from "./VisualizationStateManager.js";
import { HeatmapManager } from "./HeatmapManager.js";

/**
 * QubitGridController - Refactored main class that coordinates all subsystems
 * Maintains backward compatibility with the original QubitGrid API
 */
export class QubitGridController {
    // Core subsystems
    private dataManager: CircuitDataManager;
    private layoutManager: LayoutManager;
    private renderManager: RenderManager;
    private stateManager: VisualizationStateManager;
    private heatmapManager: HeatmapManager;

    // Dependencies passed from outside
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private mouse: THREE.Vector2;

    // Callbacks
    private onSlicesLoadedCallback?: (
        count: number,
        initialIndex: number,
    ) => void;

    // Current state for external access
    public isFullyLoaded = false;

    constructor(
        scene: THREE.Scene,
        mouse: THREE.Vector2,
        camera: THREE.PerspectiveCamera,
        datasetNameOrData: string | object,
        visualizationMode: "compiled" | "logical",
        initialMaxSlicesForHeatmap: number = 10,
        initialKRepel: number = 0.3,
        initialIdealDist: number = 5.0,
        initialIterations: number = 300,
        initialCoolingFactor: number = 0.95,
        initialConnectionThickness: number = 0.05,
        initialInactiveElementAlpha: number = 0.1,
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
    ) {
        this.scene = scene;
        this.mouse = mouse;
        this.camera = camera;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;

        // Initialize subsystems
        this.dataManager = new CircuitDataManager(visualizationMode);
        this.layoutManager = new LayoutManager(
            initialKRepel,
            initialIdealDist,
            initialIterations,
            initialCoolingFactor,
        );
        this.renderManager = new RenderManager(
            scene,
            1.0,
            initialConnectionThickness,
            initialInactiveElementAlpha,
            false,
            true,
        );
        this.stateManager = new VisualizationStateManager(
            (sliceIndex) => this.loadStateFromSlice(sliceIndex),
            initialMaxSlicesForHeatmap,
            visualizationMode,
        );
        this.heatmapManager = new HeatmapManager(
            scene,
            camera,
            1, // initial qubit count (will be updated)
            initialMaxSlicesForHeatmap,
        );

        // Load initial data
        this.loadData(datasetNameOrData);
    }

    // Public API methods (maintaining backward compatibility)

    public getActiveSliceCount(): number {
        return this.stateManager.getActiveSliceCount();
    }

    public getActiveCurrentSliceIndex(): number {
        return this.stateManager.getActiveCurrentSliceIndex();
    }

    get current_slice_data() {
        return this.stateManager.currentSliceData;
    }

    get lastMaxObservedRawHeatmapSum(): number {
        return this.heatmapManager.maxObservedRawSum;
    }

    get lastEffectiveSlicesForHeatmap(): number {
        return this.heatmapManager.effectiveSlicesForHeatmap;
    }

    get lastLayoutCalculationTime(): number {
        return this.layoutManager.lastLayoutCalculationTime;
    }

    get maxSlicesForHeatmap(): number {
        return this.heatmapManager.maxSlices;
    }

    get heatmap() {
        return this.heatmapManager.heatmapInstance;
    }

    get heatmapLegend() {
        return this.heatmapManager.legendInstance;
    }

    get timeline() {
        return this.stateManager.timelineInstance;
    }

    public setCurrentSlice(sliceIndex: number): void {
        this.loadStateFromSlice(sliceIndex);
    }

    public loadStateFromSlice(sliceIndex: number): void {
        this.stateManager.setCurrentSliceInternal(sliceIndex);
        this.updateVisualization();
    }

    public updateLayoutParameters(
        params: {
            repelForce?: number;
            idealDistance?: number;
            iterations?: number;
            coolingFactor?: number;
        },
        onLayoutComplete?: () => void,
    ): void {
        const changed = this.layoutManager.updateParameters(params);

        if (changed) {
            const deviceInfo = this.dataManager.device;
            if (deviceInfo) {
                this.layoutManager.calculateForceDirectedLayout(
                    deviceInfo.num_qubits_on_device,
                    this.dataManager.couplingMap,
                    (positions) => {
                        this.renderManager.updateQubitPositions(positions);
                        this.heatmapManager.generateClusters(
                            positions,
                            deviceInfo.num_qubits_on_device,
                        );
                        this.heatmapManager.clearPositionsCache();
                        this.updateVisualization();
                        onLayoutComplete?.();
                    },
                );
            }
        } else {
            onLayoutComplete?.();
        }
    }

    public updateAppearanceParameters(params: {
        qubitSize?: number;
        connectionThickness?: number;
        inactiveAlpha?: number;
    }): void {
        if (params.qubitSize !== undefined) {
            this.renderManager.setQubitScale(params.qubitSize);
        }
        if (params.connectionThickness !== undefined) {
            this.renderManager.setConnectionThickness(
                params.connectionThickness,
            );
        }
        if (params.inactiveAlpha !== undefined) {
            this.renderManager.setInactiveElementAlpha(params.inactiveAlpha);
        }
        this.updateVisualization();
    }

    public updateIdealDistance(distance: number): void {
        this.layoutManager.updateIdealDistance(distance);
        this.renderManager.updateQubitPositions(this.layoutManager.positions);
        this.heatmapManager.generateClusters(
            this.layoutManager.positions,
            this.layoutManager.getQubitCount(),
        );
        this.heatmapManager.clearPositionsCache();
        this.updateVisualization();
    }

    public applyGridLayout(): void {
        this.layoutManager.applyGridLayoutToExistingQubits();
        this.renderManager.updateQubitPositions(this.layoutManager.positions);

        const deviceInfo = this.dataManager.device;
        if (deviceInfo) {
            this.heatmapManager.generateClusters(
                this.layoutManager.positions,
                deviceInfo.num_qubits_on_device,
            );
            this.heatmapManager.clearPositionsCache();
        }

        this.updateVisualization();
    }

    public setVisualizationMode(mode: "compiled" | "logical"): void {
        this.dataManager.switchToMode(mode);
        this.stateManager.setVisualizationMode(mode);

        // Reinitialize slices for new mode
        this.stateManager.initializeSlices(this.dataManager.operationsPerSlice);

        // Update connections based on mode
        if (mode === "logical") {
            let maxLogicalConnections = 0;
            this.dataManager.operationsPerSlice.forEach((ops_in_slice) => {
                const twoQubitOps = ops_in_slice.filter(
                    (op) => op.qubits.length === 2,
                ).length;
                if (twoQubitOps > maxLogicalConnections) {
                    maxLogicalConnections = twoQubitOps;
                }
            });
            this.renderManager.initializeLogicalInstancedConnections(
                maxLogicalConnections,
            );
        } else {
            const couplingMap = this.dataManager.couplingMap;
            if (couplingMap) {
                this.renderManager.initializeInstancedConnections(
                    couplingMap.length,
                );
            }
        }

        this.updateVisualization();
        console.log(`Visualization mode set to: ${mode}`);
    }

    public updateHeatmapSlices(maxSlices: number): void {
        this.stateManager.updateMaxSlicesForHeatmap(maxSlices);
        this.heatmapManager.updateMaxSlicesForHeatmap(maxSlices);
        this.updateVisualization();
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }): void {
        console.log(
            "Fidelity parameters received in QubitGridController:",
            params,
        );
        // Future implementation for fidelity visualization
    }

    public updateLOD(cameraDistance: number): void {
        this.renderManager.updateLOD(
            cameraDistance,
            this.layoutManager.areaSide,
        );

        let heatmapLOD: "high" | "low";
        if (cameraDistance > this.layoutManager.areaSide * 5) {
            heatmapLOD = "low";
        } else {
            heatmapLOD = "high";
        }
        this.heatmapManager.setLOD(heatmapLOD);
    }

    public setBlochSpheresVisible(visible: boolean): void {
        this.renderManager.setBlochSpheresVisible(
            visible,
            this.layoutManager.positions,
        );
    }

    public setConnectionLinesVisible(visible: boolean): void {
        this.renderManager.setConnectionLinesVisible(visible);
    }

    public getGateCountForQubit(qubitId: number): {
        oneQubitGatesInWindow: number;
        twoQubitGatesInWindow: number;
        totalOneQubitGates: number;
        totalTwoQubitGates: number;
        windowForCountsInWindow: number;
    } {
        return this.dataManager.getGateCountForQubit(
            qubitId,
            this.stateManager.currentSlice,
            this.stateManager.lastEffectiveSlicesForHeatmap,
        );
    }

    public dispose(): void {
        console.log("QubitGridController dispose called");

        // Dispose of all subsystems
        this.dataManager.clearData();
        this.layoutManager.dispose();
        this.renderManager.dispose();
        this.stateManager.dispose();
        this.heatmapManager.dispose();

        console.log("QubitGridController resources cleaned up");
    }

    // Private methods

    private async loadData(datasetNameOrData: string | object): Promise<void> {
        try {
            if (typeof datasetNameOrData === "string") {
                const dataUrl = datasetNameOrData.endsWith(".json")
                    ? `/quvis/${datasetNameOrData}`
                    : `/quvis/${datasetNameOrData}_viz_data.json`;
                await this.dataManager.loadFromJSON(dataUrl);
            } else if (
                datasetNameOrData &&
                typeof datasetNameOrData === "object"
            ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.dataManager.loadFromObject(datasetNameOrData as any);
            }

            await this.initializeAfterDataLoad();
            this.onSlicesLoadedCallback?.(
                this.dataManager.getSliceCount(),
                this.stateManager.currentSlice,
            );
        } catch (error) {
            console.error("Failed to load data:", error);
            this.handleLoadError();
        }
    }

    private async initializeAfterDataLoad(): Promise<void> {
        const deviceInfo = this.dataManager.device;
        if (!deviceInfo) return;

        const numDeviceQubits = deviceInfo.num_qubits_on_device;
        const couplingMap = this.dataManager.couplingMap;
        const qubitCount = this.dataManager.qubitCount;

        // Initialize layout
        this.layoutManager.calculateGridLayout(numDeviceQubits);

        // Initialize slices in state manager
        this.stateManager.initializeSlices(this.dataManager.operationsPerSlice);

        // Create qubits in render manager
        this.renderManager.createGrid(
            numDeviceQubits,
            this.layoutManager.positions,
        );

        // Initialize connections
        if (couplingMap) {
            this.renderManager.initializeInstancedConnections(
                couplingMap.length,
            );
        }

        // Initialize heatmap
        this.heatmapManager.initializeForSetup(
            this.camera,
            qubitCount,
            this.layoutManager.positions,
            numDeviceQubits,
        );

        // Update heatmap aspect ratio
        const renderWidth = this.camera.aspect || 1;
        const renderHeight = 1;
        this.heatmapManager.setAspectRatio(renderWidth / renderHeight);

        // Initial visualization update
        this.updateVisualization();

        // Set fully loaded flag when data is ready
        this.isFullyLoaded = this.dataManager.isFullyLoaded;
    }

    private handleLoadError(): void {
        console.error("Handling load error with fallback data");

        // Create fallback layout
        this.layoutManager.calculateGridLayout(9); // Default 9 qubits

        // Create fallback state
        this.stateManager.createFallbackState();

        // Create fallback qubits
        this.renderManager.createGrid(9, this.layoutManager.positions);

        // Create fallback heatmap
        this.heatmapManager.handleError(this.camera, 9);

        this.onSlicesLoadedCallback?.(1, 0);
    }

    private updateVisualization(): void {
        // Get current state data
        const currentSliceIndex = this.stateManager.currentSlice;
        const interactingQubits =
            this.stateManager.getInteractingQubitsForSlice(currentSliceIndex);
        const lastSliceChangeData = this.stateManager.lastSliceChangeData;
        const maxSlicesForHeatmap = this.stateManager.maxHeatmapSlices;

        // Update qubit states
        this.renderManager.updateQubitStates(interactingQubits);

        // Update qubit opacities
        this.renderManager.updateQubitOpacities(
            lastSliceChangeData,
            maxSlicesForHeatmap,
        );

        // Update heatmap
        const lastLoadedSlice = this.dataManager.processedSlicesCount - 1;
        const effectiveSliceIndex = Math.min(
            currentSliceIndex,
            lastLoadedSlice,
        );

        const heatmapResult = this.heatmapManager.updateHeatmap(
            this.layoutManager.positions,
            effectiveSliceIndex,
            this.dataManager.cumulativeQubitInteractionData,
        );

        // Update state manager with heatmap results
        this.stateManager.updateHeatmapResults(
            heatmapResult.maxObservedRawWeightedSum,
            heatmapResult.numSlicesEffectivelyUsed,
        );

        // Update connections
        const currentSliceInteractionPairs =
            this.stateManager.getCurrentSliceInteractionPairs(
                this.dataManager.interactionPairs,
            );

        this.renderManager.drawConnections(
            this.stateManager.visualizationMode,
            this.layoutManager.positions,
            this.dataManager.couplingMap,
            currentSliceInteractionPairs,
            this.dataManager.cumulativeWeightedPairInteractionData,
            currentSliceIndex,
            maxSlicesForHeatmap,
            this.dataManager.processedSlicesCount,
        );

        // Update isFullyLoaded status
        this.isFullyLoaded = this.dataManager.isFullyLoaded;
    }

    // Getters for accessing subsystem instances (for debugging/advanced usage)
    public get dataManagerInstance(): CircuitDataManager {
        return this.dataManager;
    }

    public get layoutManagerInstance(): LayoutManager {
        return this.layoutManager;
    }

    public get renderManagerInstance(): RenderManager {
        return this.renderManager;
    }

    public get stateManagerInstance(): VisualizationStateManager {
        return this.stateManager;
    }

    public get heatmapManagerInstance(): HeatmapManager {
        return this.heatmapManager;
    }
}
