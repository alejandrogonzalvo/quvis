import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { QubitGridController } from "./QubitGridController.js";

export interface TooltipData {
    id: number;
    stateName?: string; // e.g., "ZERO", "ONE" - now optional
    x: number; // screen X
    y: number; // screen Y
    oneQubitGatesInWindow?: number; // Renamed from oneQubitGateCount
    twoQubitGatesInWindow?: number; // Renamed from twoQubitGateCount
    sliceWindowForGateCount?: number; // Will map to windowForCountsInWindow
    fidelity?: number; // New: for fidelity placeholder
}

export class Playground {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraRig: THREE.Group<THREE.Object3DEventMap>;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    lightRig: THREE.Group<THREE.Object3DEventMap>;
    grid: QubitGridController;
    mouse: THREE.Vector2;
    raycaster: THREE.Raycaster;
    // Commented out direct DOM element properties for controls
    // heatmapSlicesSlider: HTMLInputElement;
    // heatmapSlicesValueDisplay: HTMLSpanElement;
    maxHeatmapSlices: number = 5; // Default value
    // legendRedValue: HTMLSpanElement;
    // legendYellowValue: HTMLSpanElement;
    // legendGreenValue: HTMLSpanElement;

    // Layout control elements
    // repelForceSlider: HTMLInputElement;
    // repelForceValueDisplay: HTMLSpanElement;
    // idealDistanceSlider: HTMLInputElement;
    // idealDistanceValueDisplay: HTMLSpanElement;
    // iterationsSlider: HTMLInputElement;
    // iterationsValueDisplay: HTMLSpanElement;
    // coolingFactorSlider: HTMLInputElement;
    // coolingFactorValueDisplay: HTMLSpanElement;
    // recompileLayoutButton: HTMLButtonElement;

    // Stored layout parameters - Using defaults defined here
    currentRepelForce: number = 0.6;
    currentIdealDistance: number = 1.0;
    currentIterations: number = 500;
    currentCoolingFactor: number = 1.0;

    // Loading screen element
    // loadingScreen: HTMLElement; // Will be handled by React if needed

    // Appearance control elements
    // qubitSizeSlider: HTMLInputElement;
    // qubitSizeValueDisplay: HTMLSpanElement;
    // connectionThicknessSlider: HTMLInputElement;
    // connectionThicknessValueDisplay: HTMLSpanElement;
    // inactiveAlphaSlider: HTMLInputElement;
    // inactiveAlphaValueDisplay: HTMLSpanElement;

    // Stored appearance parameters - Using defaults defined here
    currentQubitSize: number = 1.0;
    currentConnectionThickness: number = 0.05;
    currentInactiveAlpha: number = 0.1;
    currentBaseSize: number = 500.0; // Default from Heatmap.ts shader
    areBlochSpheresVisible: boolean = false; // Default off
    areConnectionLinesVisible: boolean = true; // Default on

    currentSlice: number = 0; // Initialize currentSlice
    currentOneQubitFidelityBase: number = 0.99; // Default base fidelity for 1-qubit gates
    currentTwoQubitFidelityBase: number = 0.98; // Default base fidelity for 2-qubit gates

    // Debug Info
    public currentFPS: number = 0;
    private lastFPSTime: number = 0;
    private frameCount: number = 0;

    private containerElement: HTMLElement | null = null;
    private animationFrameId: number | null = null;
    private onSlicesLoadedCallback:
        | ((count: number, initialIndex: number) => void)
        | undefined;
    private onTooltipUpdateCallback:
        | ((data: TooltipData | null) => void)
        | undefined;
    private onModeSwitchedCallback:
        | ((newSliceCount: number, newCurrentSliceIndex: number) => void)
        | undefined;
    private boundOnMouseMove: (event: MouseEvent) => void;
    private boundOnMouseLeave: () => void;
    public readonly instanceId: string; // For debugging
    private readonly datasetName: string; // To store the selected dataset name
    private visualizationMode: "compiled" | "logical"; // Changed from readonly to allow update

    constructor(
        container: HTMLElement | undefined, // Made container explicitly possibly undefined to match usage
        datasetName: string, // New parameter for the dataset name
        visualizationMode: "compiled" | "logical", // New parameter for visualization mode
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
        onTooltipUpdate?: (data: TooltipData | null) => void, // Added callback for tooltip
        onModeSwitchedCallback?: (
            newSliceCount: number,
            newCurrentSliceIndex: number,
        ) => void, // New callback
    ) {
        this.containerElement = container || null;
        this.datasetName = datasetName; // Store the dataset name
        this.visualizationMode = visualizationMode; // Store the visualization mode
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;
        this.onTooltipUpdateCallback = onTooltipUpdate; // Store the callback
        this.onModeSwitchedCallback = onModeSwitchedCallback; // Store the new callback
        this.scene = new THREE.Scene();
        this.mouse = new THREE.Vector2();
        this.scene.background = new THREE.Color(0x121212);
        this.instanceId = `PlaygroundInstance_${Math.random().toString(36).substr(2, 9)}`; // Assign unique ID
        console.log(
            `Playground constructor called. Instance ID: ${this.instanceId}`,
        ); // Log instance ID

        // Bind event handlers
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseLeave = this.onMouseLeave.bind(this);

        // Default values for parameters are set above as class properties.
        // All direct DOM access for controls is commented out.

        const renderWidth = this.containerElement
            ? this.containerElement.clientWidth
            : window.innerWidth;
        const renderHeight = this.containerElement
            ? this.containerElement.clientHeight
            : window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            75,
            renderWidth / renderHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 0, 20);

        this.cameraRig = new THREE.Group();
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(renderWidth, renderHeight);

        if (this.containerElement) {
            this.containerElement.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
            console.warn(
                "Playground: No container element provided, appending to document.body.",
            );
        }

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupLights();

        this.raycaster = new THREE.Raycaster();

        window.addEventListener("resize", this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener(
            "mousemove",
            this.boundOnMouseMove,
        );
        this.renderer.domElement.addEventListener(
            "mouseleave",
            this.boundOnMouseLeave,
        );

        this.grid = new QubitGridController(
            this.scene,
            this.mouse,
            this.camera,
            this.datasetName, // Pass datasetName to QubitGrid
            this.visualizationMode, // Pass visualizationMode to QubitGrid
            this.maxHeatmapSlices,
            this.currentRepelForce,
            this.currentIdealDistance,
            this.currentIterations,
            this.currentCoolingFactor,
            this.currentConnectionThickness,
            this.currentInactiveAlpha,
            this.onSlicesLoadedCallback,
        );
        this.grid.updateAppearanceParameters({
            qubitSize: this.currentQubitSize,
        });
        this.grid.setBlochSpheresVisible(this.areBlochSpheresVisible);
        this.grid.setConnectionLinesVisible(this.areConnectionLinesVisible);

        if (this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.aspect.value =
                renderWidth / renderHeight;
        } else {
            console.warn(
                "Heatmap not immediately available after QubitGrid construction.",
            );
        }

        this.animate();
    }

    // updateLegend() { // This method relies on DOM elements that are being removed/commented out
    //     if (
    //         this.legendRedValue &&
    //         this.legendYellowValue &&
    //         this.legendGreenValue
    //     ) {
    //         this.legendRedValue.textContent = `${this.maxHeatmapSlices}`;
    //         this.legendYellowValue.textContent = `${Math.ceil(
    //             this.maxHeatmapSlices * 0.5,
    //         )}`;
    //         this.legendGreenValue.textContent = `0`;
    //     }
    // }

    // setupLayoutControlEvents() { // This method and its contents are commented out as they rely on HTML elements
    //     // this.repelForceSlider.addEventListener("input", (event) => { ... });
    //     // ... other listeners ...
    //     // this.recompileLayoutButton.addEventListener("click", () => { ... });
    // }

    // setupAppearanceControlEvents() { // This method and its contents are commented out
    //     // this.qubitSizeSlider.addEventListener("input", (event) => { ... });
    //     // ... other listeners ...
    // }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        this.lightRig = new THREE.Group();

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.lightRig.add(mainLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 2, 2);
        this.lightRig.add(pointLight);

        this.camera.add(this.lightRig); // Attach lights to camera rig

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
        this.scene.add(hemiLight);
    }

    onWindowResize() {
        const renderWidth = this.containerElement
            ? this.containerElement.clientWidth
            : window.innerWidth;
        const renderHeight = this.containerElement
            ? this.containerElement.clientHeight
            : window.innerHeight;

        this.camera.aspect = renderWidth / renderHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(renderWidth, renderHeight);

        if (this.grid && this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.aspect.value =
                renderWidth / renderHeight;
        }
    }

    onMouseMove(event: MouseEvent) {
        if (!this.containerElement) {
            this.onTooltipUpdateCallback?.(null); // Hide tooltip if no container
            return;
        }
        const rect = this.containerElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children,
            true,
        );

        let hoveredQubitData: TooltipData | null = null;

        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            let targetBlochSphereGroup = null;

            // Traverse up to find the main BlochSphere group which should have qubitId and qubitState
            while (intersectedObject) {
                // Check if this object is a BlochSphere group and has the necessary userData
                if (
                    typeof intersectedObject.userData.qubitId !== "undefined" &&
                    typeof intersectedObject.userData.qubitState !== "undefined"
                ) {
                    targetBlochSphereGroup = intersectedObject;
                    break;
                }
                // Check for specific named components if BlochSphere group itself isn't directly intersected
                // e.g. if the arrow or axes are children of the main bloch sphere group
                if (
                    intersectedObject.parent &&
                    typeof intersectedObject.parent.userData.qubitId !==
                        "undefined" &&
                    typeof intersectedObject.parent.userData.qubitState !==
                        "undefined"
                ) {
                    targetBlochSphereGroup = intersectedObject.parent;
                    break;
                }
                if (
                    intersectedObject.parent &&
                    intersectedObject.parent.parent &&
                    typeof intersectedObject.parent.parent.userData.qubitId !==
                        "undefined" &&
                    typeof intersectedObject.parent.parent.userData
                        .qubitState !== "undefined"
                ) {
                    // For arrow parts (shaft/head are children of arrowGroup, which is child of BlochSphere group)
                    targetBlochSphereGroup = intersectedObject.parent.parent;
                    break;
                }

                if (
                    !intersectedObject.parent ||
                    !(intersectedObject.parent instanceof THREE.Object3D)
                ) {
                    break;
                }
                intersectedObject = intersectedObject.parent;
            }

            if (targetBlochSphereGroup) {
                const qubitId = targetBlochSphereGroup.userData
                    .qubitId as number;

                let gateInfo = {
                    oneQubitGatesInWindow: 0,
                    twoQubitGatesInWindow: 0,
                    totalOneQubitGates: 0,
                    totalTwoQubitGates: 0,
                    windowForCountsInWindow: 0,
                };
                let finalFidelity = 0;

                if (this.grid) {
                    gateInfo = this.grid.getGateCountForQubit(qubitId);

                    const fidelity1Q = Math.pow(
                        this.currentOneQubitFidelityBase,
                        gateInfo.totalOneQubitGates,
                    );
                    const fidelity2Q = Math.pow(
                        this.currentTwoQubitFidelityBase,
                        gateInfo.totalTwoQubitGates,
                    );
                    const calculatedFidelity = fidelity1Q * fidelity2Q;
                    finalFidelity = Math.min(1.0, calculatedFidelity);
                }

                hoveredQubitData = {
                    id: qubitId,
                    x: event.clientX,
                    y: event.clientY,
                    oneQubitGatesInWindow: gateInfo.oneQubitGatesInWindow,
                    twoQubitGatesInWindow: gateInfo.twoQubitGatesInWindow,
                    sliceWindowForGateCount: gateInfo.windowForCountsInWindow,
                    fidelity: finalFidelity,
                };
            }
        }
        this.onTooltipUpdateCallback?.(hoveredQubitData);
    }

    onMouseLeave() {
        this.onTooltipUpdateCallback?.(null); // Hide tooltip when mouse leaves canvas
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        // Update FPS counter
        this.updateFPS();

        this.controls.update();

        // LOD update based on camera distance
        if (this.grid) {
            const distance = this.controls.getDistance();
            this.grid.updateLOD(distance);
        }

        this.renderer.render(this.scene, this.camera);

        // Update camera position uniform for heatmap shader
        if (this.grid && this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.cameraPosition.value.copy(
                this.camera.position,
            );
        }
    }

    public get lastLayoutCalculationTime(): number {
        return this.grid ? this.grid.lastLayoutCalculationTime : 0;
    }

    public updateLayoutParameters(
        params: {
            repelForce?: number;
            idealDistance?: number;
            iterations?: number;
            coolingFactor?: number;
        },
        onLayoutComplete?: () => void,
    ) {
        if (params.repelForce !== undefined)
            this.currentRepelForce = params.repelForce;
        if (params.idealDistance !== undefined)
            this.currentIdealDistance = params.idealDistance;
        if (params.iterations !== undefined)
            this.currentIterations = params.iterations;
        if (params.coolingFactor !== undefined)
            this.currentCoolingFactor = params.coolingFactor;

        if (this.grid) {
            this.grid.updateLayoutParameters(
                {
                    repelForce: this.currentRepelForce,
                    idealDistance: this.currentIdealDistance,
                    iterations: this.currentIterations,
                    coolingFactor: this.currentCoolingFactor,
                },
                onLayoutComplete,
            );
        }
    }

    public updateAppearanceParameters(params: {
        qubitSize?: number;
        connectionThickness?: number;
        inactiveAlpha?: number;
        baseSize?: number; // Added baseSize
    }) {
        let gridUpdateNeeded = false;
        if (params.qubitSize !== undefined) {
            this.currentQubitSize = params.qubitSize;
            // Actual update will be handled by grid.updateAppearanceParameters
            gridUpdateNeeded = true;
        }
        if (params.connectionThickness !== undefined) {
            this.currentConnectionThickness = params.connectionThickness;
            gridUpdateNeeded = true;
        }
        if (params.inactiveAlpha !== undefined) {
            this.currentInactiveAlpha = params.inactiveAlpha;
            gridUpdateNeeded = true;
        }

        if (gridUpdateNeeded && this.grid) {
            this.grid.updateAppearanceParameters({
                qubitSize: this.currentQubitSize,
                connectionThickness: this.currentConnectionThickness,
                inactiveAlpha: this.currentInactiveAlpha,
            });
        }

        if (params.baseSize !== undefined) {
            this.currentBaseSize = params.baseSize;
            if (this.grid && this.grid.heatmap) {
                this.grid.heatmap.updateBaseSize(this.currentBaseSize);
            }
        }
    }

    public updateHeatmapSlices(slices: number) {
        console.log(
            `Playground (${this.instanceId}): updateHeatmapSlices ENTERED with slices = ${slices}`,
        ); // Modified log
        this.maxHeatmapSlices = slices;
        // this.updateLegend(); // Legend will be a React component
        // console.log(`Playground.updateHeatmapSlices: new maxSlices = ${slices}`); // Original log, can be kept or removed
        if (this.grid) {
            this.grid.updateHeatmapSlices(this.maxHeatmapSlices);
            // Legend refresh is now handled internally by HeatmapManager
        } else {
            console.warn(
                `Playground (${this.instanceId}): updateHeatmapSlices called, but this.grid is not available.`,
            );
        }
    }

    public setCurrentSlice(sliceIndex: number) {
        this.currentSlice = sliceIndex; // Update Playground's own currentSlice tracking
        if (this.grid) {
            this.grid.setCurrentSlice(sliceIndex);
        }
    }

    public recompileLayout(onLayoutComplete?: () => void) {
        if (this.grid) {
            console.log("Recompiling layout with new parameters.");
            this.grid.updateLayoutParameters(
                {
                    repelForce: this.currentRepelForce,
                    idealDistance: this.currentIdealDistance,
                    iterations: this.currentIterations,
                    coolingFactor: this.currentCoolingFactor,
                },
                () => {
                    // This callback ensures that any follow-up action
                    // happens only after the layout and redraw are complete.
                    console.log("Layout recompile finished.");
                    onLayoutComplete?.();
                },
            );
        } else {
            onLayoutComplete?.();
        }
    }

    // public showLoadingScreen() { // To be handled by React UI
    //     // if (this.loadingScreen) this.loadingScreen.style.display = "flex";
    // }

    // public hideLoadingScreen() { // To be handled by React UI
    //     // if (this.loadingScreen) this.loadingScreen.style.display = "none";
    // }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener("resize", this.onWindowResize.bind(this));
        this.renderer.domElement.removeEventListener(
            "mousemove",
            this.boundOnMouseMove,
        );
        this.renderer.domElement.removeEventListener(
            "mouseleave",
            this.boundOnMouseLeave,
        );

        if (this.controls) {
            this.controls.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentElement) {
                this.renderer.domElement.parentElement.removeChild(
                    this.renderer.domElement,
                );
            }
        }
        if (this.grid) {
            this.grid.dispose();
        }
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) =>
                                material.dispose(),
                            );
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });
        }
        console.log("Playground disposed");
    }

    // New method to be called by React components to refresh the legend
    public triggerLegendRefresh(): void {
        if (this.grid) {
            // Legend refresh is now handled internally by HeatmapManager
            // when updateHeatmapSlices is called or during normal visualization updates
            console.log(
                "Legend refresh triggered - handled internally by HeatmapManager",
            );
        } else {
            console.warn(
                "Playground: QubitGrid (this.grid) not ready for legend refresh.",
            );
        }
    }

    private loadInitialData(): void {
        // ... existing code ...
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }) {
        if (params.oneQubitBase !== undefined) {
            this.currentOneQubitFidelityBase = params.oneQubitBase;
        }
        if (params.twoQubitBase !== undefined) {
            this.currentTwoQubitFidelityBase = params.twoQubitBase;
        }
        // Potentially, you might want to trigger an update in QubitGrid if fidelity affects visuals directly
        // For example, if qubit appearance changes based on its calculated fidelity.
        // this.grid.updateFidelityDisplay(); // Assuming such a method exists or is needed in QubitGrid
        console.log(
            "Fidelity parameters updated in Playground:",
            this.currentOneQubitFidelityBase,
            this.currentTwoQubitFidelityBase,
        );
    }

    public setVisualizationMode(mode: "compiled" | "logical"): void {
        if (this.visualizationMode === mode) {
            return; // No change needed
        }
        this.visualizationMode = mode;
        if (this.grid) {
            this.grid.setVisualizationMode(mode);
            // After the grid has switched mode and updated its internal state (slice count, current index),
            // invoke the callback to notify App.tsx or other listeners.
            const newSliceCount = this.grid.getActiveSliceCount();
            const newCurrentSliceIndex = this.grid.getActiveCurrentSliceIndex();
            this.onModeSwitchedCallback?.(newSliceCount, newCurrentSliceIndex);
        }
        console.log(`Playground visualization mode set to: ${mode}`);
    }

    public applyGridLayout(): void {
        if (this.grid) {
            this.grid.applyGridLayout();
        }
    }

    public resetCamera(): void {
        if (this.controls) {
            this.controls.reset();
        }
    }

    public updateIdealDistance(distance: number): void {
        if (this.grid) {
            this.currentIdealDistance = distance;
            this.grid.updateIdealDistance(distance);
        }
    }

    public setBlochSpheresVisible(visible: boolean): void {
        this.areBlochSpheresVisible = visible;
        if (this.grid) {
            this.grid.setBlochSpheresVisible(visible);
        }
    }

    public setConnectionLinesVisible(visible: boolean): void {
        this.areConnectionLinesVisible = visible;
        if (this.grid) {
            this.grid.setConnectionLinesVisible(visible);
        }
    }

    private updateFPS(): void {
        const now = performance.now();
        this.frameCount++;
        if (now >= this.lastFPSTime + 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSTime = now;
        }
    }
}
