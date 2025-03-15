import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { npzLoader } from './npzLoader.js';

export class QubitGrid {
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
        window.addEventListener('mouseleave', this.onMouseLeave.bind(this));

        
        // Create grid
        this.createGrid(5, 5); // 5x5 grid
        
        // Start animation
        this.animate();
        
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.generateNewSlice();
            }
        });

        // Add timeline-related properties
        this.timelineSlices = []; // Array to store state snapshots
        this.currentSlice = 0;
        
        // Add timeline markers container
        this.timelineMarkers = document.createElement('div');
        this.timelineMarkers.style.position = 'fixed';
        this.timelineMarkers.style.bottom = '50px';
        this.timelineMarkers.style.width = '80%';
        this.timelineMarkers.style.left = '10%';
        this.timelineMarkers.style.height = '20px';
        document.body.appendChild(this.timelineMarkers);

        // this.loadNPZData('approx_states.npz').then(() => {
        //     this.saveCurrentState();
        // });

        this.saveCurrentState();
    }

    async loadNPZData(url) {
        const loader = new npzLoader();
        const data = await loader.load(url);
        
        // Process each time step exactly like Spacebar generates new slices
        const numSteps = Object.values(data)[0].length;
        
        for (let step = 0; step < numSteps; step++) {
            // Update all qubits for this step
            Object.entries(data).forEach(([qubitKey, steps]) => {
                const qubitId = parseInt(qubitKey);
                const [x, y, z] = steps[step];
                const state = this.xyzToState([x, y, z]);
                this.updateQubitState(qubitId, state);
            });
            
            // Save as new slice exactly like generateNewSlice
            this.saveCurrentState();
        }
    }

    xyzToState([x, y, z]) {
        const THRESHOLD = 0.9;
        if (z > THRESHOLD) return '0';
        if (z < -THRESHOLD) return '1';
        if (x > THRESHOLD) return '+';
        if (x < -THRESHOLD) return '-';
        return 'superposition';
    }

    saveCurrentState() {
        const stateSlice = new Map();
        this.qubits.forEach((qubit, id) => {
            stateSlice.set(id, qubit.userData.state);
        });
        this.timelineSlices.push(stateSlice);
        
        
        const timeline = document.getElementById('timeline');
        timeline.max = this.timelineSlices.length - 1;
        timeline.step = "1"; // Enforce integer steps

        this.updateTimelineMarkers();
    }

    updateTimelineMarkers() {
        // Clear existing markers
        this.timelineMarkers.innerHTML = '';
        
        // Create new markers
        this.timelineSlices.forEach((_, index) => {
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = `${(index / (this.timelineSlices.length - 1)) * 100}%`;
            marker.style.width = '2px';
            marker.style.height = '20px';
            marker.style.backgroundColor = '#fff';
            marker.style.transform = 'translateX(-1px)';
            this.timelineMarkers.appendChild(marker);
        });
    }

    loadStateFromSlice(sliceIndex) {
        const stateSlice = this.timelineSlices[sliceIndex];
        if (!stateSlice) return;

        stateSlice.forEach((state, id) => {
            this.updateQubitState(id, state);
        });
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


    createArrow(direction, color) {
        const arrowGroup = new THREE.Group();
    
        // Create the shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const shaftMaterial = new THREE.MeshBasicMaterial({ color: color });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.y = 0.175; // Half of the shaft length
        
        // Create the arrow head (cone)
        const headGeometry = new THREE.ConeGeometry(0.05, 0.1);
        const headMaterial = new THREE.MeshBasicMaterial({ color: color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.35; // Position at the end of the shaft
    
        arrowGroup.add(shaft);
        arrowGroup.add(head);
    
        // Orient the arrow in the specified direction
        arrowGroup.lookAt(direction.multiplyScalar(0.4));
    
        return arrowGroup;
    }

    createQubit(id, x, y) {
        // Create a group to hold all components of the Bloch sphere
        const blochSphere = new THREE.Group();
        blochSphere.position.set(x, y, 0);
        blochSphere.userData = { id, state: '0' };
    
        // Main sphere (transparent)
        const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        blochSphere.add(sphere);
    
        // Axes
        const axisLength = 0.5;
        const axisGeometry = new THREE.CylinderGeometry(0.01, 0.01, axisLength * 2);
        
        // Z-axis (vertical)
        const zAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 })
        );
        blochSphere.add(zAxis);
    
        // X-axis (horizontal)
        const xAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 })
        );
        xAxis.rotation.z = Math.PI / 2;
        blochSphere.add(xAxis);
    
        // Y-axis
        const yAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 })
        );
        yAxis.rotation.x = Math.PI / 2;
        blochSphere.add(yAxis);
    
        // Equatorial circle
        const equatorGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const equatorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
        equator.rotation.x = Math.PI / 2;
        blochSphere.add(equator);
    
        // Meridian circle
        const meridianGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const meridianMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const meridian = new THREE.Mesh(meridianGeometry, meridianMaterial);
        blochSphere.add(meridian);
        
        // Then replace the ArrowHelper creation with:
        const stateVector = this.createArrow(
            new THREE.Vector3(1, 0, 0),
            this.getStateColor('0')
        );
        blochSphere.add(stateVector);
        
    
        this.scene.add(blochSphere);
        this.qubits.set(id, blochSphere);
        return blochSphere;
    }
    
    // Modify getStateColor to represent quantum states
    getStateColor(state) {
        const colors = {
            '0': 0xffffff,    // White for |0⟩
            '1': 0xff0000,    // Red for |1⟩
            '+': 0x00ff00,    // Green for |+⟩
            '-': 0x0000ff,    // Blue for |-⟩
            'superposition': 0xff00ff  // Purple for other superpositions
        };
        return colors[state] || 0xffff00;
    }

    updateQubitState(id, newState) {
        const qubit = this.qubits.get(id);
        if (qubit) {
            const stateVector = qubit.children.find(child => child instanceof THREE.Group);
            if (stateVector) {
                // Get current and target colors
                const currentColor = stateVector.children[0].material.color;
                const targetColor = new THREE.Color(this.getStateColor(newState));
    
                // Animate color change
                gsap.to(currentColor, {
                    r: targetColor.r,
                    g: targetColor.g,
                    b: targetColor.b,
                    duration: 0.5,
                    onUpdate: () => {
                        // Update all parts of the arrow with the interpolated color
                        stateVector.children.forEach(part => {
                            part.material.color.copy(currentColor);
                        });
                    }
                });
            }
            
            qubit.userData.state = newState;
            this.animateStateVector(qubit, newState);
        }
    }
    
    animateStateVector(qubit, state) {
        const stateVector = qubit.children.find(child => child instanceof THREE.Group);
        if (!stateVector) return;
    
        // Calculate target rotation based on state
        let targetRotation = new THREE.Euler();
        switch(state) {
            case '0':
                targetRotation.set(0, 0, 0); // Point up
                break;
            case '1':
                targetRotation.set(Math.PI, 0, 0); // Point down
                break;
            case '+':
                targetRotation.set(Math.PI/2, 0, -Math.PI/2); // Point right
                break;
            case '-':
                targetRotation.set(Math.PI/2, 0, Math.PI/2); // Point left
                break;
            default:
                targetRotation.set(0, 0, 0);
        }
    
        // Animate rotation
        gsap.to(stateVector.rotation, {
            x: targetRotation.x,
            y: targetRotation.y,
            z: targetRotation.z,
            duration: 1,
            ease: "power1.inOut"
        });
    }
    
    
    
    
    updateStateVector(qubit, state) {
        const stateVector = qubit.children.find(child => child instanceof THREE.Group);
        if (!stateVector) return;
    
        // Reset rotation
        stateVector.rotation.set(0, 0, 0);
    
        let direction = new THREE.Vector3();
        switch(state) {
            case '0':
                direction.set(0, 1, 0); // Up
                break;
            case '1':
                direction.set(0, -1, 0); // Down
                break;
            case '+':
                direction.set(1, 0, 0); // Right
                break;
            case '-':
                direction.set(-1, 0, 0); // Left
                break;
            default:
                direction.set(0, 1, 0); // Default to up
        }
    
        // Normalize and scale the direction
        direction.normalize().multiplyScalar(0.4);
        
        // Make the arrow point in the new direction
        stateVector.lookAt(direction);
        
        // Rotate 90 degrees on X to correct the arrow orientation
        stateVector.rotateX(Math.PI / 2);
    }
    
    generateNewSlice() {
        // Change state of 10 random qubits
        for (let i = 0; i < 10; i++) {
            const randomId = Math.floor(Math.random() * this.qubits.size);
            const randomState = this.states[Math.floor(Math.random() * this.states.length)];
            this.updateQubitState(randomId, randomState);
        }
        
        this.saveCurrentState();
        this.currentSlice = this.timelineSlices.length - 1; // Update current to last slice
        
        const timeline = document.getElementById('timeline');
        timeline.value = this.currentSlice; // Move slider to end
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true); // Add true for recursive check
        
        const tooltip = document.getElementById('qubit-tooltip');
        
        if (intersects.length > 0) {
            // Find the parent group (Bloch sphere) of the intersected object
            let qubit = intersects[0].object;
            while (qubit.parent && !qubit.userData.id) {
                qubit = qubit.parent;
            }
    
            if (qubit.userData.state) {
                tooltip.style.display = 'block';
                tooltip.style.left = event.clientX + 10 + 'px';
                tooltip.style.top = event.clientY + 10 + 'px';
                tooltip.textContent = `Qubit ${qubit.userData.id}: State |${qubit.userData.state}⟩`;
            } else {
                tooltip.style.display = 'none';
            }
        } else {
            tooltip.style.display = 'none';
        }
    }
    

    onMouseLeave() {
        const tooltip = document.getElementById('qubit-tooltip');
        tooltip.style.display = 'none';
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