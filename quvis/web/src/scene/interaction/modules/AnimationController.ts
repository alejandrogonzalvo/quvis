import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { QubitGridController } from "../../objects/QubitGridController.js";

export class AnimationController {
    private animationFrameId: number | null = null;
    private currentFPS: number = 0;
    private lastFPSTime: number = 0;
    private frameCount: number = 0;
    private isRunning: boolean = false;

    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private grid: QubitGridController | null = null;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        controls: OrbitControls,
    ) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
    }

    public setGrid(grid: QubitGridController): void {
        this.grid = grid;
    }

    public start(): void {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public getCurrentFPS(): number {
        return this.currentFPS;
    }

    private animate(): void {
        if (!this.isRunning) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Update FPS counter
        this.updateFPS();

        // Update controls
        this.controls.update();

        // LOD update based on camera distance
        if (this.grid) {
            const distance = this.controls.getDistance();
            this.grid.updateLOD(distance);
        }

        // Update camera position uniform for heatmap shader
        if (this.grid && this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.cameraPosition.value.copy(
                this.camera.position,
            );
        }

        // Render heatmap if present (two-pass rendering)
        if (this.grid && this.grid.heatmap) {
            // Temporarily remove heatmap mesh from scene to avoid double rendering
            const heatmapMesh = this.grid.heatmap.mesh;
            const wasInScene = heatmapMesh.parent === this.scene;
            if (wasInScene) {
                this.scene.remove(heatmapMesh);
            }
            
            // Render the main scene without heatmap
            this.renderer.render(this.scene, this.camera);
            
            // Render heatmap with two-pass system over the main scene
            this.grid.heatmap.render(this.renderer, this.scene);
            
            // Restore heatmap mesh to scene for other operations
            if (wasInScene) {
                this.scene.add(heatmapMesh);
            }
        } else {
            // Standard single-pass rendering when no heatmap
            this.renderer.render(this.scene, this.camera);
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

    public dispose(): void {
        this.stop();
    }
}
