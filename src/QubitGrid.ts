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
    coupling_map?: number[][];
}

export class QubitGrid {
    scene: THREE.Scene;
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap!: Heatmap;
    maxSlicesForHeatmap: number;
    private couplingMap: number[][] | null = null;
    private connectionLines: THREE.Group;
    private qubitPositions: Map<number, THREE.Vector2> = new Map();
    private lineMaterial: THREE.ShaderMaterial; // For colored lines
    private lastCalculatedSlicesChangeIDs: Array<Set<number>> = []; // Store for drawConnections

    private _current_slice: Slice;
    private _qubit_count: number;
    // grid_rows and grid_cols might become less relevant for positioning with force-directed layout
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
        this.connectionLines = new THREE.Group();
        this.scene.add(this.connectionLines);

        this.lineMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float vertexIntensity;
                varying float vIntensity;
                void main() {
                    vIntensity = vertexIntensity;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float vIntensity;
                out vec4 out_FragColor; // Declare output variable for GLSL 3
                void main() {
                    vec3 colorValue;
                    if (vIntensity <= 0.5) {
                        // Green (0,1,0) to Yellow (1,1,0)
                        colorValue = vec3(vIntensity * 2.0, 1.0, 0.0);
                    } else {
                        // Yellow (1,1,0) to Red (1,0,0)
                        colorValue = vec3(1.0, 1.0 - (vIntensity - 0.5) * 2.0, 0.0);
                    }
                    out_FragColor = vec4(colorValue, 1.0); // Use the declared output variable
                }
            `,
            uniforms: {},
            glslVersion: THREE.GLSL3, // Specify GLSL version if needed, or remove if default is fine
        });

        this.heatmap = new Heatmap(camera, 1, this.maxSlicesForHeatmap);
        this.scene.add(this.heatmap.mesh);

        this.loadSlicesFromJSON("/quvis/qft_viz_data.json", camera);
    }

    private calculateQubitPositions(
        numQubits: number,
        couplingMap: number[][] | null,
        areaWidth: number,
        areaHeight: number,
    ): void {
        this.qubitPositions.clear();
        if (numQubits === 0) return;

        // Fallback to grid if no coupling map or for very simple cases
        if (!couplingMap || numQubits <= 1) {
            const cols = Math.ceil(Math.sqrt(numQubits));
            const rows = Math.ceil(numQubits / cols);
            const spacing = 2; // Keep existing spacing logic for fallback
            const offsetX = ((cols - 1) * spacing) / 2;
            const offsetY = ((rows - 1) * spacing) / 2;
            let count = 0;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (count < numQubits) {
                        this.qubitPositions.set(
                            count,
                            new THREE.Vector2(
                                j * spacing - offsetX,
                                i * spacing - offsetY,
                            ),
                        );
                        count++;
                    }
                }
            }
            return;
        }

        // Simplified Force-Directed Layout
        const kRepel = 0.1; // Repulsion strength
        const kAttract = 0.05; // Attraction strength (spring constant)
        const idealDist = 2.5; // Ideal distance between connected qubits
        const iterations = 100;
        let temperature = areaWidth / 10; // Initial temperature for cooling
        const coolingFactor = 0.95;

        // Initialize positions (e.g., randomly or in a circle)
        for (let i = 0; i < numQubits; i++) {
            this.qubitPositions.set(
                i,
                new THREE.Vector2(
                    (Math.random() - 0.5) * areaWidth * 0.1,
                    (Math.random() - 0.5) * areaHeight * 0.1,
                ),
            );
        }

        for (let iter = 0; iter < iterations; iter++) {
            const forces = new Map<number, THREE.Vector2>();
            for (let i = 0; i < numQubits; i++) {
                forces.set(i, new THREE.Vector2(0, 0));
            }

            // Calculate repulsive forces
            for (let i = 0; i < numQubits; i++) {
                for (let j = i + 1; j < numQubits; j++) {
                    const posI = this.qubitPositions.get(i)!;
                    const posJ = this.qubitPositions.get(j)!;
                    const delta = new THREE.Vector2().subVectors(posI, posJ);
                    const dist = delta.length() || 1e-6; // Avoid division by zero
                    const forceMag = (kRepel * kRepel) / dist;
                    const force = delta.normalize().multiplyScalar(forceMag);
                    forces.get(i)!.add(force);
                    forces.get(j)!.sub(force);
                }
            }

            // Calculate attractive forces
            couplingMap.forEach((pair) => {
                if (pair.length === 2) {
                    const u = pair[0];
                    const v = pair[1];
                    const posU = this.qubitPositions.get(u)!;
                    const posV = this.qubitPositions.get(v)!;
                    if (posU && posV) {
                        const delta = new THREE.Vector2().subVectors(
                            posV,
                            posU,
                        );
                        const dist = delta.length() || 1e-6;
                        const forceMag = ((dist * dist) / idealDist) * kAttract; // Spring force variant
                        // const forceMag = kAttract * (dist - idealDist); // Simpler spring
                        const force = delta
                            .normalize()
                            .multiplyScalar(forceMag);
                        forces.get(u)!.add(force);
                        forces.get(v)!.sub(force);
                    }
                }
            });

            // Apply forces and cool down
            for (let i = 0; i < numQubits; i++) {
                const pos = this.qubitPositions.get(i)!;
                const force = forces.get(i)!;
                const displacement = force
                    .normalize()
                    .multiplyScalar(Math.min(force.length(), temperature));
                pos.add(displacement);
            }
            temperature *= coolingFactor;
        }

        // Center and scale positions
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        this.qubitPositions.forEach((pos) => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        });

        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        const scale =
            Math.min(
                areaWidth / (currentWidth || 1),
                areaHeight / (currentHeight || 1),
            ) * 0.8;

        this.qubitPositions.forEach((pos) => {
            pos.x = (pos.x - (minX + currentWidth / 2)) * scale;
            pos.y = (pos.y - (minY + currentHeight / 2)) * scale;
        });
    }

    private handleLoadError(
        error: Error,
        camera: THREE.PerspectiveCamera,
        message: string = "Error loading data",
    ) {
        console.error(message, error);
        this._qubit_count = 9; // Default to a 3x3 grid for error case
        this._grid_rows = 3;
        this._grid_cols = 3;
        this.couplingMap = null; // No coupling map on error

        if (this.heatmap && this.heatmap.mesh)
            this.scene.remove(this.heatmap.mesh);
        this.heatmap = new Heatmap(
            camera,
            this._qubit_count,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);

        this.calculateQubitPositions(
            this._qubit_count,
            this.couplingMap,
            10,
            10,
        ); // Use default area
        this.createGrid(); // Calls createQubit which uses this.qubitPositions
        this.slices = [this._current_slice.clone()];
        this.timeline.setSliceCount(this.slices.length > 0 ? 1 : 0);
        if (this.slices.length > 0) this.loadStateFromSlice(0);
        this.drawConnections();
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
            this.couplingMap = jsonData.coupling_map || null;

            // Determine layout area (can be adjusted)
            const layoutAreaWidth = Math.max(
                5,
                Math.sqrt(this._qubit_count) * 2,
            );
            const layoutAreaHeight = layoutAreaWidth;

            this.calculateQubitPositions(
                this._qubit_count,
                this.couplingMap,
                layoutAreaWidth,
                layoutAreaHeight,
            );

            if (this.heatmap && this.heatmap.mesh)
                this.scene.remove(this.heatmap.mesh);
            this.heatmap = new Heatmap(
                camera,
                this._qubit_count,
                this.maxSlicesForHeatmap,
            );
            this.scene.add(this.heatmap.mesh);

            // Clear old qubits from scene and current_slice
            this._current_slice.qubits.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    this.scene.remove(qubit.blochSphere.blochSphere);
                }
            });
            this._current_slice = new Slice(); // Reset current slice to be populated by createGrid

            this.createGrid(); // This will now use this.qubitPositions
            this.drawConnections();

            const loadedSlices: Slice[] = [];
            // Base qubits for cloning state and initial visual setup are now from the freshly created grid
            const baseQubits = new Map<number, Qubit>();
            this._current_slice.qubits.forEach((qubit, id) => {
                // The BlochSphere objects are already created and positioned by createQubit
                baseQubits.set(
                    id,
                    new Qubit(id, qubit.state, qubit.blochSphere!),
                );
            });

            const allSlicesOps = jsonData.operations_per_slice;

            // Create subsequent slices based on the initial layout and states
            allSlicesOps.forEach((sliceOps, timeStep) => {
                const newSlice = new Slice(timeStep);
                for (let i = 0; i < this._qubit_count; i++) {
                    const baseQubit = baseQubits.get(i)!; // Should exist
                    // Create a new BlochSphere for each slice, positioned like the base one
                    const newBlochSphere = new BlochSphere(
                        baseQubit.blochSphere.blochSphere.position.x,
                        baseQubit.blochSphere.blochSphere.position.y,
                    );
                    this.scene.add(newBlochSphere.blochSphere);
                    newBlochSphere.blochSphere.visible = false; // Initially hide
                    newSlice.qubits.set(
                        i,
                        new Qubit(i, baseQubit.state, newBlochSphere),
                    );
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

            // Remove the initial Bloch spheres from the scene that were part of the _current_slice template
            // as loadedSlices now contain their own managed Bloch spheres.
            this._current_slice.qubits.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    this.scene.remove(qubit.blochSphere.blochSphere);
                }
            });

            this.slices = loadedSlices;

            if (this.slices.length > 0) {
                this.timeline.setSliceCount(this.slices.length);
                this.loadStateFromSlice(0);
            } else {
                // If no operations/slices, ensure the initial grid (current_slice) is shown
                this._current_slice.qubits.forEach((q) => {
                    if (q.blochSphere && q.blochSphere.blochSphere)
                        q.blochSphere.blochSphere.visible = true;
                });
                this.timeline.setSliceCount(1); // At least one slice (the initial state)
                this.current_slice = this._current_slice; // Ensure it's set
                this.onCurrentSliceChange();
                console.warn(
                    "[QubitGrid] No operational slices were loaded from JSON, showing initial state.",
                );
            }
        } catch (error) {
            this.handleLoadError(
                error as Error,
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
        // Make only the Bloch spheres of the current slice visible
        this.slices.forEach((slice) => {
            const isCurrent = slice === this._current_slice;
            slice.qubits.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    qubit.blochSphere.blochSphere.visible = isCurrent;
                    if (isCurrent) {
                        qubit.animate();
                    }
                }
            });
        });

        // Update heatmap based on the current and previous slices
        const sliceschangeIDs = new Array<Set<number>>();
        if (this._current_slice.interacting_qubits) {
            sliceschangeIDs.push(this._current_slice.interacting_qubits);
        }

        const currentIndexInSlicesArray = this.slices.indexOf(
            this._current_slice,
        );
        const historicalStartIndexInSlicesArray = currentIndexInSlicesArray - 1;

        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndexInSlicesArray + 1,
            currentIndexInSlicesArray, // Ensure we don't go before the first slice
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
        if (
            this.heatmap &&
            this._current_slice.qubits &&
            this._current_slice.qubits.size > 0
        ) {
            this.heatmap.updatePoints(
                this._current_slice.qubits, // Pass the qubits of the *currently visible* slice
                sliceschangeIDs,
            );
        } else {
            console.warn(
                "[QubitGrid] Heatmap or current_slice.qubits not initialized/empty when trying to update points.",
            );
        }
        // Ensure connections are drawn based on the current qubit positions (which are static after layout)
        this.drawConnections();
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
        } else if (this.slices.length > 0 && this.slices[0]) {
            // Check if slices[0] exists
            console.warn(
                `[QubitGrid] Slice index ${sliceIndex} out of bounds, loading first slice`,
            );
            this.current_slice = this.slices[0];
        } else {
            console.warn(
                "[QubitGrid] No slices available to load or slices[0] is undefined.",
            );
            // If no slices, ensure current_slice is at least an empty slice or a default state.
            // The createGrid and subsequent logic should handle populating a displayable state.
            if (!this._current_slice) this._current_slice = new Slice();
            this.onCurrentSliceChange();
        }
    }

    createGrid() {
        // Removed rows and cols parameters as layout is now dynamic
        // Clear existing qubits from the scene and current_slice before creating new ones
        this._current_slice.qubits.forEach((existingQubit) => {
            if (
                existingQubit.blochSphere &&
                existingQubit.blochSphere.blochSphere
            ) {
                this.scene.remove(existingQubit.blochSphere.blochSphere);
            }
        });
        this._current_slice.qubits.clear();
        this.clearConnections();

        for (let i = 0; i < this._qubit_count; i++) {
            const pos = this.qubitPositions.get(i) || new THREE.Vector2(0, 0); // Fallback to origin
            this.createQubit(i, pos.x, pos.y);
        }

        // Ensure all qubits in the (new) _current_slice are visible by default after creation
        this._current_slice.qubits.forEach((q) => {
            if (q.blochSphere && q.blochSphere.blochSphere) {
                q.blochSphere.blochSphere.visible = true;
            }
        });
    }

    createQubit(id: number, x: number, y: number) {
        const qubit = new Qubit(id, State.ZERO, new BlochSphere(x, y));
        this.scene.add(qubit.blochSphere.blochSphere);
        this._current_slice.qubits.set(id, qubit); // Add to the current_slice being built
    }

    clearConnections() {
        while (this.connectionLines.children.length > 0) {
            const line = this.connectionLines.children[0] as THREE.Line;
            line.geometry.dispose(); // Dispose geometry
            if (line.material instanceof THREE.ShaderMaterial) {
                line.material.dispose(); // Dispose material
            }
            this.connectionLines.remove(line);
        }
    }

    private getQubitInteractionIntensity(
        qubitId: number,
        slicesChangeData: Array<Set<number>>,
    ): number {
        let interactionCount = 0;
        const slicesToConsider = slicesChangeData.slice(
            0,
            this.maxSlicesForHeatmap,
        );
        slicesToConsider.forEach((sliceInteractionSet) => {
            if (sliceInteractionSet.has(qubitId)) {
                interactionCount++;
            }
        });
        if (slicesToConsider.length === 0) return 0;
        return interactionCount / slicesToConsider.length;
    }

    drawConnections() {
        this.clearConnections();

        if (
            !this.couplingMap ||
            !this._current_slice ||
            this._current_slice.qubits.size === 0
        ) {
            // If no coupling map, or no qubits in the current slice, don't draw connections.
            // Qubits might not be populated in _current_slice if this is called too early.
            // It's better to rely on the positions stored in this.qubitPositions and iterate up to this._qubit_count
            return;
        }

        const currentSlicesChangeData = this.lastCalculatedSlicesChangeIDs;

        this.couplingMap.forEach((pair) => {
            if (pair.length === 2) {
                const qubitIdA = pair[0];
                const qubitIdB = pair[1];

                // Get positions from the pre-calculated layout
                const posA = this.qubitPositions.get(qubitIdA);
                const posB = this.qubitPositions.get(qubitIdB);

                if (posA && posB) {
                    const intensityA = this.getQubitInteractionIntensity(
                        qubitIdA,
                        currentSlicesChangeData,
                    );
                    const intensityB = this.getQubitInteractionIntensity(
                        qubitIdB,
                        currentSlicesChangeData,
                    );

                    const points = [
                        new THREE.Vector3(posA.x, posA.y, 0),
                        new THREE.Vector3(posB.x, posB.y, 0),
                    ];
                    const geometry = new THREE.BufferGeometry().setFromPoints(
                        points,
                    );

                    // For gradient line, we need intensity at each vertex
                    const intensities = new Float32Array([
                        intensityA,
                        intensityB,
                    ]);
                    geometry.setAttribute(
                        "vertexIntensity",
                        new THREE.BufferAttribute(intensities, 1),
                    );

                    const line = new THREE.Line(geometry, this.lineMaterial);
                    this.connectionLines.add(line);
                } else {
                    console.warn(
                        `[QubitGrid] Could not find positions for connection: ${qubitIdA} - ${qubitIdB}`,
                    );
                }
            }
        });
    }
}
