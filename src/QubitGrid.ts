import * as THREE from "three";
import { Timeline } from "./Timeline.js";
import { Qubit } from "./Qubit.js";
import { State, States } from "./State.js";
import { Heatmap } from "./Heatmap.js";
import { Slice } from "./Slice.js";
import { BlochSphere } from "./BlochSphere.js";

export class QubitGrid {
    scene: THREE.Scene;
    states: string[];
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap: Heatmap;
    maxSlicesForHeatmap: number;

    private _current_slice: Slice;

    get current_slice(): Slice {
        return this._current_slice;
    }

    set current_slice(value: Slice) {
        this._current_slice = value;
        console.log(value);
        if (this._current_slice && this._current_slice.qubits.size > 0) {
            this.onCurrentSliceChange(value.timeStep);
        }
    }

    constructor(
        scene: THREE.Scene,
        mouse: THREE.Vector2,
        camera: THREE.PerspectiveCamera,
        qubit_number: number,
        initialMaxSlicesForHeatmap: number = 10,
    ) {
        this.mouse = mouse;
        this.scene = scene;
        this.slices = [];
        this.maxSlicesForHeatmap = initialMaxSlicesForHeatmap;
        this.heatmap = new Heatmap(
            camera,
            qubit_number * qubit_number,
            this.maxSlicesForHeatmap,
        );
        this._current_slice = new Slice();
        this.timeline = new Timeline((sliceIndex) =>
            this.loadStateFromSlice(sliceIndex),
        );
        scene.add(this.heatmap.mesh);

        this.createGrid(qubit_number, qubit_number);

        window.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                this.generateNewSlice();
            }
        });

        this.saveCurrentState();

        this.loadStateFromSlice(0);
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

    private onCurrentSliceChange(currentSliceTimeStep: number) {
        this._current_slice.qubits.forEach((qubit) => {
            qubit.animate();
        });

        console.log(
            `Updating heatmap for slice with timeStep: ${currentSliceTimeStep}`,
        );
        const sliceschangeIDs = new Array<Set<number>>();

        // Always include the _current_slice's interactions as the most recent
        sliceschangeIDs.push(this._current_slice.interacting_qubits);

        // Determine the starting point for historical slices in the this.slices array
        let historicalStartIndexInSlicesArray = -1;

        // Check if the _current_slice corresponds to an existing slice in the array by its timeStep
        if (this.slices[currentSliceTimeStep] === this._current_slice) {
            // _current_slice is an existing, saved slice. History is from one before it.
            historicalStartIndexInSlicesArray = currentSliceTimeStep - 1;
        } else {
            // _current_slice is a new slice not yet in this.slices (e.g. during generateNewSlice before save).
            // Take history from the end of the current this.slices array.
            historicalStartIndexInSlicesArray = this.slices.length - 1;
        }

        // We need (this.maxSlicesForHeatmap - 1) additional slices for history
        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndexInSlicesArray + 1,
        );

        for (let i = 0; i < numAdditionalSlicesToConsider; i++) {
            const targetHistoricalIndex = historicalStartIndexInSlicesArray - i;
            if (
                targetHistoricalIndex >= 0 &&
                this.slices[targetHistoricalIndex]
            ) {
                sliceschangeIDs.push(
                    this.slices[targetHistoricalIndex].interacting_qubits,
                );
            } else {
                break; // Stop if we run out of valid historical slices or go out of bounds
            }
        }

        this.heatmap.updatePoints(this._current_slice.qubits, sliceschangeIDs);
    }

    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    xyzToState([x, y, z]) {
        const THRESHOLD = 0.9;
        if (z > THRESHOLD) return State.ZERO;
        if (z < -THRESHOLD) return State.ONE;
        if (x > THRESHOLD) return State.PLUS;
        if (x < -THRESHOLD) return State.MINUS;
        return State.SUPERPOSITION;
    }

    saveCurrentState(): void {
        this.slices.push(this.current_slice);
        this.timeline.addSlice();
    }

    loadStateFromSlice(sliceIndex: number): void {
        this.current_slice = this.slices[sliceIndex];
    }

    createGrid(rows, cols) {
        const spacing = 2;
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetY = ((rows - 1) * spacing) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
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
        // Determine the source slice for cloning
        const sourceSlice =
            this.slices.length > 0
                ? this.slices[this.slices.length - 1]
                : this._current_slice;

        // Clone the source slice. The new cloned slice is not yet _current_slice.
        const newSlice = sourceSlice.clone();

        // Modify the newSlice (it's not yet this._current_slice)
        const currentIDs = Array.from(newSlice.qubits.keys());
        for (let i = 0; i < 100; i++) {
            const randomID =
                currentIDs[Math.floor(Math.random() * currentIDs.length)];
            newSlice.interacting_qubits.add(randomID);
            const randomQubit = newSlice.qubits.get(randomID)!;
            randomQubit.state =
                States[Math.floor(Math.random() * States.length)];
        }

        // Now that newSlice is fully prepared with interactions, set it as current and save.
        // This will trigger onCurrentSliceChange once with the populated newSlice.
        this.current_slice = newSlice;
        this.saveCurrentState();
    }
}
