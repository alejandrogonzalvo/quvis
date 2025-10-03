import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { KeyboardCameraController } from "./KeyboardCameraController.js";
import { SmartCameraAlignment } from "./SmartCameraAlignment.js";

export interface ThreeSceneComponents {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraRig: THREE.Group<THREE.Object3DEventMap>;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    keyboardController: KeyboardCameraController;
    smartAlignment: SmartCameraAlignment;
    lightRig: THREE.Group<THREE.Object3DEventMap>;
}

export class ThreeSceneSetup {
    private containerElement: HTMLElement | null;
    private components: ThreeSceneComponents | null = null;

    constructor(containerElement: HTMLElement | null) {
        this.containerElement = containerElement;
    }

    public initialize(): ThreeSceneComponents {
        if (this.components) {
            return this.components;
        }

        const renderWidth = this.containerElement
            ? this.containerElement.clientWidth
            : window.innerWidth;
        const renderHeight = this.containerElement
            ? this.containerElement.clientHeight
            : window.innerHeight;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75,
            renderWidth / renderHeight,
            0.1,
            1000,
        );
        camera.position.set(0, 0, 20);

        // Create camera rig
        const cameraRig = new THREE.Group();
        cameraRig.add(camera);
        scene.add(cameraRig);

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(renderWidth, renderHeight);

        if (this.containerElement) {
            this.containerElement.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
            console.warn(
                "ThreeSceneSetup: No container element provided, appending to document.body.",
            );
        }

        // Create controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Create keyboard camera controller
        const keyboardController = new KeyboardCameraController(camera, controls);
        keyboardController.initialize();

        // Get smart alignment from keyboard controller (it creates its own instance)
        const smartAlignment = keyboardController.getSmartAlignment();

        // Setup lights
        const lightRig = this.setupLights(scene, camera);

        this.components = {
            scene,
            camera,
            cameraRig,
            renderer,
            controls,
            keyboardController,
            smartAlignment,
            lightRig,
        };

        return this.components;
    }

    private setupLights(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
    ): THREE.Group<THREE.Object3DEventMap> {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const lightRig = new THREE.Group();

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        lightRig.add(mainLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 2, 2);
        lightRig.add(pointLight);

        camera.add(lightRig); // Attach lights to camera

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
        scene.add(hemiLight);

        return lightRig;
    }

    public updateSize(): void {
        if (!this.components) return;

        const renderWidth = this.containerElement
            ? this.containerElement.clientWidth
            : window.innerWidth;
        const renderHeight = this.containerElement
            ? this.containerElement.clientHeight
            : window.innerHeight;

        this.components.camera.aspect = renderWidth / renderHeight;
        this.components.camera.updateProjectionMatrix();
        this.components.renderer.setSize(renderWidth, renderHeight);
    }

    public setLightBackground(lightMode: boolean): void {
        if (!this.components) return;
        
        // Dark background: #121212, Light background: #ffffff (very light gray)
        const backgroundColor = lightMode ? 0xffffff: 0x121212;
        this.components.scene.background = new THREE.Color(backgroundColor);
    }

    public isLightBackground(): boolean {
        if (!this.components || !this.components.scene.background) return false;
        
        const bgColor = this.components.scene.background as THREE.Color;
        // Check if closer to light color (0xf5f5f5) than dark (0x121212)
        return bgColor.r > 0.5;
    }

    public dispose(): void {
        if (!this.components) return;

        if (this.components.keyboardController) {
            this.components.keyboardController.dispose();
        }
        if (this.components.controls) {
            this.components.controls.dispose();
        }
        if (this.components.renderer) {
            this.components.renderer.dispose();
            if (this.components.renderer.domElement.parentElement) {
                this.components.renderer.domElement.parentElement.removeChild(
                    this.components.renderer.domElement,
                );
            }
        }
        this.components = null;
    }
}
