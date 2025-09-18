import * as THREE from "three";
import { QubitGridController } from "../../objects/QubitGridController.js";

export interface TooltipData {
    id: number;
    stateName?: string;
    x: number;
    y: number;
    oneQubitGatesInWindow?: number;
    twoQubitGatesInWindow?: number;
    sliceWindowForGateCount?: number;
    fidelity?: number;
}

export class MouseInteractionHandler {
    private mouse: THREE.Vector2;
    private raycaster: THREE.Raycaster;
    private containerElement: HTMLElement | null;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private grid: QubitGridController | null = null;
    private onTooltipUpdateCallback:
        | ((data: TooltipData | null) => void)
        | undefined;
    private boundOnMouseMove: (event: MouseEvent) => void;
    private boundOnMouseLeave: () => void;

    // Fidelity parameters
    private currentOneQubitFidelityBase: number = 0.99;
    private currentTwoQubitFidelityBase: number = 0.98;

    constructor(
        containerElement: HTMLElement | null,
        camera: THREE.PerspectiveCamera,
        scene: THREE.Scene,
        onTooltipUpdate?: (data: TooltipData | null) => void,
    ) {
        this.containerElement = containerElement;
        this.camera = camera;
        this.scene = scene;
        this.onTooltipUpdateCallback = onTooltipUpdate;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        // Bind event handlers
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    }

    public initialize(rendererElement: HTMLElement): void {
        rendererElement.addEventListener("mousemove", this.boundOnMouseMove);
        rendererElement.addEventListener("mouseleave", this.boundOnMouseLeave);
    }

    public setGrid(grid: QubitGridController): void {
        this.grid = grid;
    }

    public getMouse(): THREE.Vector2 {
        return this.mouse;
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }): void {
        if (params.oneQubitBase !== undefined) {
            this.currentOneQubitFidelityBase = params.oneQubitBase;
        }
        if (params.twoQubitBase !== undefined) {
            this.currentTwoQubitFidelityBase = params.twoQubitBase;
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.containerElement) {
            this.onTooltipUpdateCallback?.(null);
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

            // Traverse up to find the main BlochSphere group
            while (intersectedObject) {
                if (
                    typeof intersectedObject.userData.qubitId !== "undefined" &&
                    typeof intersectedObject.userData.qubitState !== "undefined"
                ) {
                    targetBlochSphereGroup = intersectedObject;
                    break;
                }

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

            if (targetBlochSphereGroup && targetBlochSphereGroup.visible) {
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

                // Get the world position of the qubit and convert to screen coordinates
                const worldPosition = targetBlochSphereGroup.position.clone();
                const screenPosition = worldPosition.clone().project(this.camera);

                // Convert normalized device coordinates to screen coordinates
                const canvasRect = this.containerElement?.getBoundingClientRect();
                const screenX = canvasRect ?
                    (screenPosition.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left :
                    event.clientX;
                const screenY = canvasRect ?
                    (-screenPosition.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top - 120 :
                    event.clientY - 120;

                hoveredQubitData = {
                    id: qubitId,
                    x: screenX,
                    y: screenY,
                    oneQubitGatesInWindow: gateInfo.oneQubitGatesInWindow,
                    twoQubitGatesInWindow: gateInfo.twoQubitGatesInWindow,
                    sliceWindowForGateCount: gateInfo.windowForCountsInWindow,
                    fidelity: finalFidelity,
                };
            }
        }

        this.onTooltipUpdateCallback?.(hoveredQubitData);
    }

    private onMouseLeave(): void {
        this.onTooltipUpdateCallback?.(null);
    }

    public dispose(): void {
        if (this.containerElement) {
            this.containerElement.removeEventListener(
                "mousemove",
                this.boundOnMouseMove,
            );
            this.containerElement.removeEventListener(
                "mouseleave",
                this.boundOnMouseLeave,
            );
        }
    }
}
