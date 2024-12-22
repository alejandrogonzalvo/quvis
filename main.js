import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class QubitGrid {
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
        
        // Qubit management
        this.qubits = new Map();
        this.states = ['0', '1', '+', '-', 'superposition'];
        
        // Raycaster for hover detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // Create grid
        this.createGrid(5, 5); // 5x5 grid
        
        // Start animation
        this.animate();
        
        // Start random state changes
        setInterval(() => this.randomStateChange(), 1000);
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

    createGrid(rows, cols) {
        const spacing = 2;
        const offsetX = (cols - 1) * spacing / 2;
        const offsetY = (rows - 1) * spacing / 2;
        
        for(let i = 0; i < rows; i++) {
            for(let j = 0; j < cols; j++) {
                const x = j * spacing - offsetX;
                const y = i * spacing - offsetY;
                this.createQubit(i * cols + j, x, y);
            }
        }
    }
    
    createQubit(id, x, y) {
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: this.getStateColor('0'),
            specular: 0x444444,
            shininess: 30,
            emissive: 0x0,
            emissiveIntensity: 0.2
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, 0);
        sphere.userData = { id, state: '0' };
        
        // Add subtle glow effect
        const glowGeometry = new THREE.SphereGeometry(0.45, 32, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: this.getStateColor('0'),
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sphere.add(glow);
        
        this.scene.add(sphere);
        this.qubits.set(id, sphere);
        return sphere;
    }

    
    getStateColor(state) {
        const colors = {
            '0': 0x00ff00,        // Green
            '1': 0xff0000,        // Red
            '+': 0x0000ff,        // Blue
            '-': 0xff00ff,        // Purple
            'superposition': 0xffff00  // Yellow
        };
        return colors[state] || 0x00ff00;
    }
    
    updateQubitState(id, newState) {
        const qubit = this.qubits.get(id);
        if (qubit) {
            qubit.material.color.setHex(this.getStateColor(newState));
            qubit.userData.state = newState;
        }
    }
    
    randomStateChange() {
        const randomId = Math.floor(Math.random() * this.qubits.size);
        const randomState = this.states[Math.floor(Math.random() * this.states.length)];
        this.updateQubitState(randomId, randomState);
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        // Reset info for all qubits
        document.getElementById('info').textContent = 'Hover over qubits to see their state';
        
        if (intersects.length > 0) {
            const qubit = intersects[0].object;
            if (qubit.userData.state) {
                document.getElementById('info').textContent = 
                    `Qubit ${qubit.userData.id}: State |${qubit.userData.state}⟩`;
            }
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update light rig to match camera position
        this.lightRig.quaternion.copy(this.camera.quaternion);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Create the visualization
const grid = new QubitGrid();
