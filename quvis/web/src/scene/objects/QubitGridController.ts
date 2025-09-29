import * as THREE from 'three';
import { CircuitDataManager } from '../../data/managers/CircuitDataManager.js';
import { LayoutManager } from '../core/LayoutManager.js';
import { RenderManager } from '../core/RenderManager.js';
import { VisualizationStateManager } from '../core/VisualizationStateManager.js';
import { HeatmapManager } from '../core/HeatmapManager.js';
import { SmartCameraAlignment } from '../interaction/modules/SmartCameraAlignment.js';

interface CircuitLayoutState {
    layoutType: 'grid' | 'force';
    positions?: Map<number, THREE.Vector3>;
}

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
    private smartAlignment?: SmartCameraAlignment;

    // Scene references
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private mouse: THREE.Vector2;
    private onSlicesLoadedCallback?: (
        count: number,
        initialIndex: number
    ) => void;

    // State tracking
    public isFullyLoaded = false;
    private currentNumDeviceQubits: number = 0;

    // Per-circuit layout state management
    private circuitLayoutStates: Map<number, CircuitLayoutState> = new Map();

    constructor(
        scene: THREE.Scene,
        mouse: THREE.Vector2,
        camera: THREE.PerspectiveCamera,
        data: any, // Change to 'any' to handle the object type
        visualizationMode: 'compiled' | 'logical',
        initialMaxSlicesForHeatmap: number = 10,
        initialKRepel: number = 0.3,
        initialIdealDist: number = 5.0,
        initialIterations: number = 300,
        initialCoolingFactor: number = 0.95,
        initialConnectionThickness: number = 0.05,
        initialInactiveElementAlpha: number = 0.1,
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
        isLightBackground?: () => boolean,
        smartAlignment?: SmartCameraAlignment
    ) {
        this.scene = scene;
        this.mouse = mouse;
        this.camera = camera;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;
        this.smartAlignment = smartAlignment;

        // Initialize subsystems
        this.dataManager = new CircuitDataManager();
        this.layoutManager = new LayoutManager(
            initialKRepel,
            initialIdealDist,
            initialIterations,
            initialCoolingFactor
        );
        this.renderManager = new RenderManager(
            scene,
            1.0,
            initialConnectionThickness,
            initialInactiveElementAlpha,
            false,
            true,
            isLightBackground
        );
        this.stateManager = new VisualizationStateManager(
            (sliceIndex) => this.loadStateFromSlice(sliceIndex),
            initialMaxSlicesForHeatmap,
            visualizationMode
        );
        this.heatmapManager = new HeatmapManager(
            camera,
            1, // initial qubit count (will be updated)
            initialMaxSlicesForHeatmap
        );

        // Load initial data
        this.loadData(data);
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

    get legend() {
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
        onLayoutComplete?: () => void
    ): void {
        // Always update parameters and trigger layout recalculation
        this.layoutManager.updateParameters(params);

        const deviceQubitCount = this.dataManager.deviceQubitCount;
        if (deviceQubitCount > 0) {
            this.layoutManager.calculateForceDirectedLayout(
                deviceQubitCount,
                this.dataManager.couplingMap,
                (positions) => {
                    this.renderManager.updateQubitPositions(positions);
                    this.heatmapManager.generateClusters(
                        positions,
                        deviceQubitCount
                    );
                    this.heatmapManager.clearPositionsCache();
                    this.updateVisualization();

                    // Auto-align camera to optimal viewing angle for the layout
                    this.autoAlignCameraToLayout();

                    // Save force layout state for current circuit
                    if (this.dataManager.isMultiCircuit) {
                        this.saveCurrentLayoutState(
                            this.dataManager.currentCircuitIndex,
                            'force'
                        );
                    }

                    onLayoutComplete?.();
                }
            );
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
                params.connectionThickness
            );
        }
        if (params.inactiveAlpha !== undefined) {
            this.renderManager.setInactiveElementAlpha(params.inactiveAlpha);
        }
        this.updateVisualization();
    }

    /**
     * Update connection colors based on current background mode
     */
    public updateConnectionColors(): void {
        this.renderManager.updateConnectionColors();
    }

    public updateIdealDistance(distance: number): void {
        this.layoutManager.updateIdealDistance(distance);
        this.renderManager.updateQubitPositions(this.layoutManager.positions);
        this.heatmapManager.generateClusters(
            this.layoutManager.positions,
            this.layoutManager.getQubitCount()
        );
        this.heatmapManager.clearPositionsCache();
        this.updateVisualization();
    }

    public applyGridLayout(): void {
        this.layoutManager.applyGridLayoutToExistingQubits();
        this.renderManager.updateQubitPositions(this.layoutManager.positions);

        const deviceQubitCount = this.dataManager.deviceQubitCount;
        if (deviceQubitCount > 0) {
            this.heatmapManager.generateClusters(
                this.layoutManager.positions,
                deviceQubitCount
            );
            this.heatmapManager.clearPositionsCache();
        }

        this.updateVisualization();

        // Save grid layout state for current circuit
        if (this.dataManager.isMultiCircuit) {
            this.saveCurrentLayoutState(
                this.dataManager.currentCircuitIndex,
                'grid'
            );
        }
    }

    public setVisualizationMode(mode: 'compiled' | 'logical'): void {
        // Since we're always in multi-circuit mode now, we need to switch to the appropriate circuit
        // rather than switching modes within the same circuit
        console.warn(
            'setVisualizationMode is deprecated. Use switchToCircuit instead for multi-circuit mode.'
        );

        // Try to find a circuit of the desired type
        const circuits = this.dataManager.allCircuitsInfo;
        const targetCircuitIndex = circuits.findIndex(
            (circuit) => circuit.circuit_type === mode
        );

        if (targetCircuitIndex !== -1) {
            this.switchToCircuit(targetCircuitIndex);
        }
    }

    public switchToCircuit(circuitIndex: number): void {
        if (!this.dataManager.isMultiCircuit) {
            console.warn('Not in multi-circuit mode');
            return;
        }

        const previousQubitCount = this.currentNumDeviceQubits;

        this.dataManager.switchToCircuit(circuitIndex);
        this.stateManager.setVisualizationMode(
            this.dataManager.visualizationMode
        );

        // Reinitialize slices for new circuit
        this.stateManager.initializeSlices(this.dataManager.operationsPerSlice);

        // Get the new device info and qubit count
        const deviceQubitCount = this.dataManager.deviceQubitCount;
        if (deviceQubitCount === 0) {
            console.warn('No device info available for circuit');
            return;
        }

        const newQubitCount = deviceQubitCount;
        this.currentNumDeviceQubits = newQubitCount;

        // Check if we need to recreate the grid (different qubit count)
        if (newQubitCount !== previousQubitCount) {
            console.log(
                `Qubit count changed from ${previousQubitCount} to ${newQubitCount}, recreating grid`
            );

            // Recreate the grid with new qubit count
            this.recreateGridForNewQubitCount(newQubitCount);
        } else {
            console.log(
                `Qubit count unchanged (${newQubitCount}), updating existing grid`
            );
        }

        // Restore or initialize layout state for this circuit
        const savedLayoutState = this.circuitLayoutStates.get(circuitIndex);
        if (savedLayoutState) {
            // Restore saved layout state
            if (savedLayoutState.layoutType === 'grid') {
                this.applyGridLayout();
            } else if (savedLayoutState.positions) {
                // Restore force layout positions
                this.restoreLayoutPositions(savedLayoutState.positions);
                this.renderManager.updateQubitPositions(
                    savedLayoutState.positions
                );
                this.heatmapManager.generateClusters(
                    savedLayoutState.positions,
                    newQubitCount
                );
                this.heatmapManager.clearPositionsCache();
            }
        } else {
            // Initialize with default grid layout for new circuit
            this.applyGridLayout();
            this.circuitLayoutStates.set(circuitIndex, {
                layoutType: 'grid',
            });
        }

        // Update connections based on circuit type
        if (this.dataManager.visualizationMode === 'logical') {
            let maxLogicalConnections = 0;
            this.dataManager.operationsPerSlice.forEach((ops_in_slice) => {
                const twoQubitOps = ops_in_slice.filter(
                    (op) => op.qubits.length === 2
                ).length;
                if (twoQubitOps > maxLogicalConnections) {
                    maxLogicalConnections = twoQubitOps;
                }
            });
            this.renderManager.initializeLogicalInstancedConnections(
                maxLogicalConnections
            );
        } else {
            const couplingMap = this.dataManager.couplingMap;
            if (couplingMap) {
                this.renderManager.initializeInstancedConnections(
                    couplingMap.length
                );
            }
        }

        this.updateVisualization();
        console.log(
            `Switched to circuit: ${circuitIndex} (${this.dataManager.visualizationMode})`
        );
    }

    private recreateGridForNewQubitCount(newQubitCount: number): void {
        // Calculate new grid layout
        this.layoutManager.calculateGridLayout(newQubitCount);

        // Create new grid of qubits
        this.renderManager.createGrid(
            newQubitCount,
            this.layoutManager.positions
        );

        // Update heatmap for new qubit count
        this.heatmapManager.initializeForSetup(
            this.camera,
            this.dataManager.qubitCount,
            this.layoutManager.positions,
            newQubitCount
        );

        // Update heatmap aspect ratio
        const renderWidth = this.camera.aspect || 1;
        const renderHeight = 1;
        this.heatmapManager.setAspectRatio(renderWidth / renderHeight);
    }

    private restoreLayoutPositions(
        positions: Map<number, THREE.Vector3>
    ): void {
        // Clear existing positions
        this.layoutManager.clearPositions();

        // Restore each position
        positions.forEach((position, qubitId) => {
            this.layoutManager.setQubitPosition(qubitId, position);
        });
    }

    public saveCurrentLayoutState(
        circuitIndex: number,
        layoutType: 'grid' | 'force'
    ): void {
        if (this.dataManager.isMultiCircuit) {
            const currentState: CircuitLayoutState = {
                layoutType: layoutType,
            };

            if (layoutType === 'force') {
                // Save current positions for force layout
                currentState.positions = new Map(this.layoutManager.positions);
            }

            this.circuitLayoutStates.set(circuitIndex, currentState);
        }
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
            'Fidelity parameters received in QubitGridController:',
            params
        );
        // Future implementation for fidelity visualization
    }

    private autoAlignCameraToLayout(): void {
        if (this.smartAlignment && this.layoutManager.positions.size > 0) {

            // Use 3-point plane detection method
            this.smartAlignment.alignToForceLayout(this.layoutManager.positions);

            // Alternative: Use minimal variance plane detection
            // this.smartAlignment.alignToMinimalVariancePlane(this.layoutManager.positions);
        } else {
            console.warn("Smart alignment not available or no qubit positions");
        }
    }

    public updateHeatmapColorParameters(params: {
        fadeThreshold?: number;
        greenThreshold?: number;
        yellowThreshold?: number;
        intensityPower?: number;
        minIntensity?: number;
        borderWidth?: number;
    }): void {
        this.heatmapManager.updateColorParameters(params);
    }

    public updateHeatmapLightBackground(isLight: boolean): void {
        this.heatmapManager.updateLightBackground(isLight);
    }

    public getHeatmapColorParameters(): {
        fadeThreshold: number;
        greenThreshold: number;
        yellowThreshold: number;
        intensityPower: number;
        minIntensity: number;
        borderWidth: number;
    } {
        return this.heatmapManager.getColorParameters();
    }

    public updateLOD(cameraDistance: number): void {
        this.renderManager.updateLOD(
            cameraDistance,
            this.layoutManager.areaSide
        );

        let heatmapLOD: 'high' | 'low';
        if (cameraDistance > this.layoutManager.areaSide * 5) {
            heatmapLOD = 'low';
        } else {
            heatmapLOD = 'high';
        }
        this.heatmapManager.setLOD(heatmapLOD);
    }

    public setBlochSpheresVisible(visible: boolean): void {
        this.renderManager.setBlochSpheresVisible(
            visible,
            this.layoutManager.positions
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
            this.stateManager.lastEffectiveSlicesForHeatmap
        );
    }

    public dispose(): void {
        console.log('QubitGridController dispose called');

        // Dispose of all subsystems
        this.dataManager.clearData();
        this.layoutManager.dispose();
        this.renderManager.dispose();
        this.stateManager.dispose();
        this.heatmapManager.dispose();

        console.log('QubitGridController resources cleaned up');
    }

    // Private methods

    private async loadData(data: any): Promise<void> {
        console.log('loadData called with data:', data);
        try {
            if (data && typeof data === 'object') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.dataManager.loadData(data.circuits);
            }

            await this.initializeAfterDataLoad();
            this.onSlicesLoadedCallback?.(
                this.dataManager.getSliceCount(),
                this.stateManager.currentSlice
            );
        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleLoadError();
        }
    }

    private async initializeAfterDataLoad(): Promise<void> {
        const deviceQubitCount = this.dataManager.deviceQubitCount;
        if (deviceQubitCount === 0) return;

        const couplingMap = this.dataManager.couplingMap;
        const qubitCount = this.dataManager.qubitCount;

        // Initialize layout
        this.layoutManager.calculateGridLayout(deviceQubitCount);

        // Initialize slices in state manager
        this.stateManager.initializeSlices(this.dataManager.operationsPerSlice);

        // Create qubits in render manager
        this.renderManager.createGrid(
            deviceQubitCount,
            this.layoutManager.positions
        );

        // Initialize connections
        if (couplingMap) {
            this.renderManager.initializeInstancedConnections(
                couplingMap.length
            );
        }

        // Initialize heatmap
        this.heatmapManager.initializeForSetup(
            this.camera,
            qubitCount,
            this.layoutManager.positions,
            deviceQubitCount
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
        console.error('Handling load error with fallback data');

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
            maxSlicesForHeatmap
        );

        // Update heatmap
        const lastLoadedSlice = this.dataManager.processedSlicesCount - 1;
        const effectiveSliceIndex = Math.min(
            currentSliceIndex,
            lastLoadedSlice
        );

        const heatmapResult = this.heatmapManager.updateHeatmap(
            this.layoutManager.positions,
            effectiveSliceIndex,
            this.dataManager.cumulativeQubitInteractionData
        );

        // Update state manager with heatmap results
        this.stateManager.updateHeatmapResults(
            heatmapResult.maxObservedRawWeightedSum,
            heatmapResult.numSlicesEffectivelyUsed
        );

        // Update connections
        const currentSliceInteractionPairs =
            this.stateManager.getCurrentSliceInteractionPairs(
                this.dataManager.interactionPairsPerSlice
            );

        this.renderManager.drawConnections(
            this.stateManager.visualizationMode,
            this.layoutManager.positions,
            this.dataManager.couplingMap,
            currentSliceInteractionPairs,
            this.dataManager,
            currentSliceIndex,
            maxSlicesForHeatmap
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
