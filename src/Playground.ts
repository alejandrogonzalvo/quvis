import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { QubitGrid } from "./QubitGrid.js";
import { State } from "./State.js";

export interface TooltipData {
    id: number;
    stateName: string; // e.g., "ZERO", "ONE"
    x: number; // screen X
    y: number; // screen Y
}

export class Playground {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraRig: THREE.Group<THREE.Object3DEventMap>;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    lightRig: THREE.Group<THREE.Object3DEventMap>;
    grid: QubitGrid;
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
    currentRepelForce: number = 0.3;
    currentIdealDistance: number = 5.0;
    currentIterations: number = 300;
    currentCoolingFactor: number = 0.95;

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

    currentSlice: number = 0; // Initialize currentSlice

    private containerElement: HTMLElement | null = null;
    private animationFrameId: number | null = null;
    private onSlicesLoadedCallback:
        | ((count: number, initialIndex: number) => void)
        | undefined;
    private onTooltipUpdateCallback:
        | ((data: TooltipData | null) => void)
        | undefined;
    private boundOnMouseMove: (event: MouseEvent) => void;
    private boundOnMouseLeave: () => void;

    constructor(
        container?: HTMLElement,
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
        onTooltipUpdate?: (data: TooltipData | null) => void, // Added callback for tooltip
    ) {
        this.containerElement = container || null;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;
        this.onTooltipUpdateCallback = onTooltipUpdate; // Store the callback
        this.scene = new THREE.Scene();
        this.mouse = new THREE.Vector2();
        this.scene.background = new THREE.Color(0x121212);

        // Bind event handlers
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseLeave = this.onMouseLeave.bind(this);

        // All direct DOM access for controls is commented out here.
        // Default values for parameters are set above as class properties.

        // this.heatmapSlicesSlider = document.getElementById(
        //     "heatmap-slices",
        // ) as HTMLInputElement;
        // this.heatmapSlicesValueDisplay = document.getElementById(
        //     "heatmap-slices-value",
        // ) as HTMLSpanElement;
        // if (this.heatmapSlicesSlider) { // Check if element exists before accessing
        //     this.maxHeatmapSlices = parseInt(this.heatmapSlicesSlider.value);
        //     if (this.heatmapSlicesValueDisplay) {
        //         this.heatmapSlicesValueDisplay.textContent =
        //             this.heatmapSlicesSlider.value;
        //     }
        // } // else maxHeatmapSlices uses default from class property

        // this.legendRedValue = document.getElementById(
        //     "legend-red-value",
        // ) as HTMLSpanElement;
        // this.legendYellowValue = document.getElementById(
        //     "legend-yellow-value",
        // ) as HTMLSpanElement;
        // this.legendGreenValue = document.getElementById(
        //     "legend-green-value",
        // ) as HTMLSpanElement;
        // this.updateLegend(); // Relies on the above elements

        // // Initialize layout control elements and parameters
        // this.repelForceSlider = document.getElementById(
        //     "repel-force",
        // ) as HTMLInputElement;
        // this.repelForceValueDisplay = document.getElementById(
        //     "repel-force-value",
        // ) as HTMLSpanElement;
        // this.idealDistanceSlider = document.getElementById(
        //     "ideal-distance",
        // ) as HTMLInputElement;
        // this.idealDistanceValueDisplay = document.getElementById(
        //     "ideal-distance-value",
        // ) as HTMLSpanElement;
        // this.iterationsSlider = document.getElementById(
        //     "iterations",
        // ) as HTMLInputElement;
        // this.iterationsValueDisplay = document.getElementById(
        //     "iterations-value",
        // ) as HTMLSpanElement;
        // this.coolingFactorSlider = document.getElementById(
        //     "cooling-factor",
        // ) as HTMLInputElement;
        // this.coolingFactorValueDisplay = document.getElementById(
        //     "cooling-factor-value",
        // ) as HTMLSpanElement;
        // this.recompileLayoutButton = document.getElementById(
        //     "recompile-layout-button",
        // ) as HTMLButtonElement;

        // // Set initial layout parameter values from sliders (which have defaults)
        // if(this.repelForceSlider) this.currentRepelForce = parseFloat(this.repelForceSlider.value);
        // if(this.idealDistanceSlider) this.currentIdealDistance = parseFloat(this.idealDistanceSlider.value);
        // if(this.iterationsSlider) this.currentIterations = parseInt(this.iterationsSlider.value);
        // if(this.coolingFactorSlider) this.currentCoolingFactor = parseFloat(this.coolingFactorSlider.value);

        // // Update display spans to match initial slider values (though HTML should handle it, this is safer)
        // if (this.repelForceValueDisplay && this.repelForceSlider)
        //     this.repelForceValueDisplay.textContent =
        //         this.repelForceSlider.value;
        // if (this.idealDistanceValueDisplay && this.idealDistanceSlider)
        //     this.idealDistanceValueDisplay.textContent =
        //         this.idealDistanceSlider.value;
        // if (this.iterationsValueDisplay && this.iterationsSlider)
        //     this.iterationsValueDisplay.textContent =
        //         this.iterationsSlider.value;
        // if (this.coolingFactorValueDisplay && this.coolingFactorSlider)
        //     this.coolingFactorValueDisplay.textContent =
        //         this.coolingFactorSlider.value;

        // // Get loading screen element
        // this.loadingScreen = document.getElementById(
        //     "loading-screen",
        // ) as HTMLElement;

        // // Initialize appearance control elements and parameters
        // this.qubitSizeSlider = document.getElementById(
        //     "qubit-size",
        // ) as HTMLInputElement;
        // this.qubitSizeValueDisplay = document.getElementById(
        //     "qubit-size-value",
        // ) as HTMLSpanElement;

        // if(this.qubitSizeSlider) this.currentQubitSize = parseFloat(this.qubitSizeSlider.value);
        // if (this.qubitSizeValueDisplay && this.qubitSizeSlider)
        //     this.qubitSizeValueDisplay.textContent = this.qubitSizeSlider.value;

        // // Get and initialize connection thickness slider
        // this.connectionThicknessSlider = document.getElementById(
        //     "connection-thickness",
        // ) as HTMLInputElement;
        // this.connectionThicknessValueDisplay = document.getElementById(
        //     "connection-thickness-value",
        // ) as HTMLSpanElement;
        // if(this.connectionThicknessSlider) this.currentConnectionThickness = parseFloat(
        //     this.connectionThicknessSlider.value,
        // );
        // if (this.connectionThicknessValueDisplay && this.connectionThicknessSlider)
        //     this.connectionThicknessValueDisplay.textContent =
        //         this.connectionThicknessSlider.value;

        // // Get and initialize inactive alpha slider
        // this.inactiveAlphaSlider = document.getElementById(
        //     "inactive-alpha",
        // ) as HTMLInputElement;
        // this.inactiveAlphaValueDisplay = document.getElementById(
        //     "inactive-alpha-value",
        // ) as HTMLSpanElement;
        // if(this.inactiveAlphaSlider) this.currentInactiveAlpha = parseFloat(this.inactiveAlphaSlider.value);
        // if (this.inactiveAlphaValueDisplay && this.inactiveAlphaSlider)
        //     this.inactiveAlphaValueDisplay.textContent =
        //         this.inactiveAlphaSlider.value;

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
        window.addEventListener("mousemove", this.boundOnMouseMove);
        window.addEventListener("mouseleave", this.boundOnMouseLeave);

        this.grid = new QubitGrid(
            this.scene,
            this.mouse,
            this.camera,
            this.maxHeatmapSlices, // Uses default or value set before controls were removed
            this.currentRepelForce,
            this.currentIdealDistance,
            this.currentIterations,
            this.currentCoolingFactor,
            this.currentConnectionThickness,
            this.currentInactiveAlpha,
            this.onSlicesLoadedCallback, // Pass the callback to QubitGrid
        );
        this.grid.setQubitScale(this.currentQubitSize);

        if (this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.aspect.value =
                renderWidth / renderHeight;
        } else {
            console.warn(
                "Heatmap not immediately available after QubitGrid construction.",
            );
        }

        // Commented out event listeners and setup calls for HTML controls
        // this.heatmapSlicesSlider.addEventListener("input", (event) => { ... });
        // this.setupLayoutControlEvents();
        // this.setupAppearanceControlEvents();

        // The tooltip is also part of the old HTML structure, its direct manipulation needs to be handled differently or removed if tooltip is redone in React
        // const instructionText = document.createElement("div");
        // ... (instructionText code) ...
        // document.body.appendChild(instructionText);
        // instructionText.remove();
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
                const qubitStateNumeric = targetBlochSphereGroup.userData
                    .qubitState as State; // This is the numeric enum value
                const stateName = State[qubitStateNumeric] || "Unknown"; // Convert numeric enum to string name

                hoveredQubitData = {
                    id: qubitId,
                    stateName: stateName,
                    x: event.clientX,
                    y: event.clientY,
                };
            }
        }
        this.onTooltipUpdateCallback?.(hoveredQubitData);
    }

    onMouseLeave() {
        this.onTooltipUpdateCallback?.(null); // Hide tooltip when mouse leaves canvas
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        this.controls.update(); // For damping or other controls-related updates

        // Update camera position for heatmap shader
        if (this.grid && this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.cameraPosition.value.copy(
                this.camera.position,
            );
            this.grid.heatmap.material.uniforms.scaleFactor.value =
                this.camera.zoom;
        }

        if (
            this.grid &&
            this.grid.heatmap &&
            this.grid.slices &&
            this.grid.slices.length > 0 &&
            this.grid.interactionPairsPerSlice &&
            this.grid.interactionPairsPerSlice.length > 0
        ) {
            // Pass the qubit instances, full slice interaction pair data, current slice index, and all slice data
            this.grid.heatmap.updatePoints(
                this.grid.qubitInstances,
                this.grid.interactionPairsPerSlice,
                this.currentSlice,
                this.grid.slices, // Pass all slice data for historical state checking
            );
        }

        this.renderer.render(this.scene, this.camera);
    }

    public updateLayoutParameters(params: {
        repelForce?: number;
        idealDistance?: number;
        iterations?: number;
        coolingFactor?: number;
    }) {
        if (params.repelForce !== undefined)
            this.currentRepelForce = params.repelForce;
        if (params.idealDistance !== undefined)
            this.currentIdealDistance = params.idealDistance;
        if (params.iterations !== undefined)
            this.currentIterations = params.iterations;
        if (params.coolingFactor !== undefined)
            this.currentCoolingFactor = params.coolingFactor;

        if (this.grid) {
            this.grid.updateLayoutParameters({
                repelForce: this.currentRepelForce,
                idealDistance: this.currentIdealDistance,
                iterations: this.currentIterations,
                coolingFactor: this.currentCoolingFactor,
            });
        }
    }

    public updateAppearanceParameters(params: {
        qubitSize?: number;
        connectionThickness?: number;
        inactiveAlpha?: number;
    }) {
        if (params.qubitSize !== undefined)
            this.currentQubitSize = params.qubitSize;
        if (params.connectionThickness !== undefined)
            this.currentConnectionThickness = params.connectionThickness;
        if (params.inactiveAlpha !== undefined)
            this.currentInactiveAlpha = params.inactiveAlpha;

        if (this.grid) {
            this.grid.updateAppearanceParameters({
                qubitSize: this.currentQubitSize,
                connectionThickness: this.currentConnectionThickness,
                inactiveAlpha: this.currentInactiveAlpha,
            });
        }
    }

    public updateHeatmapSlices(slices: number) {
        this.maxHeatmapSlices = slices;
        // this.updateLegend(); // Legend will be a React component
        if (this.grid) {
            this.grid.maxSlicesForHeatmap = this.maxHeatmapSlices;
            if (this.grid.heatmap) {
                this.grid.heatmap.maxSlices = this.maxHeatmapSlices;
            }
            this.grid.onCurrentSliceChange();
        }
    }

    public setCurrentSlice(sliceIndex: number) {
        if (this.grid) {
            this.grid.setCurrentSlice(sliceIndex);
        }
    }

    public recompileLayout() {
        // Add showLoadingScreen and hideLoadingScreen if implemented in React via callbacks or state management
        // For now, directly call the grid method.
        if (this.grid) {
            // Consider if loading screen logic should be triggered here or in the React component calling this
            this.grid.recalculateLayoutAndRedraw(
                this.currentRepelForce,
                this.currentIdealDistance,
                this.currentIterations,
                this.currentCoolingFactor,
            );
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
        window.removeEventListener("mousemove", this.boundOnMouseMove);
        window.removeEventListener("mouseleave", this.boundOnMouseLeave);

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
}
