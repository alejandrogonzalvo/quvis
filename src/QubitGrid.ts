import * as THREE from 'three';
import { npzLoader } from './npzLoader.js';
import { Timeline } from './Timeline.js';
import { Qubit } from './Qubit.js';
import { State, States } from './State.js';

export class QubitGrid {
    scene: THREE.Scene
    states: string[];
    slices: Array<Map<number, Qubit>>;
    qubits: Map<number, Qubit>;
    mouse: THREE.Vector2;
    timeline: Timeline;

    constructor(scene: THREE.Scene, mouse: THREE.Vector2) {
        this.mouse = mouse;
        this.scene = scene;
        this.slices = [];
        this.qubits = new Map();
        this.timeline = new Timeline(
            (sliceIndex) => this.loadStateFromSlice(sliceIndex)
        );
        
        // Create grid
        this.createGrid(5, 5); // 5x5 grid     

        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.generateNewSlice();
            }
        });

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
                this.updateQubitState(this.qubits[qubitKey]);
            });
            
            // Save as new slice exactly like generateNewSlice
            this.saveCurrentState();
        }
    }

    xyzToState([x, y, z]) {
        const THRESHOLD = 0.9;
        if (z > THRESHOLD) return State.ZERO;
        if (z < -THRESHOLD) return State.ONE;
        if (x > THRESHOLD) return State.PLUS;
        if (x < -THRESHOLD) return State.MINUS;
        return State.SUPERPOSITION;
    }

    saveCurrentState() {
        this.slices.push(this.qubits);        
        this.timeline.addSlice();
    }

    loadStateFromSlice(sliceIndex) {
        const stateSlice = this.slices[sliceIndex];
        this.timeline.setSlice(sliceIndex);

        this.qubits = stateSlice;
        this.qubits.forEach(qubit => {
            qubit.animate();
        });
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
        const qubit = new Qubit(x, y, id);
        this.scene.add(qubit.blochSphere.blochSphere);
        this.qubits.set(id, qubit);
    }
    
    generateNewSlice() {
        this.loadStateFromSlice(this.slices.length-1);

        // Change state of 10 random qubits
        for (let i = 0; i < 10; i++) {
            const randomID: number = Math.floor(Math.random() * this.qubits.size)
            const randomQubit: Qubit = this.qubits.get(randomID);
            const randomState: State = States[Math.floor(Math.random() * States.length)];
            randomQubit.state = randomState;
        }
        
        this.saveCurrentState();
    } 
}