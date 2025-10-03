import * as THREE from 'three';
import { QubitGridController } from './objects/QubitGridController.js';
import {
    ThreeSceneSetup,
    ThreeSceneComponents,
} from './interaction/modules/ThreeSceneSetup.js';
import {
    MouseInteractionHandler,
    TooltipData,
} from './interaction/modules/MouseInteractionHandler.js';
import { LayoutParameterManager } from './interaction/modules/LayoutParameterManager.js';
import { AppearanceParameterManager } from './interaction/modules/AppearanceParameterManager.js';
import { AnimationController } from './interaction/modules/AnimationController.js';
import { VisualizationStateManager } from './interaction/modules/VisualizationStateManager.js';
import { EventManager } from './interaction/modules/EventManager.js';

// Re-export TooltipData for backward compatibility
export type { TooltipData } from './interaction/modules/MouseInteractionHandler.js';

export class Playground {
    // Core components
    private threeSetup: ThreeSceneSetup;
    private mouseHandler: MouseInteractionHandler;
    private layoutManager: LayoutParameterManager;
    private appearanceManager: AppearanceParameterManager;
    private animationController: AnimationController;
    private visualizationStateManager: VisualizationStateManager;
    private eventManager: EventManager;
    public grid: QubitGridController;

    // Three.js components (from ThreeSceneSetup)
    private threeComponents: ThreeSceneComponents;

    // Instance properties
    public readonly instanceId: string;
    private containerElement: HTMLElement | null = null;

    constructor(
        container: HTMLElement | undefined,
        data: object,
        visualizationMode: 'compiled' | 'logical',
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
        onTooltipUpdate?: (data: TooltipData | null) => void,
        onModeSwitchedCallback?: (
            newSliceCount: number,
            newCurrentSliceIndex: number
        ) => void
    ) {
        this.containerElement = container || null;
        this.instanceId = `PlaygroundInstance_${Math.random().toString(36).substr(2, 9)}`;

        console.log(
            `Playground constructor called. Instance ID: ${this.instanceId}`
        );

        // Initialize modules
        this.threeSetup = new ThreeSceneSetup(this.containerElement);
        this.threeComponents = this.threeSetup.initialize();

        this.mouseHandler = new MouseInteractionHandler(
            this.containerElement,
            this.threeComponents.camera,
            this.threeComponents.scene,
            onTooltipUpdate
        );

        this.layoutManager = new LayoutParameterManager();
        this.appearanceManager = new AppearanceParameterManager();

        this.animationController = new AnimationController(
            this.threeComponents.scene,
            this.threeComponents.camera,
            this.threeComponents.renderer,
            this.threeComponents.controls
        );

        this.visualizationStateManager = new VisualizationStateManager(
            visualizationMode,
            5, // maxHeatmapSlices
            0.99, // oneQubitFidelityBase
            0.98, // twoQubitFidelityBase
            onModeSwitchedCallback,
            onSlicesLoadedCallback
        );

        this.eventManager = new EventManager(
            this.containerElement,
            this.threeComponents.camera,
            this.threeComponents.renderer
        );

        // Initialize event handlers
        this.mouseHandler.initialize(this.threeComponents.renderer.domElement);
        this.eventManager.initialize();

        // Create QubitGridController - pass the data or dataset name
        this.grid = new QubitGridController(
            this.threeComponents.scene,
            this.mouseHandler.getMouse(),
            this.threeComponents.camera,
            data,
            this.visualizationStateManager.getVisualizationMode(),
            this.visualizationStateManager.getMaxHeatmapSlices(),
            this.layoutManager.getRepelForce(),
            this.layoutManager.getIdealDistance(),
            this.layoutManager.getIterations(),
            this.layoutManager.getCoolingFactor(),
            this.appearanceManager.getConnectionThickness(),
            this.appearanceManager.getInactiveAlpha(),
            onSlicesLoadedCallback,
            () => this.threeSetup.isLightBackground(),
            this.threeComponents.smartAlignment
        );

        // Set up grid references in modules
        this.mouseHandler.setGrid(this.grid);
        this.animationController.setGrid(this.grid);
        this.eventManager.setGrid(this.grid);

        // Apply initial appearance settings
        this.grid.updateAppearanceParameters({
            qubitSize: this.appearanceManager.getQubitSize(),
        });
        this.grid.setBlochSpheresVisible(
            this.appearanceManager.areBlochSpheresVisible()
        );
        this.grid.setConnectionLinesVisible(
            this.appearanceManager.areConnectionLinesVisible()
        );

        // Set up heatmap aspect ratio
        if (this.grid.heatmap) {
            const renderWidth = this.containerElement
                ? this.containerElement.clientWidth
                : window.innerWidth;
            const renderHeight = this.containerElement
                ? this.containerElement.clientHeight
                : window.innerHeight;
            this.grid.heatmap.material.uniforms.aspect.value =
                renderWidth / renderHeight;
        }

        // Start animation
        this.animationController.start();
    }

    // Getters for accessing core components
    public get scene() {
        return this.threeComponents.scene;
    }
    public get camera() {
        return this.threeComponents.camera;
    }
    public get renderer() {
        return this.threeComponents.renderer;
    }
    public get controls() {
        return this.threeComponents.controls;
    }
    public get currentFPS() {
        return this.animationController.getCurrentFPS();
    }
    public get lastLayoutCalculationTime() {
        return this.grid ? this.grid.lastLayoutCalculationTime : 0;
    }

    // Animation methods
    public animate(): void {
        // Animation is already started in constructor, this is for compatibility
        if (!this.animationController) {
            console.warn('Animation controller not available');
        }
    }

    // Parameter getters for App compatibility
    public get currentQubitSize() {
        return this.appearanceManager.getQubitSize();
    }
    public get currentConnectionThickness() {
        return this.appearanceManager.getConnectionThickness();
    }
    public get currentInactiveAlpha() {
        return this.appearanceManager.getInactiveAlpha();
    }
    public get currentBaseSize() {
        return this.appearanceManager.getBaseSize();
    }
    public get currentRepelForce() {
        return this.layoutManager.getRepelForce();
    }
    public get currentIdealDistance() {
        return this.layoutManager.getIdealDistance();
    }
    public get currentIterations() {
        return this.layoutManager.getIterations();
    }
    public get currentCoolingFactor() {
        return this.layoutManager.getCoolingFactor();
    }
    public get currentOneQubitFidelityBase() {
        return this.visualizationStateManager.getOneQubitFidelityBase();
    }
    public get currentTwoQubitFidelityBase() {
        return this.visualizationStateManager.getTwoQubitFidelityBase();
    }

    // Visibility getters
    public get areBlochSpheresVisible() {
        return this.appearanceManager.areBlochSpheresVisible();
    }
    public get areConnectionLinesVisible() {
        return this.appearanceManager.areConnectionLinesVisible();
    }

    // Visualization state getters
    public get maxHeatmapSlices() {
        return this.visualizationStateManager.getMaxHeatmapSlices();
    }
    public get currentSlice() {
        return this.visualizationStateManager.getCurrentSlice();
    }

    // Layout methods
    public updateLayoutParameters(
        params: {
            repelForce?: number;
            idealDistance?: number;
            iterations?: number;
            coolingFactor?: number;
            attractForce?: number;
        },
        onLayoutComplete?: () => void
    ) {
        const updatedParams = this.layoutManager.updateParameters(params);
        if (this.grid) {
            this.grid.updateLayoutParameters(updatedParams, onLayoutComplete);
        }
    }

    public recompileLayout(onLayoutComplete?: () => void) {
        if (this.grid) {
            console.log('Recompiling layout with new parameters.');
            this.grid.updateLayoutParameters(
                this.layoutManager.getParameters(),
                () => {
                    console.log('Layout recompile finished.');
                    onLayoutComplete?.();
                }
            );
        } else {
            onLayoutComplete?.();
        }
    }

    public updateIdealDistance(distance: number): void {
        this.layoutManager.setIdealDistance(distance);
        if (this.grid) {
            this.grid.updateIdealDistance(distance);
        }
    }

    public applyGridLayout(): void {
        if (this.grid) {
            this.grid.applyGridLayout();
        }
    }

    // Appearance methods
    public updateAppearanceParameters(params: {
        qubitSize?: number;
        connectionThickness?: number;
        inactiveAlpha?: number;
        baseSize?: number;
    }) {
        const updatedParams = this.appearanceManager.updateParameters(params);

        if (this.grid) {
            this.grid.updateAppearanceParameters({
                qubitSize: updatedParams.qubitSize,
                connectionThickness: updatedParams.connectionThickness,
                inactiveAlpha: updatedParams.inactiveAlpha,
            });
        }

        if (params.baseSize !== undefined && this.grid && this.grid.heatmap) {
            this.grid.heatmap.updateBaseSize(updatedParams.baseSize);
        }
    }

    public setBlochSpheresVisible(visible: boolean): void {
        this.appearanceManager.setBlochSpheresVisible(visible);
        if (this.grid) {
            this.grid.setBlochSpheresVisible(visible);
        }
    }

    public setConnectionLinesVisible(visible: boolean): void {
        this.appearanceManager.setConnectionLinesVisible(visible);
        if (this.grid) {
            this.grid.setConnectionLinesVisible(visible);
        }
    }

    // Visualization methods
    public updateHeatmapSlices(slices: number) {
        this.visualizationStateManager.setMaxHeatmapSlices(slices);
        if (this.grid) {
            this.grid.updateHeatmapSlices(slices);
        } else {
            console.warn(
                `Playground (${this.instanceId}): updateHeatmapSlices called, but this.grid is not available.`
            );
        }
    }

    public setLightBackground(lightMode: boolean) {
        if (this.threeSetup) {
            this.threeSetup.setLightBackground(lightMode);
        } else {
            console.warn(
                `Playground (${this.instanceId}): setLightBackground called, but threeSetup is not available.`
            );
        }
        
        // Update heatmap border color based on background mode
        if (this.grid) {
            this.grid.updateHeatmapLightBackground(lightMode);
            // Update connection colors based on background mode
            this.grid.updateConnectionColors();
        }
    }


    public isLightBackground(): boolean {
        if (this.threeSetup) {
            return this.threeSetup.isLightBackground();
        }
        return false;
    }

    public getKeyboardController() {
        return this.threeComponents?.keyboardController;
    }

    public getSmartAlignment() {
        return this.threeComponents?.smartAlignment;
    }

    public updateHeatmapColorParameters(params: {
        fadeThreshold?: number;
        greenThreshold?: number;
        yellowThreshold?: number;
        intensityPower?: number;
        minIntensity?: number;
        borderWidth?: number;
    }) {
        if (this.grid) {
            this.grid.updateHeatmapColorParameters(params);
        } else {
            console.warn(
                `Playground (${this.instanceId}): updateHeatmapColorParameters called, but grid is not available.`
            );
        }
    }

    public getHeatmapColorParameters(): {
        fadeThreshold: number;
        greenThreshold: number;
        yellowThreshold: number;
        intensityPower: number;
        minIntensity: number;
        borderWidth: number;
    } {
        if (this.grid) {
            return this.grid.getHeatmapColorParameters();
        }
        return {
            fadeThreshold: 0.1,
            greenThreshold: 0.3,
            yellowThreshold: 0.7,
            intensityPower: 0.3,
            minIntensity: 0.01,
            borderWidth: 0.0,
        };
    }

    public setCurrentSlice(sliceIndex: number) {
        this.visualizationStateManager.setCurrentSlice(sliceIndex);
        if (this.grid) {
            this.grid.setCurrentSlice(sliceIndex);
        }
    }

    public switchToCircuit(circuitIndex: number): void {
        if (this.grid) {
            this.grid.switchToCircuit(circuitIndex);
            const newSliceCount = this.grid.getActiveSliceCount();
            const newCurrentSliceIndex = this.grid.getActiveCurrentSliceIndex();
            this.visualizationStateManager.notifyModeSwitched(
                newSliceCount,
                newCurrentSliceIndex
            );
        }
        console.log(`Playground switched to circuit: ${circuitIndex}`);
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }) {
        this.visualizationStateManager.updateFidelityParameters(params);
        this.mouseHandler.updateFidelityParameters(params);
    }

    // Camera methods
    public resetCamera(): void {
        if (this.controls) {
            this.controls.reset();
        }
    }

    // Utility methods
    public triggerLegendRefresh(): void {
        if (this.grid) {
            console.log(
                'Legend refresh triggered - handled internally by HeatmapManager'
            );
        } else {
            console.warn(
                'Playground: QubitGrid (this.grid) not ready for legend refresh.'
            );
        }
    }

    public dispose() {
        // Stop animation
        this.animationController.dispose();

        // Dispose modules
        this.mouseHandler.dispose();
        this.eventManager.dispose();
        this.threeSetup.dispose();

        // Dispose grid
        if (this.grid) {
            this.grid.dispose();
        }

        // Dispose scene objects
        if (this.threeComponents.scene) {
            this.threeComponents.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) =>
                                material.dispose()
                            );
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });
        }

        console.log('Playground disposed');
    }
}
