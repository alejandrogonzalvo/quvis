import * as THREE from "three";
import { QubitGridController } from "../../objects/QubitGridController.js";

export class EventManager {
    private containerElement: HTMLElement | null;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private grid: QubitGridController | null = null;
    private boundOnWindowResize: () => void;

    constructor(
        containerElement: HTMLElement | null,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
    ) {
        this.containerElement = containerElement;
        this.camera = camera;
        this.renderer = renderer;
        this.boundOnWindowResize = this.onWindowResize.bind(this);
    }

    public initialize(): void {
        window.addEventListener("resize", this.boundOnWindowResize);
    }

    public setGrid(grid: QubitGridController): void {
        this.grid = grid;
    }

    private onWindowResize(): void {
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
            // Update heatmap render target size for two-pass rendering
            this.grid.heatmap.resize(renderWidth, renderHeight);
        }
    }

    public dispose(): void {
        window.removeEventListener("resize", this.boundOnWindowResize);
    }
}
