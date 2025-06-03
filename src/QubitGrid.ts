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

    // New/modified members for persistent Qubit objects
    private qubitInstances: Map<number, Qubit> = new Map();
    private current_slice_index: number = 0; // Index for the 'slices' array

    // _current_slice might be deprecated or change role.
    // For now, let's try to remove direct usage of _current_slice.qubits
    // private _current_slice: Slice; // This was the heavy Slice, to be re-evaluated

    private _qubit_count: number;
    // grid_rows and grid_cols might become less relevant for positioning with force-directed layout
    private _grid_rows: number;
    private _grid_cols: number;

    // For optimized connection lines
    private connectionLineSegments: THREE.LineSegments | null = null;
    private connectionLineGeometry: THREE.BufferGeometry | null = null;
    private maxConnections: number = 0; // To track buffer sizes

    // Getter for current slice data (lightweight)
    get current_slice_data(): Slice | null {
        if (
            this.slices &&
            this.current_slice_index >= 0 &&
            this.current_slice_index < this.slices.length
        ) {
            return this.slices[this.current_slice_index];
        }
        return null;
    }

    // The public getter 'current_slice' might need to be removed or re-defined
    // if it was exposing the old Slice with Qubit objects.
    // For now, let's comment it out.
    /*
    get current_slice(): Slice { // This was the old Slice
        return this._current_slice;
    }

    set current_slice(value: Slice) { // This was the old Slice
        this._current_slice = value;
        if (this._current_slice && this._current_slice.qubits.size > 0) { // Old check
            this.onCurrentSliceChange();
        }
    }
    */

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
        // this._current_slice = new Slice(); // Initialize with new lightweight Slice if needed, or manage through index
        this.current_slice_index = -1; // Indicates no slice loaded initially

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
        this._qubit_count = 9;
        this._grid_rows = 3;
        this._grid_cols = 3;
        this.couplingMap = null;

        if (this.heatmap && this.heatmap.mesh)
            this.scene.remove(this.heatmap.mesh);
        // Ensure heatmap is created even in error, with the default qubit count
        this.heatmap = new Heatmap(
            camera,
            this._qubit_count,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);

        // This will calculate positions and create qubitInstances
        this.calculateQubitPositions(
            this._qubit_count,
            this.couplingMap,
            10,
            10,
        );
        this.createGrid();

        const errorSlice = new Slice(0);
        errorSlice.interacting_qubits = new Set();
        this.slices = [errorSlice];

        this.timeline.setSliceCount(1);
        this.loadStateFromSlice(0); // Sets current_slice_index and calls onCurrentSliceChange
        // drawConnections is called by onCurrentSliceChange
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
                    new Error("Invalid JSON data structure"),
                    camera,
                    "Invalid JSON data structure",
                );
                return;
            }

            this._qubit_count = Number(jsonData.num_qubits);
            this.couplingMap = jsonData.coupling_map || null;

            // Initialize for connection lines if couplingMap exists
            if (this.couplingMap) {
                this.maxConnections = this.couplingMap.length;
                this.initializeConnectionLines();
            } else {
                this.maxConnections = 0;
                this.clearConnectionLineObject(); // Ensure any old line object is gone
            }

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

            if (this.heatmap && this.heatmap.mesh) {
                this.scene.remove(this.heatmap.mesh);
                // Assuming Heatmap doesn't have a complex dispose, otherwise call it
            }
            this.heatmap = new Heatmap(
                camera,
                this._qubit_count,
                this.maxSlicesForHeatmap,
            );
            this.scene.add(this.heatmap.mesh);

            this.createGrid();

            const loadedSlices: Slice[] = [];
            jsonData.operations_per_slice.forEach((sliceOps, timeStep) => {
                const newSlice = new Slice(timeStep);
                const interactingQubitsThisSlice = new Set<number>();
                sliceOps.forEach((op) => {
                    op.qubits.forEach((qIndex) =>
                        interactingQubitsThisSlice.add(qIndex),
                    );
                });
                newSlice.interacting_qubits = interactingQubitsThisSlice;
                loadedSlices.push(newSlice);
            });

            this.slices = loadedSlices;

            if (this.slices.length > 0) {
                this.timeline.setSliceCount(this.slices.length);
                this.loadStateFromSlice(0);
            } else {
                this.timeline.setSliceCount(
                    this.qubitInstances.size > 0 ? 1 : 0,
                );
                if (this.qubitInstances.size > 0) {
                    const defaultSlice = new Slice(0);
                    this.slices = [defaultSlice]; // Create a single slice representing the initial state
                    this.loadStateFromSlice(0); // This will set current_slice_index = 0 and call onCurrentSliceChange
                } else {
                    this.current_slice_index = -1;
                    this.slices = []; // Ensure slices is empty
                    this.onCurrentSliceChange();
                }
                console.warn(
                    "[QubitGrid] No operational slices loaded, showing initial/empty state.",
                );
            }
            // drawConnections is called by onCurrentSliceChange, which is called by loadStateFromSlice or directly.
        } catch (error) {
            this.handleLoadError(
                error as Error,
                camera,
                "Failed to load or parse JSON file",
            );
        }
    }

    public onCurrentSliceChange() {
        // Check if there are no qubits and no slice data to process
        if (
            this.qubitInstances.size === 0 &&
            (this.slices.length === 0 || this.current_slice_index < 0)
        ) {
            console.warn(
                "[QubitGrid] onCurrentSliceChange: No qubits or no valid slice data.",
            );
            if (this.heatmap) this.heatmap.updatePoints(new Map(), []);
            this.lastCalculatedSlicesChangeIDs = [];
            this.drawConnections();
            return;
        }

        // If there are qubits but no slices (e.g. error or empty JSON but num_qubits was > 0)
        // ensure current_slice_index is valid if slices array was populated with a default.
        if (
            this.qubitInstances.size > 0 &&
            this.slices.length > 0 &&
            this.current_slice_index < 0
        ) {
            this.current_slice_index = 0; // Default to first slice if available
        }

        const currentVisibleSliceData = this.current_slice_data; // Uses getter, depends on current_slice_index

        const slicesChangeIDs = new Array<Set<number>>();
        // Ensure currentVisibleSliceData is not null before accessing its properties
        if (
            currentVisibleSliceData &&
            currentVisibleSliceData.interacting_qubits
        ) {
            slicesChangeIDs.push(currentVisibleSliceData.interacting_qubits);
        }

        const historicalStartIndex = this.current_slice_index - 1;
        // Ensure current_slice_index is non-negative for the next calculation
        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndex + 1, // This can be 0 if current_slice_index is 0
            Math.max(0, this.current_slice_index), // Max with 0 ensures non-negative value here
        );

        for (let i = 0; i < numAdditionalSlicesToConsider; i++) {
            const targetHistoricalIndex = historicalStartIndex - i;
            if (
                targetHistoricalIndex >= 0 &&
                this.slices[targetHistoricalIndex] &&
                this.slices[targetHistoricalIndex].interacting_qubits
            ) {
                slicesChangeIDs.push(
                    this.slices[targetHistoricalIndex].interacting_qubits,
                );
            } else {
                break;
            }
        }
        this.lastCalculatedSlicesChangeIDs = slicesChangeIDs;

        if (this.heatmap) {
            // Check if heatmap is initialized
            if (this.qubitInstances.size > 0) {
                this.heatmap.updatePoints(this.qubitInstances, slicesChangeIDs);
            } else {
                this.heatmap.updatePoints(new Map(), []); // Clear heatmap if no qubits
            }
        }

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
            this.current_slice_index = sliceIndex;
        } else if (this.slices.length > 0) {
            console.warn(
                `[QubitGrid] Slice index ${sliceIndex} out of bounds, loading first slice`,
            );
            this.current_slice_index = 0;
        } else {
            console.warn("[QubitGrid] No slices available to load.");
            this.current_slice_index = -1; // No valid slice
        }
        // Qubit states are not changing per slice in this model,
        // Bloch spheres are persistent and show default state.
        // We just need to trigger heatmap/connection updates.
        this.onCurrentSliceChange();
    }

    createGrid() {
        // Clear existing qubit instances from the scene and map
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                this.scene.remove(qubit.blochSphere.blochSphere);
            }
            qubit.dispose(); // Call dispose on Qubit, which calls on BlochSphere
        });
        this.qubitInstances.clear();

        // Connection lines buffers might depend on couplingMap which is set in loadSlicesFromJSON.
        // If createGrid is called standalone or before couplingMap is known, lines might not be ready.
        // For now, initialization is in loadSlicesFromJSON. If couplingMap changes, re-init is needed.

        for (let i = 0; i < this._qubit_count; i++) {
            const pos = this.qubitPositions.get(i) || new THREE.Vector2(0, 0);
            this.createQubit(i, pos.x, pos.y);
        }
    }

    createQubit(id: number, x: number, y: number) {
        const blochSphere = new BlochSphere(x, y); // Creates the 3D object
        // Scene addition of blochSphere.blochSphere handled here:
        this.scene.add(blochSphere.blochSphere);

        const qubit = new Qubit(id, State.ZERO, blochSphere); // Default state
        this.qubitInstances.set(id, qubit);
        // No longer adding to a _current_slice.qubits here
    }

    private initializeConnectionLines() {
        this.clearConnectionLineObject(); // Clear previous if any

        if (this.maxConnections === 0 || !this.couplingMap) return;

        this.connectionLineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxConnections * 2 * 3); // 2 points per line, 3 xyz per point
        const intensities = new Float32Array(this.maxConnections * 2 * 1); // 2 points per line, 1 intensity per point

        this.connectionLineGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3).setUsage(
                THREE.DynamicDrawUsage,
            ),
        );
        this.connectionLineGeometry.setAttribute(
            "vertexIntensity",
            new THREE.BufferAttribute(intensities, 1).setUsage(
                THREE.DynamicDrawUsage,
            ),
        );

        this.connectionLineSegments = new THREE.LineSegments(
            this.connectionLineGeometry,
            this.lineMaterial,
        );
        this.connectionLines.add(this.connectionLineSegments); // Add to the group dedicated to lines
    }

    private clearConnectionLineObject() {
        if (this.connectionLineSegments) {
            this.connectionLines.remove(this.connectionLineSegments);
            if (this.connectionLineSegments.geometry) {
                this.connectionLineSegments.geometry.dispose();
            }
            // lineMaterial is shared, do not dispose here
            this.connectionLineSegments = null;
            this.connectionLineGeometry = null;
        }
    }

    // This method is now for hiding/showing or clearing attributes, not full disposal of the main object.
    clearConnections() {
        if (this.connectionLineSegments && this.connectionLineGeometry) {
            // Option 1: Hide the lines object if no connections should be drawn
            // this.connectionLineSegments.visible = false;
            // Option 2: Zero out attributes if you want to keep the object for potential reuse
            // This is more complex if the number of active lines changes drastically.
            // For now, we assume drawConnections will populate up to activeConnectionsCount.
            // If couplingMap is truly dynamic, re-initialization is better (already handled somewhat).
            // The current drawConnections will overwrite attributes, so this might not be strictly needed
            // if drawConnections handles the count of lines to draw correctly.
        }
        // The old full clear is replaced by drawConnections updating existing buffers.
        // If couplingMap becomes null or empty after initialization, drawConnections should handle that.
    }

    drawConnections() {
        // If no coupling map, or no qubit positions, or the line object isn't initialized, hide and exit.
        if (
            !this.couplingMap ||
            this.couplingMap.length === 0 ||
            !this.qubitPositions ||
            this.qubitPositions.size === 0 ||
            !this.connectionLineSegments ||
            !this.connectionLineGeometry
        ) {
            if (this.connectionLineSegments) {
                this.connectionLineSegments.visible = false;
            }
            return;
        }

        this.connectionLineSegments.visible = true;

        const positionsAttribute = this.connectionLineGeometry.attributes
            .position as THREE.BufferAttribute;
        const intensityAttribute = this.connectionLineGeometry.attributes
            .vertexIntensity as THREE.BufferAttribute;

        let lineCount = 0;
        const currentSlicesChangeData = this.lastCalculatedSlicesChangeIDs;

        this.couplingMap.forEach((pair) => {
            if (lineCount >= this.maxConnections) {
                // Safety break, should not happen if maxConnections is correct
                console.warn(
                    "[QubitGrid] Exceeded maxConnections when drawing lines.",
                );
                return;
            }
            if (pair.length === 2) {
                const qubitIdA = pair[0];
                const qubitIdB = pair[1];

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

                    const pIndex = lineCount * 2; // Each line has two points
                    positionsAttribute.setXYZ(pIndex, posA.x, posA.y, 0);
                    positionsAttribute.setXYZ(pIndex + 1, posB.x, posB.y, 0);

                    intensityAttribute.setX(pIndex, intensityA);
                    intensityAttribute.setX(pIndex + 1, intensityB);

                    lineCount++;
                } else {
                    // Fill with degenerate triangles if a connection is missing, to keep attributes aligned
                    // Or, ensure couplingMap only contains valid qubit IDs that have positions.
                    // For now, skip if positions are missing, which might misalign buffers if not careful.
                    // Better: ensure this.maxConnections is based on *drawable* lines.
                    // console.warn(`[QubitGrid] Could not find positions for connection: ${qubitIdA} - ${qubitIdB}`);
                }
            }
        });

        // If fewer lines are drawn than maxConnections, zero out the rest of the buffer
        // or use geometry.setDrawRange to only draw the active lines.
        this.connectionLineGeometry.setDrawRange(0, lineCount * 2); // 2 vertices per line

        positionsAttribute.needsUpdate = true;
        intensityAttribute.needsUpdate = true;
        this.connectionLineGeometry.computeBoundingSphere(); // Optional, but good for culling
    }

    private getQubitInteractionIntensity(
        qubitId: number,
        slicesChangeData: Array<Set<number>>, // This is lastCalculatedSlicesChangeIDs
    ): number {
        let interactionCount = 0;
        // Ensure slicesChangeData is defined and an array
        if (!slicesChangeData || !Array.isArray(slicesChangeData)) {
            return 0;
        }
        const slicesToConsider = slicesChangeData.slice(
            0,
            this.maxSlicesForHeatmap,
        );
        slicesToConsider.forEach((sliceInteractionSet) => {
            if (
                sliceInteractionSet instanceof Set &&
                sliceInteractionSet.has(qubitId)
            ) {
                interactionCount++;
            }
        });
        if (slicesToConsider.length === 0) return 0;
        return interactionCount / slicesToConsider.length;
    }
}
