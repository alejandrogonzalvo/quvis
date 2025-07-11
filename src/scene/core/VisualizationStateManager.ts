import { Timeline } from "../../data/models/Timeline.js";
import { Slice } from "../../data/models/Slice.js";

export class VisualizationStateManager {
    private timeline: Timeline;
    private slices: Array<Slice> = [];
    private currentSliceIndex: number = 0;
    private _visualizationMode: "compiled" | "logical" = "compiled";

    // Calculated slice interaction data for current view
    private lastCalculatedSlicesChangeIDs: Array<Set<number>> = [];
    public lastMaxObservedRawHeatmapSum: number = 0;
    public lastEffectiveSlicesForHeatmap: number = 0;

    // Heatmap parameters
    private maxSlicesForHeatmap: number = 10;

    constructor(
        onSliceChange: (sliceIndex: number) => void,
        initialMaxSlicesForHeatmap: number = 10,
        visualizationMode: "compiled" | "logical" = "compiled",
    ) {
        this.timeline = new Timeline(onSliceChange);
        this.maxSlicesForHeatmap = initialMaxSlicesForHeatmap;
        this._visualizationMode = visualizationMode;
    }

    // Getters
    get currentSlice(): number {
        return this.currentSliceIndex;
    }

    get sliceCount(): number {
        return this.slices.length;
    }

    get visualizationMode(): "compiled" | "logical" {
        return this._visualizationMode;
    }

    get maxHeatmapSlices(): number {
        return this.maxSlicesForHeatmap;
    }

    get timelineInstance(): Timeline {
        return this.timeline;
    }

    get currentSliceData(): Slice | null {
        if (
            this.slices &&
            this.currentSliceIndex >= 0 &&
            this.currentSliceIndex < this.slices.length
        ) {
            return this.slices[this.currentSliceIndex];
        }
        return null;
    }

    get lastSliceChangeData(): Array<Set<number>> {
        return this.lastCalculatedSlicesChangeIDs;
    }

    /**
     * Initialize slices from operations data
     */
    initializeSlices(
        allOperationsPerSlice: Array<Array<{ name: string; qubits: number[] }>>,
    ): void {
        this.slices = allOperationsPerSlice.map((ops_in_slice, sliceIdx) => {
            const slice = new Slice(sliceIdx);
            ops_in_slice.forEach((op) => {
                op.qubits.forEach((qid) => slice.interacting_qubits.add(qid));
            });
            return slice;
        });

        // Reset current slice
        this.currentSliceIndex = this.slices.length > 0 ? 0 : -1;

        // Update timeline
        this.timeline.setSliceCount(this.slices.length);
        if (this.currentSliceIndex >= 0) {
            this.timeline.setSlice(this.currentSliceIndex);
        }

        // Calculate initial slice change data
        this.calculateSliceChangeData();
    }

    /**
     * Set current slice index
     */
    setCurrentSlice(sliceIndex: number): void {
        this.setCurrentSliceInternal(sliceIndex);

        // Update timeline (only for external calls, not timeline callbacks)
        if (this.currentSliceIndex >= 0) {
            this.timeline.setSlice(this.currentSliceIndex);
        }
    }

    /**
     * Set current slice index internally without triggering timeline callback
     * Used by timeline callbacks to avoid infinite recursion
     */
    public setCurrentSliceInternal(sliceIndex: number): void {
        if (sliceIndex >= 0 && sliceIndex < this.slices.length) {
            this.currentSliceIndex = sliceIndex;
        } else if (this.slices.length > 0) {
            this.currentSliceIndex = 0;
        } else {
            this.currentSliceIndex = -1;
        }

        // Recalculate slice change data
        this.calculateSliceChangeData();
    }

    /**
     * Set visualization mode
     */
    setVisualizationMode(mode: "compiled" | "logical"): void {
        this._visualizationMode = mode;
    }

    /**
     * Update max slices for heatmap
     */
    updateMaxSlicesForHeatmap(maxSlices: number): void {
        if (maxSlices < -1) return;
        this.maxSlicesForHeatmap = maxSlices;
        this.calculateSliceChangeData();
    }

    /**
     * Calculate slice change data for current state
     */
    private calculateSliceChangeData(): void {
        if (this.slices.length === 0 || this.currentSliceIndex < 0) {
            this.lastCalculatedSlicesChangeIDs = [];
            this.lastEffectiveSlicesForHeatmap = 0;
            return;
        }

        const slicesChangeIDs = new Array<Set<number>>();

        // Add current slice data
        const currentVisibleSliceData = this.currentSliceData;
        if (
            currentVisibleSliceData &&
            currentVisibleSliceData.interacting_qubits
        ) {
            slicesChangeIDs.push(currentVisibleSliceData.interacting_qubits);
        }

        // Add historical slices based on heatmap window
        const historicalStartIndex = this.currentSliceIndex - 1;
        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndex + 1,
            Math.max(0, this.currentSliceIndex),
        );

        for (let i = 0; i < numAdditionalSlicesToConsider; i++) {
            const targetHistoricalIndex = historicalStartIndex - i;
            if (
                targetHistoricalIndex >= 0 &&
                this.slices[targetHistoricalIndex] &&
                this.slices[targetHistoricalIndex].interacting_qubits
            ) {
                slicesChangeIDs.push(
                    this.slices[targetHistoricalIndex].interacting_qubits,
                );
            } else {
                break;
            }
        }

        this.lastCalculatedSlicesChangeIDs = slicesChangeIDs;

        // Calculate effective slices for heatmap
        if (this.maxSlicesForHeatmap === -1) {
            this.lastEffectiveSlicesForHeatmap = Math.max(
                0,
                this.currentSliceIndex + 1,
            );
        } else {
            this.lastEffectiveSlicesForHeatmap = Math.max(
                0,
                Math.min(this.currentSliceIndex + 1, this.maxSlicesForHeatmap),
            );
        }
    }

    /**
     * Get interacting qubits for a specific slice
     */
    getInteractingQubitsForSlice(sliceIndex: number): Set<number> {
        if (sliceIndex >= 0 && sliceIndex < this.slices.length) {
            return this.slices[sliceIndex].interacting_qubits;
        }
        return new Set<number>();
    }

    /**
     * Calculate qubit interaction intensity for display
     */
    calculateQubitInteractionIntensity(
        qubitId: number,
        slicesChangeData?: Array<Set<number>>,
    ): number {
        const dataToUse =
            slicesChangeData || this.lastCalculatedSlicesChangeIDs;
        let interactionCount = 0;

        if (!dataToUse || !Array.isArray(dataToUse)) return 0;

        const slicesToConsider = dataToUse.slice(0, this.maxSlicesForHeatmap);
        slicesToConsider.forEach((sliceInteractionSet) => {
            if (
                sliceInteractionSet instanceof Set &&
                sliceInteractionSet.has(qubitId)
            ) {
                interactionCount++;
            }
        });

        if (slicesToConsider.length === 0 && this.maxSlicesForHeatmap > 0)
            return 0;
        if (slicesToConsider.length === 0 && this.maxSlicesForHeatmap === 0)
            return 0;
        if (slicesToConsider.length === 0) return 0;

        return interactionCount / slicesToConsider.length;
    }

    /**
     * Update heatmap calculation results
     */
    updateHeatmapResults(
        maxObservedRawSum: number,
        effectiveSlices: number,
    ): void {
        this.lastMaxObservedRawHeatmapSum = maxObservedRawSum;
        this.lastEffectiveSlicesForHeatmap = effectiveSlices;
    }

    /**
     * Get current interaction pairs for the current slice (for logical mode)
     */
    getCurrentSliceInteractionPairs(
        interactionPairsPerSlice: Array<Array<{ q1: number; q2: number }>>,
    ): Array<{ q1: number; q2: number }> {
        if (
            this.currentSliceIndex >= 0 &&
            this.currentSliceIndex < interactionPairsPerSlice.length
        ) {
            return interactionPairsPerSlice[this.currentSliceIndex];
        }
        return [];
    }

    /**
     * Check if currently in logical mode
     */
    isLogicalMode(): boolean {
        return this._visualizationMode === "logical";
    }

    /**
     * Check if currently in compiled mode
     */
    isCompiledMode(): boolean {
        return this._visualizationMode === "compiled";
    }

    /**
     * Get slice count for current mode
     */
    getActiveSliceCount(): number {
        return this.slices.length;
    }

    /**
     * Get current slice index for current mode
     */
    getActiveCurrentSliceIndex(): number {
        return this.currentSliceIndex;
    }

    /**
     * Reset to empty state
     */
    reset(): void {
        this.slices = [];
        this.currentSliceIndex = -1;
        this.lastCalculatedSlicesChangeIDs = [];
        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap = 0;
        this.timeline.setSliceCount(0);
    }

    /**
     * Create fallback state for error handling
     */
    createFallbackState(): void {
        // Create a single empty slice
        const errorSlice = new Slice(0);
        errorSlice.interacting_qubits = new Set();
        this.slices = [errorSlice];
        this.currentSliceIndex = 0;
        this.timeline.setSliceCount(1);
        this.timeline.setSlice(0);
        this.calculateSliceChangeData();
    }

    /**
     * Check if state has valid data
     */
    hasValidData(): boolean {
        return this.slices.length > 0 && this.currentSliceIndex >= 0;
    }

    /**
     * Get summary of current state for debugging
     */
    getStateSummary(): {
        sliceCount: number;
        currentSlice: number;
        mode: string;
        maxHeatmapSlices: number;
        effectiveSlices: number;
    } {
        return {
            sliceCount: this.slices.length,
            currentSlice: this.currentSliceIndex,
            mode: this._visualizationMode,
            maxHeatmapSlices: this.maxSlicesForHeatmap,
            effectiveSlices: this.lastEffectiveSlicesForHeatmap,
        };
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        console.log("VisualizationStateManager dispose called");
        this.reset();
    }
}
