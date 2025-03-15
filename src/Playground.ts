import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { QubitGrid } from './QubitGrid.js';

export class Playground {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraRig: THREE.Group<THREE.Object3DEventMap>;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    lightRig: THREE.Group<THREE.Object3DEventMap>;
    grid: QubitGrid;

    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);        
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 20);

        // Create a camera rig
        this.cameraRig = new THREE.Group();
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Controls - now targeting the camera rig
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Setup lights
        this.setupLights();
        
        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        window.addEventListener('mouseleave', this.onMouseLeave.bind(this));

        // Create Qubit Grid
        this.grid = new QubitGrid();

        // Start animation
        this.animate();
    }
    setupLights() {
        // Static ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Create a light rig that follows the camera
        this.lightRig = new THREE.Group();
        
        // Main light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.lightRig.add(mainLight);

        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 2, 2);
        this.lightRig.add(pointLight);

        // Add the light rig to the camera
        this.camera.add(this.lightRig);

        // Optional: Add static hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
        this.scene.add(hemiLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.lightRig.quaternion.copy(this.camera.quaternion);
        this.renderer.render(this.scene, this.camera);
    }
}