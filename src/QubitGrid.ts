import * as THREE from "three";
import { Timeline } from "./Timeline.js";
import { Qubit } from "./Qubit.js";
import { State, States } from "./State.js";
import { Heatmap } from "./Heatmap.js";
import { Slice } from "./Slice.js";
import { BlochSphere } from "./BlochSphere.js";
import * as NoiseModule from "noisejs";

export class QubitGrid {
    scene: THREE.Scene;
    states: string[];
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap: Heatmap;
    maxSlicesForHeatmap: number;

    private _current_slice: Slice;
    private _noise: InstanceType<typeof NoiseModule.Noise>;
    private _qubit_number_per_side: number;

    get current_slice(): Slice {
        return this._current_slice;
    }

    set current_slice(value: Slice) {
        this._current_slice = value;
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
        this._qubit_number_per_side = qubit_number;
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

        this._noise = new NoiseModule.Noise(Math.random());
    }

    public onCurrentSliceChange(currentSliceTimeStep: number) {
        this._current_slice.qubits.forEach((qubit) => {
            qubit.animate();
        });

        const sliceschangeIDs = new Array<Set<number>>();

        sliceschangeIDs.push(this._current_slice.interacting_qubits);

        let historicalStartIndexInSlicesArray = -1;

        if (this.slices[currentSliceTimeStep] === this._current_slice) {
            historicalStartIndexInSlicesArray = currentSliceTimeStep - 1;
        } else {
            historicalStartIndexInSlicesArray = this.slices.length - 1;
        }

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
                break;
            }
        }

        this.heatmap.updatePoints(this._current_slice.qubits, sliceschangeIDs);
    }

    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    xyzToState([x, _y, z]) {
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
        const sourceSlice =
            this.slices.length > 0
                ? this.slices[this.slices.length - 1]
                : this._current_slice;

        const newSlice = sourceSlice.clone();

        const timeDimension = this.slices.length * 0.1;

        for (
            let qubitID = 0;
            qubitID < this._qubit_number_per_side * this._qubit_number_per_side;
            qubitID++
        ) {
            const xCoord = (qubitID % this._qubit_number_per_side) * 0.3;
            const yCoord =
                Math.floor(qubitID / this._qubit_number_per_side) * 0.3;

            if (this._noise) {
                const noiseValue = this._noise.perlin3(
                    xCoord,
                    yCoord,
                    timeDimension,
                );

                if (noiseValue > 0) {
                    newSlice.interacting_qubits.add(qubitID);
                    const qubit = newSlice.qubits.get(qubitID)!;
                    qubit.state =
                        States[Math.floor(Math.random() * States.length)];
                }
            }
        }

        this.current_slice = newSlice;
        this.saveCurrentState();
    }
}
