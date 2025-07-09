import * as THREE from "three";
import { Heatmap } from "./Heatmap.js";
import { HeatmapLegend } from "./Legend.js";

export class HeatmapManager {
    private heatmap: Heatmap;
    private heatmapLegend: HeatmapLegend;
    private scene: THREE.Scene;

    // Current heatmap state
    private maxSlicesForHeatmap: number;
    private lastMaxObservedRawHeatmapSum: number = 0;
    private lastEffectiveSlicesForHeatmap: number = 0;

    // Configuration
    private readonly heatmapLegendContainerId = "heatmap-legend-container";
    private readonly heatmapYellowThreshold = 0.5;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        qubitCount: number,
        initialMaxSlicesForHeatmap: number = 10,
    ) {
        this.scene = scene;
        this.maxSlicesForHeatmap = initialMaxSlicesForHeatmap;

        // Initialize heatmap
        this.heatmap = new Heatmap(
            camera,
            qubitCount,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);

        // Initialize legend
        this.heatmapLegend = new HeatmapLegend(
            this.heatmapLegendContainerId,
            this.heatmapYellowThreshold,
        );

        // Set initial legend state
        this.updateLegend();
    }

    // Getters
    get heatmapInstance(): Heatmap {
        return this.heatmap;
    }

    get legendInstance(): HeatmapLegend {
        return this.heatmapLegend;
    }

    get maxSlices(): number {
        return this.maxSlicesForHeatmap;
    }

    get maxObservedRawSum(): number {
        return this.lastMaxObservedRawHeatmapSum;
    }

    get effectiveSlicesForHeatmap(): number {
        return this.lastEffectiveSlicesForHeatmap;
    }

    /**
     * Update heatmap with new qubit positions and interaction data
     */
    updateHeatmap(
        qubitPositions: Map<number, THREE.Vector3>,
        effectiveSliceIndex: number,
        cumulativeQubitInteractions: number[][],
    ): {
        maxObservedRawWeightedSum: number;
        numSlicesEffectivelyUsed: number;
    } {
        if (qubitPositions.size === 0) {
            const result = this.heatmap.updatePoints(new Map(), -1, []);
            this.updateHeatmapResults(
                result.maxObservedRawWeightedSum,
                result.numSlicesEffectivelyUsed,
            );
            this.updateLegend();
            return result;
        }

        const result = this.heatmap.updatePoints(
            qubitPositions,
            effectiveSliceIndex,
            cumulativeQubitInteractions,
        );

        this.updateHeatmapResults(
            result.maxObservedRawWeightedSum,
            result.numSlicesEffectivelyUsed,
        );

        this.updateLegend();
        return result;
    }

    /**
     * Update heatmap results and cache them
     */
    private updateHeatmapResults(
        maxObservedRawSum: number,
        effectiveSlices: number,
    ): void {
        this.lastMaxObservedRawHeatmapSum = maxObservedRawSum;
        this.lastEffectiveSlicesForHeatmap = effectiveSlices;
    }

    /**
     * Update the heatmap legend
     */
    updateLegend(): void {
        if (this.heatmapLegend) {
            console.log(
                `HeatmapManager.updateLegend: Updating legend with maxSlicesForHeatmap=${this.maxSlicesForHeatmap}, lastEffectiveSlicesForHeatmap=${this.lastEffectiveSlicesForHeatmap}, lastMaxObservedRawHeatmapSum=${this.lastMaxObservedRawHeatmapSum}`,
            );
            this.heatmapLegend.update(
                this.maxSlicesForHeatmap,
                this.lastEffectiveSlicesForHeatmap,
                this.lastMaxObservedRawHeatmapSum,
            );
        } else {
            console.warn(
                "HeatmapManager: updateLegend called but heatmapLegend not initialized.",
            );
        }
    }

    /**
     * Update max slices for heatmap calculation
     */
    updateMaxSlicesForHeatmap(newMaxSlices: number): void {
        if (this.maxSlicesForHeatmap === newMaxSlices) return;
        if (newMaxSlices < -1) return;

        this.maxSlicesForHeatmap = newMaxSlices;

        if (this.heatmap) {
            this.heatmap.maxSlices = this.maxSlicesForHeatmap;
        }

        this.updateLegend();
    }

    /**
     * Generate clusters for the heatmap
     */
    generateClusters(
        qubitPositions: Map<number, THREE.Vector3>,
        numDeviceQubits: number,
    ): void {
        if (this.heatmap) {
            this.heatmap.generateClusters(qubitPositions, numDeviceQubits);
        }
    }

    /**
     * Clear positions cache in heatmap
     */
    clearPositionsCache(): void {
        if (this.heatmap) {
            this.heatmap.clearPositionsCache();
        }
    }

    /**
     * Set heatmap aspect ratio
     */
    setAspectRatio(aspect: number): void {
        if (this.heatmap && this.heatmap.material) {
            this.heatmap.material.uniforms.aspect.value = aspect;
        }
    }

    /**
     * Update heatmap Level of Detail
     */
    setLOD(level: "high" | "low"): void {
        if (this.heatmap) {
            this.heatmap.setLOD(level);
        }
    }

    /**
     * Recreate heatmap with new parameters
     */
    recreateHeatmap(
        camera: THREE.PerspectiveCamera,
        newQubitCount: number,
    ): void {
        // Remove old heatmap from scene
        if (this.heatmap && this.heatmap.mesh) {
            this.scene.remove(this.heatmap.mesh);
            this.heatmap.dispose();
        }

        // Create new heatmap
        this.heatmap = new Heatmap(
            camera,
            newQubitCount,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);

        // Clear cached data
        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap = 0;

        // Update legend
        this.updateLegend();
    }

    /**
     * Initialize heatmap for initial setup
     */
    initializeForSetup(
        camera: THREE.PerspectiveCamera,
        qubitCount: number,
        qubitPositions: Map<number, THREE.Vector3>,
        numDeviceQubits: number,
    ): void {
        // Recreate heatmap with proper qubit count
        this.recreateHeatmap(camera, qubitCount);

        // Generate clusters if we have position data
        if (qubitPositions.size > 0) {
            this.generateClusters(qubitPositions, numDeviceQubits);
        }

        // Set initial effective slices
        let initialEffectiveSlices = 0;
        if (this.maxSlicesForHeatmap === -1) {
            initialEffectiveSlices = Math.max(0, 1); // At least 1 for current slice
        } else {
            initialEffectiveSlices = Math.max(
                0,
                Math.min(1, this.maxSlicesForHeatmap),
            );
        }

        this.lastEffectiveSlicesForHeatmap = initialEffectiveSlices;
        this.lastMaxObservedRawHeatmapSum = 0;
        this.updateLegend();
    }

    /**
     * Handle error state by creating fallback heatmap
     */
    handleError(
        camera: THREE.PerspectiveCamera,
        fallbackQubitCount: number = 9,
    ): void {
        this.recreateHeatmap(camera, fallbackQubitCount);

        // Update with empty data
        this.updateHeatmap(new Map(), -1, []);

        console.log("HeatmapManager: Created fallback heatmap for error state");
    }

    /**
     * Get current heatmap configuration summary
     */
    getConfigSummary(): {
        maxSlices: number;
        effectiveSlices: number;
        maxObservedSum: number;
        yellowThreshold: number;
    } {
        return {
            maxSlices: this.maxSlicesForHeatmap,
            effectiveSlices: this.lastEffectiveSlicesForHeatmap,
            maxObservedSum: this.lastMaxObservedRawHeatmapSum,
            yellowThreshold: this.heatmapYellowThreshold,
        };
    }

    /**
     * Force refresh of all heatmap components
     */
    forceRefresh(): void {
        this.clearPositionsCache();
        this.updateLegend();
    }

    /**
     * Check if heatmap is properly initialized
     */
    isInitialized(): boolean {
        return !!(this.heatmap && this.heatmap.mesh && this.heatmapLegend);
    }

    /**
     * Get mesh for adding to scene (if needed externally)
     */
    getMesh(): THREE.Points | null {
        return this.heatmap ? this.heatmap.mesh : null;
    }

    /**
     * Dispose of all heatmap resources
     */
    dispose(): void {
        console.log("HeatmapManager dispose called");

        // Remove heatmap from scene and dispose
        if (this.heatmap && this.heatmap.mesh) {
            this.scene.remove(this.heatmap.mesh);
            this.heatmap.dispose();
        }

        // Reset state
        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap = 0;

        console.log("HeatmapManager resources cleaned up");
    }
}
