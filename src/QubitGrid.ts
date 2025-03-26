import * as THREE from 'three';
import { npzLoader } from './npzLoader.js';
import { Timeline } from './Timeline.js';
import { Qubit } from './Qubit.js';
import { State, States } from './State.js';
import { Heatmap } from './Heatmap.js';
import { Slice } from './Slice.js';
import { BlochSphere } from './BlochSphere.js';

export class QubitGrid {
    scene: THREE.Scene
    states: string[];
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap: Heatmap;

    private _current_slice: Slice;

    get current_slice(): Slice {
        return this._current_slice;
    }

    set current_slice(value: Slice) {
        this._current_slice = value;
        this.onCurrentSliceChange();
    }

    constructor(scene: THREE.Scene, mouse: THREE.Vector2, camera: THREE.PerspectiveCamera, qubit_number: number) {
        this.mouse = mouse;
        this.scene = scene;
        this.slices = [];
        this.heatmap = new Heatmap(camera, qubit_number*qubit_number);
        this.current_slice = new Slice();
        this.timeline = new Timeline(
            (sliceIndex) => this.loadStateFromSlice(sliceIndex)
        );
        scene.add(this.heatmap.mesh);
        
        this.createGrid(qubit_number, qubit_number);   

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

    // async loadNPZData(url) {
    //     const loader = new npzLoader();
    //     const data = await loader.load(url);
        
    //     // Process each time step exactly like Spacebar generates new slices
    //     const numSteps = Object.values(data)[0].length;
        
    //     for (let step = 0; step < numSteps; step++) {
    //         // Update all qubits for this step
    //         Object.entries(data).forEach(([qubitKey, steps]) => {
    //             const qubitId = parseInt(qubitKey);
    //             const [x, y, z] = steps[step];
    //             const state = this.xyzToState([x, y, z]);
    //             this.updateQubitState(this.qubits[qubitKey]);
    //         });
            
    //         // Save as new slice exactly like generateNewSlice
    //         this.saveCurrentState();
    //     }
    // }

    private onCurrentSliceChange() {
        this.current_slice.qubits.forEach((qubit, id) => {
            qubit.animate();
        });

        this.heatmap.updatePoints(this.current_slice.qubits, this.current_slice.interacting_qubits);
    }
    xyzToState([x, y, z]) {
        const THRESHOLD = 0.9;
        if (z > THRESHOLD) return State.ZERO;
        if (z < -THRESHOLD) return State.ONE;
        if (x > THRESHOLD) return State.PLUS;
        if (x < -THRESHOLD) return State.MINUS;
        return State.SUPERPOSITION;
    }

    saveCurrentState() : void {
        this.slices.push(this.current_slice);
        this.timeline.addSlice();
    }

    loadStateFromSlice(sliceIndex: number) : void {
        this.current_slice =  this.slices[sliceIndex];
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
        const qubit = new Qubit(id, State.ZERO, new BlochSphere(x, y));
        this.scene.add(qubit.blochSphere.blochSphere);
        this.current_slice.qubits.set(id, qubit);
    }
    
    generateNewSlice() {
        // Load previous state into CURRENT qubits
        this.loadStateFromSlice(this.slices.length - 1);
        
        this.current_slice = this.current_slice.clone()
        // Modify current qubits
        const currentIDs = Array.from(this.current_slice.qubits.keys());
        for (let i = 0; i < 50; i++) {
            const randomID = currentIDs[Math.floor(Math.random() * currentIDs.length)];
            this.current_slice.interacting_qubits.add(randomID);
            const randomQubit = this.current_slice.qubits.get(randomID)!;
            randomQubit.state = States[Math.floor(Math.random() * States.length)];
        }
        
        this.saveCurrentState();
        this.heatmap.updatePoints(this.current_slice.qubits, this.current_slice.interacting_qubits);
    }
}