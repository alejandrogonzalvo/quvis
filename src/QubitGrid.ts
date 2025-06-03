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

const CYLINDER_VERTEX_SHADER = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const CYLINDER_FRAGMENT_SHADER = `
    uniform float uIntensity;
    varying vec3 vNormal; // Available if needed for lighting effects later

    void main() {
        vec3 colorValue;
        if (uIntensity <= 0.001) { // Check against a small epsilon for floating point
            colorValue = vec3(0.0, 1.0, 0.0); // Green for zero or very low intensity
        } else if (uIntensity <= 0.5) {
            // Green (0,1,0) to Yellow (1,1,0)
            colorValue = vec3(uIntensity * 2.0, 1.0, 0.0);
        } else {
            // Yellow (1,1,0) to Red (1,0,0)
            colorValue = vec3(1.0, 1.0 - (uIntensity - 0.5) * 2.0, 0.0);
        }
        gl_FragColor = vec4(colorValue, 1.0);
    }
`;

export class QubitGrid {
    scene: THREE.Scene;
    slices: Array<Slice>;
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap!: Heatmap;
    maxSlicesForHeatmap: number;
    private couplingMap: number[][] | null = null;
    private connectionLines: THREE.Group; // Will hold cylinder Meshes
    private qubitPositions: Map<number, THREE.Vector3> = new Map();
    private lastCalculatedSlicesChangeIDs: Array<Set<number>> = [];

    private qubitInstances: Map<number, Qubit> = new Map();
    private current_slice_index: number = 0;

    private _qubit_count: number;
    private _grid_rows: number;
    private _grid_cols: number;

    // Force-directed layout parameters
    private kRepel: number;
    private idealDist: number;
    private iterations: number;
    private coolingFactor: number;
    private kAttract: number = 0.05;

    // Appearance parameters
    private currentConnectionThickness: number;
    // No longer a single shared connectionMaterial

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

    constructor(
        scene: THREE.Scene,
        mouse: THREE.Vector2,
        camera: THREE.PerspectiveCamera,
        initialMaxSlicesForHeatmap: number = 10,
        initialKRepel: number = 0.3,
        initialIdealDist: number = 5.0,
        initialIterations: number = 300,
        initialCoolingFactor: number = 0.95,
        initialConnectionThickness: number = 0.05,
    ) {
        this.scene = scene;
        this.mouse = mouse;
        this.slices = [];
        this.maxSlicesForHeatmap = initialMaxSlicesForHeatmap;
        this._qubit_count = 0;
        this._grid_rows = 0;
        this._grid_cols = 0;
        this.current_slice_index = -1;

        this.kRepel = initialKRepel;
        this.idealDist = initialIdealDist;
        this.iterations = initialIterations;
        this.coolingFactor = initialCoolingFactor;
        this.currentConnectionThickness = initialConnectionThickness;

        this.timeline = new Timeline((sliceIndex) =>
            this.loadStateFromSlice(sliceIndex),
        );
        this.connectionLines = new THREE.Group();
        this.scene.add(this.connectionLines);

        this.heatmap = new Heatmap(camera, 1, this.maxSlicesForHeatmap);
        this.scene.add(this.heatmap.mesh);

        this.loadSlicesFromJSON("/quvis/qft_viz_data.json", camera);
    }

    private calculateQubitPositions(
        numQubits: number,
        couplingMap: number[][] | null,
        areaWidth: number,
        areaHeight: number,
        areaDepth: number,
    ): void {
        this.qubitPositions.clear();
        if (numQubits === 0) return;

        if (!couplingMap || numQubits <= 1) {
            const cols = Math.ceil(Math.sqrt(numQubits));
            const rows = Math.ceil(numQubits / cols);
            this._grid_cols = cols;
            this._grid_rows = rows;
            const spacing = 2;
            const offsetX = ((cols - 1) * spacing) / 2;
            const offsetY = ((rows - 1) * spacing) / 2;
            let count = 0;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (count < numQubits) {
                        this.qubitPositions.set(
                            count,
                            new THREE.Vector3(
                                j * spacing - offsetX,
                                i * spacing - offsetY,
                                0,
                            ),
                        );
                        count++;
                    }
                }
            }
            return;
        }

        for (let i = 0; i < numQubits; i++) {
            if (!this.qubitPositions.has(i)) {
                this.qubitPositions.set(
                    i,
                    new THREE.Vector3(
                        (Math.random() - 0.5) * areaWidth * 0.1,
                        (Math.random() - 0.5) * areaHeight * 0.1,
                        (Math.random() - 0.5) * areaDepth * 0.1,
                    ),
                );
            }
        }

        let temperature = Math.max(areaWidth, areaHeight, areaDepth) / 10;
        for (let iter = 0; iter < this.iterations; iter++) {
            const forces = new Map<number, THREE.Vector3>();
            for (let i = 0; i < numQubits; i++)
                forces.set(i, new THREE.Vector3(0, 0, 0));

            for (let i = 0; i < numQubits; i++) {
                for (let j = i + 1; j < numQubits; j++) {
                    const posI = this.qubitPositions.get(i)!;
                    const posJ = this.qubitPositions.get(j)!;
                    const delta = new THREE.Vector3().subVectors(posI, posJ);
                    const dist = delta.length() || 1e-6;
                    const forceMag = (this.kRepel * this.kRepel) / dist;
                    const forceVec = delta.normalize().multiplyScalar(forceMag);
                    forces.get(i)!.add(forceVec);
                    forces.get(j)!.sub(forceVec);
                }
            }

            if (couplingMap) {
                couplingMap.forEach((pair) => {
                    if (pair.length === 2) {
                        const u = pair[0];
                        const v = pair[1];
                        const posU = this.qubitPositions.get(u)!;
                        const posV = this.qubitPositions.get(v)!;
                        if (posU && posV) {
                            const delta = new THREE.Vector3().subVectors(
                                posV,
                                posU,
                            );
                            const dist = delta.length() || 1e-6;
                            const forceMag =
                                this.kAttract * (dist - this.idealDist);
                            const forceVec = delta
                                .normalize()
                                .multiplyScalar(forceMag);
                            forces.get(u)!.add(forceVec);
                            forces.get(v)!.sub(forceVec);
                        }
                    }
                });
            }

            for (let i = 0; i < numQubits; i++) {
                const pos = this.qubitPositions.get(i)!;
                const force = forces.get(i)!;
                const displacement = force
                    .clone()
                    .normalize()
                    .multiplyScalar(Math.min(force.length(), temperature));
                pos.add(displacement);
            }
            temperature *= this.coolingFactor;
        }

        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;
        this.qubitPositions.forEach((pos) => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            minZ = Math.min(minZ, pos.z);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
            maxZ = Math.max(maxZ, pos.z);
        });
        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        const currentDepth = maxZ - minZ;
        const scale =
            Math.min(
                areaWidth / (currentWidth || 1),
                areaHeight / (currentHeight || 1),
                areaDepth / (currentDepth || 1),
            ) * 0.8;
        this.qubitPositions.forEach((pos) => {
            pos.x = (pos.x - (minX + currentWidth / 2)) * scale;
            pos.y = (pos.y - (minY + currentHeight / 2)) * scale;
            pos.z = (pos.z - (minZ + currentDepth / 2)) * scale;
        });
    }

    private handleLoadError(
        error: Error,
        camera: THREE.PerspectiveCamera,
        message: string = "Error loading data",
    ) {
        console.error(message, error);
        this._qubit_count = 9;
        this.couplingMap = null;
        if (this.heatmap && this.heatmap.mesh)
            this.scene.remove(this.heatmap.mesh);
        this.heatmap = new Heatmap(
            camera,
            this._qubit_count,
            this.maxSlicesForHeatmap,
        );
        this.scene.add(this.heatmap.mesh);
        const errorAreaSize = 10;
        this.calculateQubitPositions(
            this._qubit_count,
            null,
            errorAreaSize,
            errorAreaSize,
            errorAreaSize,
        );
        this.createGrid();
        const errorSlice = new Slice(0);
        errorSlice.interacting_qubits = new Set();
        this.slices = [errorSlice];
        this.timeline.setSliceCount(1);
        this.loadStateFromSlice(0);
    }

    async loadSlicesFromJSON(url: string, camera: THREE.PerspectiveCamera) {
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(
                    `HTTP error! status: ${response.status} while fetching ${url}`,
                );
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

            const layoutAreaSide = Math.max(
                5,
                Math.sqrt(this._qubit_count) * 2,
            );
            this.calculateQubitPositions(
                this._qubit_count,
                this.couplingMap,
                layoutAreaSide,
                layoutAreaSide,
                layoutAreaSide,
            );
            if (this.heatmap && this.heatmap.mesh)
                this.scene.remove(this.heatmap.mesh);
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
                sliceOps.forEach((op) =>
                    op.qubits.forEach((qIndex) =>
                        interactingQubitsThisSlice.add(qIndex),
                    ),
                );
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
                    this.slices = [new Slice(0)];
                    this.loadStateFromSlice(0);
                } else {
                    this.current_slice_index = -1;
                    this.slices = [];
                    this.onCurrentSliceChange();
                }
                console.warn("[QubitGrid] No operational slices loaded...");
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
        if (
            this.qubitInstances.size === 0 &&
            (this.slices.length === 0 || this.current_slice_index < 0)
        ) {
            if (this.heatmap) this.heatmap.updatePoints(new Map(), []);
            this.lastCalculatedSlicesChangeIDs = [];
            this.drawConnections(); // Will clear if nothing to draw
            return;
        }
        if (
            this.qubitInstances.size > 0 &&
            this.slices.length > 0 &&
            this.current_slice_index < 0
        ) {
            this.current_slice_index = 0;
        }
        const currentVisibleSliceData = this.current_slice_data;
        const slicesChangeIDs = new Array<Set<number>>();
        if (
            currentVisibleSliceData &&
            currentVisibleSliceData.interacting_qubits
        ) {
            slicesChangeIDs.push(currentVisibleSliceData.interacting_qubits);
        }
        const historicalStartIndex = this.current_slice_index - 1;
        const numAdditionalSlicesToConsider = Math.min(
            this.maxSlicesForHeatmap - 1,
            historicalStartIndex + 1,
            Math.max(0, this.current_slice_index),
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
            } else break;
        }
        this.lastCalculatedSlicesChangeIDs = slicesChangeIDs;
        if (this.heatmap) {
            if (this.qubitInstances.size > 0)
                this.heatmap.updatePoints(this.qubitInstances, slicesChangeIDs);
            else this.heatmap.updatePoints(new Map(), []);
        }
        this.drawConnections();
    }

    loadStateFromSlice(sliceIndex: number): void {
        if (sliceIndex >= 0 && sliceIndex < this.slices.length)
            this.current_slice_index = sliceIndex;
        else if (this.slices.length > 0) this.current_slice_index = 0;
        else this.current_slice_index = -1;
        this.onCurrentSliceChange();
    }

    createGrid() {
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere)
                this.scene.remove(qubit.blochSphere.blochSphere);
            qubit.dispose();
        });
        this.qubitInstances.clear();
        for (let i = 0; i < this._qubit_count; i++) {
            const pos =
                this.qubitPositions.get(i) || new THREE.Vector3(0, 0, 0);
            this.createQubit(i, pos.x, pos.y, pos.z);
        }
    }

    createQubit(id: number, x: number, y: number, z: number) {
        const blochSphere = new BlochSphere(x, y, z);
        this.scene.add(blochSphere.blochSphere);
        const qubit = new Qubit(id, State.ZERO, blochSphere);
        this.qubitInstances.set(id, qubit);
        blochSphere.blochSphere.userData.qubitId = id;
        blochSphere.blochSphere.userData.qubitState = qubit.state;
    }

    private clearConnectionCylinders() {
        while (this.connectionLines.children.length > 0) {
            const cylinder = this.connectionLines.children[0] as THREE.Mesh;
            this.connectionLines.remove(cylinder);
            cylinder.geometry.dispose();
            if (cylinder.material instanceof THREE.Material)
                cylinder.material.dispose(); // Dispose material instance
        }
    }

    drawConnections() {
        this.clearConnectionCylinders();
        if (
            !this.couplingMap ||
            this.couplingMap.length === 0 ||
            !this.qubitPositions ||
            this.qubitPositions.size === 0
        ) {
            return;
        }

        const yAxis = new THREE.Vector3(0, 1, 0); // Default cylinder orientation

        const currentSlicesChangeData = this.lastCalculatedSlicesChangeIDs; // Used by getQubitInteractionIntensity

        this.couplingMap.forEach((pair) => {
            if (pair.length === 2) {
                const qubitIdA = pair[0];
                const qubitIdB = pair[1];
                const posA = this.qubitPositions.get(qubitIdA);
                const posB = this.qubitPositions.get(qubitIdB);

                if (posA && posB) {
                    const distance = posA.distanceTo(posB);
                    if (distance === 0) return; // Avoid zero-length cylinder

                    const intensityA = this.getQubitInteractionIntensity(
                        qubitIdA,
                        currentSlicesChangeData,
                    );
                    const intensityB = this.getQubitInteractionIntensity(
                        qubitIdB,
                        currentSlicesChangeData,
                    );
                    const connectionIntensity = (intensityA + intensityB) / 2.0;

                    const material = new THREE.ShaderMaterial({
                        vertexShader: CYLINDER_VERTEX_SHADER,
                        fragmentShader: CYLINDER_FRAGMENT_SHADER,
                        uniforms: {
                            uIntensity: { value: connectionIntensity },
                        },
                    });

                    const cylinderGeo = new THREE.CylinderGeometry(
                        this.currentConnectionThickness,
                        this.currentConnectionThickness,
                        distance,
                        8,
                        1,
                    );
                    const cylinderMesh = new THREE.Mesh(cylinderGeo, material);

                    // Position at midpoint
                    cylinderMesh.position
                        .copy(posA)
                        .add(posB)
                        .multiplyScalar(0.5);

                    // Orient cylinder
                    const direction = new THREE.Vector3()
                        .subVectors(posB, posA)
                        .normalize();
                    const quaternion =
                        new THREE.Quaternion().setFromUnitVectors(
                            yAxis,
                            direction,
                        );
                    cylinderMesh.quaternion.copy(quaternion);

                    this.connectionLines.add(cylinderMesh);
                }
            }
        });
    }

    private getQubitInteractionIntensity(
        qubitId: number,
        slicesChangeData: Array<Set<number>>,
    ): number {
        let interactionCount = 0;
        if (!slicesChangeData || !Array.isArray(slicesChangeData)) return 0;
        const slicesToConsider = slicesChangeData.slice(
            0,
            this.maxSlicesForHeatmap,
        );
        slicesToConsider.forEach((sliceInteractionSet) => {
            if (
                sliceInteractionSet instanceof Set &&
                sliceInteractionSet.has(qubitId)
            )
                interactionCount++;
        });
        if (slicesToConsider.length === 0) return 0;
        return interactionCount / slicesToConsider.length;
    }

    public recalculateLayoutAndRedraw(
        newKRepel: number,
        newIdealDist: number,
        newIterations: number,
        newCoolingFactor: number,
    ) {
        this.kRepel = newKRepel;
        this.idealDist = newIdealDist;
        this.iterations = newIterations;
        this.coolingFactor = newCoolingFactor;
        if (this._qubit_count === 0) {
            this.createGrid();
            if (this.heatmap) this.heatmap.clearPositionsCache();
            this.onCurrentSliceChange();
            return;
        }
        this.qubitPositions.clear();
        const layoutAreaSide = Math.max(5, Math.sqrt(this._qubit_count) * 2);
        this.calculateQubitPositions(
            this._qubit_count,
            this.couplingMap,
            layoutAreaSide,
            layoutAreaSide,
            layoutAreaSide,
        );
        this.createGrid();
        if (this.heatmap) this.heatmap.clearPositionsCache();
        this.onCurrentSliceChange(); // This will call drawConnections
    }

    public setQubitScale(scale: number): void {
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere) qubit.blochSphere.setScale(scale);
        });
    }

    public setConnectionThickness(thickness: number): void {
        this.currentConnectionThickness = thickness;
        this.drawConnections(); // Redraw connections with new thickness
    }

    // xyzToState, getQubitInteractionIntensity, clearConnections are omitted for brevity if unchanged
    // but ensure they are present if needed by other parts of your code.
    // For this refactor, getQubitInteractionIntensity is not used for cylinder color yet.
}
