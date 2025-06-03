import * as THREE from "three";
import { Timeline } from "./Timeline.js";
import { Qubit } from "./Qubit.js";
import { State } from "./State.js";
import { Heatmap } from "./Heatmap.js";
import { Slice } from "./Slice.js";
import { BlochSphere } from "./BlochSphere.js";

interface QubitOperation {
    name: string;
    qubits: number[];
}

interface VizData {
    num_qubits: number;
    operations_per_slice: QubitOperation[][];
}

export class QubitGrid {
    scene: THREE.Scene;
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap!: Heatmap;
    maxSlicesForHeatmap: number;

    private _current_slice: Slice;
    private _qubit_count: number;
    private _grid_rows: number;
    private _grid_cols: number;

    get current_slice(): Slice {
        return this._current_slice;
    }

    set current_slice(value: Slice) {
        this._current_slice = value;
        if (this._current_slice && this._current_slice.qubits.size > 0) {
            this.onCurrentSliceChange();
        }
    }

    constructor(
        scene: THREE.Scene,
        mouse: THREE.Vector2,
        camera: THREE.PerspectiveCamera,
        initialMaxSlicesForHeatmap: number = 10,
    ) {
        this.mouse = mouse;
        this.scene = scene;
        this.slices = [];
        this.maxSlicesForHeatmap = initialMaxSlicesForHeatmap;
        this._qubit_count = 0;
        this._grid_rows = 0;
        this._grid_cols = 0;
        this._current_slice = new Slice();
        this.timeline = new Timeline((sliceIndex) =>
            this.loadStateFromSlice(sliceIndex),
        );

        this.heatmap = new Heatmap(camera, 1, this.maxSlicesForHeatmap);
        this.scene.add(this.heatmap.mesh);

        this.loadSlicesFromJSON("/quvis/qft_viz_data.json", camera);
    }

    private handleLoadError(
        error: Error,
        camera: THREE.PerspectiveCamera,
        message: string = "Error loading data",
    ) {
        console.error(message, error);
        this._qubit_count = 9;
        this._grid_rows = 3;
        this._grid_cols = 3;
        if (this.heatmap && this.heatmap.mesh)
            this.scene.remove(this.heatmap.mesh);
        this.heatmap = new Heatmap(
            camera,
            this._qubit_count,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);

        this.createGrid(this._grid_rows, this._grid_cols);
        this.slices = [this._current_slice.clone()];
        this.timeline.setSliceCount(this.slices.length > 0 ? 1 : 0);
        if (this.slices.length > 0) this.loadStateFromSlice(0);
    }

    async loadSlicesFromJSON(url: string, camera: THREE.PerspectiveCamera) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(
                    `HTTP error! status: ${response.status} while fetching ${url}`,
                );
            }
            const jsonData = (await response.json()) as VizData;
            console.log("[QubitGrid] JSON data loaded:", jsonData);

            if (
                !jsonData ||
                typeof jsonData.num_qubits === "undefined" ||
                !jsonData.operations_per_slice
            ) {
                this.handleLoadError(
                    new Error(
                        "Invalid JSON data structure: jsonData is missing expected properties.",
                    ),
                    camera,
                    "Invalid JSON data structure",
                );
                return;
            }

            this._qubit_count = Number(jsonData.num_qubits);

            this._grid_rows = Math.ceil(Math.sqrt(this._qubit_count));
            this._grid_cols = Math.ceil(this._qubit_count / this._grid_rows);

            if (this.heatmap && this.heatmap.mesh)
                this.scene.remove(this.heatmap.mesh);
            this.heatmap = new Heatmap(
                camera,
                this._qubit_count,
                this.maxSlicesForHeatmap,
            );
            this.scene.add(this.heatmap.mesh);

            this._current_slice.qubits.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    this.scene.remove(qubit.blochSphere.blochSphere);
                }
            });
            this._current_slice = new Slice();

            this.createGrid(this._grid_rows, this._grid_cols);

            const loadedSlices: Slice[] = [];
            const baseQubits = new Map<number, Qubit>();
            this._current_slice.qubits.forEach((qubit, id) => {
                const bloch = qubit.blochSphere
                    ? qubit.blochSphere
                    : new BlochSphere(0, 0);
                baseQubits.set(id, new Qubit(id, qubit.state, bloch));
            });

            const allSlicesOps = jsonData.operations_per_slice;

            allSlicesOps.forEach((sliceOps, timeStep) => {
                const newSlice = new Slice(timeStep);

                for (let i = 0; i < this._qubit_count; i++) {
                    const baseQubit = baseQubits.get(i);
                    if (baseQubit && baseQubit.blochSphere) {
                        const newQubitBlochSphere = new BlochSphere(
                            baseQubit.blochSphere.blochSphere.position.x,
                            baseQubit.blochSphere.blochSphere.position.y,
                        );
                        this.scene.add(newQubitBlochSphere.blochSphere);
                        const newQubitObject = new Qubit(
                            i,
                            baseQubit.state,
                            newQubitBlochSphere,
                        );
                        newSlice.qubits.set(i, newQubitObject);
                    } else {
                        console.warn(
                            `[QubitGrid] Base qubit or Bloch sphere missing for qubit ${i}. Creating new at origin.`,
                        );
                        const tempBloch = new BlochSphere(0, 0);
                        this.scene.add(tempBloch.blochSphere);
                        newSlice.qubits.set(
                            i,
                            new Qubit(i, State.ZERO, tempBloch),
                        );
                    }
                }

                const interactingQubitsThisSlice = new Set<number>();
                sliceOps.forEach((op) => {
                    op.qubits.forEach((qIndex) => {
                        interactingQubitsThisSlice.add(qIndex);
                    });
                });
                newSlice.interacting_qubits = interactingQubitsThisSlice;
                loadedSlices.push(newSlice);
            });

            this.slices.forEach((slice) => {
                slice.qubits.forEach((qubit) => {
                    if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                        this.scene.remove(qubit.blochSphere.blochSphere);
                    }
                });
            });

            this.slices = loadedSlices;

            if (this.slices.length > 0) {
                this.timeline.setSliceCount(this.slices.length);
                this.loadStateFromSlice(0);
            } else {
                this.timeline.setSliceCount(0);
                this.onCurrentSliceChange();
                console.warn("[QubitGrid] No slices were loaded from JSON.");
            }
        } catch (error) {
            this.handleLoadError(
                error,
                camera,
                "Failed to load or parse JSON file",
            );
        }
    }

    public onCurrentSliceChange() {
        if (!this._current_slice) {
            console.warn(
                "[QubitGrid] onCurrentSliceChange called but _current_slice is null/undefined.",
            );
            return;
        }
        this.slices.forEach((slice, index) => {
            slice.qubits.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    qubit.blochSphere.blochSphere.visible =
                        index === this.slices.indexOf(this._current_slice);
                    if (qubit.blochSphere.blochSphere.visible) {
                        qubit.animate();
                    }
                }
            });
        });

        const sliceschangeIDs = new Array<Set<number>>();
        if (this._current_slice.interacting_qubits) {
            sliceschangeIDs.push(this._current_slice.interacting_qubits);
        }

        const historicalStartIndexInSlicesArray =
            this.slices.indexOf(this._current_slice) - 1;

        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndexInSlicesArray + 1,
        );

        for (let i = 0; i < numAdditionalSlicesToConsider; i++) {
            const targetHistoricalIndex = historicalStartIndexInSlicesArray - i;
            if (
                targetHistoricalIndex >= 0 &&
                this.slices[targetHistoricalIndex] &&
                this.slices[targetHistoricalIndex].interacting_qubits
            ) {
                sliceschangeIDs.push(
                    this.slices[targetHistoricalIndex].interacting_qubits,
                );
            } else {
                break;
            }
        }
        if (this.heatmap && this._current_slice.qubits) {
            this.heatmap.updatePoints(
                this._current_slice.qubits,
                sliceschangeIDs,
            );
        } else {
            console.warn(
                "[QubitGrid] Heatmap or current_slice.qubits not initialized when trying to update points.",
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    xyzToState([x, _y, z]: [number, number, number]) {
        const THRESHOLD = 0.9;
        if (z > THRESHOLD) return State.ZERO;
        if (z < -THRESHOLD) return State.ONE;
        if (x > THRESHOLD) return State.PLUS;
        if (x < -THRESHOLD) return State.MINUS;
        return State.SUPERPOSITION;
    }

    saveCurrentState(): void {
        console.warn(
            "[QubitGrid] saveCurrentState called. This is unexpected when driven by JSON.",
        );
    }

    loadStateFromSlice(sliceIndex: number): void {
        if (sliceIndex >= 0 && sliceIndex < this.slices.length) {
            this.current_slice = this.slices[sliceIndex];
        } else if (this.slices.length > 0) {
            console.warn(
                `[QubitGrid] Slice index ${sliceIndex} out of bounds, loading first slice`,
            );
            this.current_slice = this.slices[0];
        } else {
            console.warn("[QubitGrid] No slices available to load.");
            if (this._current_slice) {
                this._current_slice.qubits.forEach((q) => {
                    if (q.blochSphere && q.blochSphere.blochSphere)
                        q.blochSphere.blochSphere.visible = true;
                });
                this.onCurrentSliceChange();
            }
        }
    }

    createGrid(rows: number, cols: number) {
        this._current_slice.qubits.forEach((existingQubit) => {
            if (
                existingQubit.blochSphere &&
                existingQubit.blochSphere.blochSphere
            ) {
                this.scene.remove(existingQubit.blochSphere.blochSphere);
            }
        });
        this._current_slice.qubits.clear();

        const spacing = 2;
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetY = ((rows - 1) * spacing) / 2;

        let createdQubitCount = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (createdQubitCount >= this._qubit_count) break;

                const x = j * spacing - offsetX;
                const y = i * spacing - offsetY;
                this.createQubit(createdQubitCount, x, y);
                createdQubitCount++;
            }
            if (createdQubitCount >= this._qubit_count) break;
        }
        this._current_slice.qubits.forEach((q) => {
            if (q.blochSphere && q.blochSphere.blochSphere) {
                q.blochSphere.blochSphere.visible = true;
            }
        });
    }

    createQubit(id: number, x: number, y: number) {
        const qubit = new Qubit(id, State.ZERO, new BlochSphere(x, y));
        this.scene.add(qubit.blochSphere.blochSphere);
        this._current_slice.qubits.set(id, qubit);
    }
}
