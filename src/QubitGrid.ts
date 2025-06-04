import * as THREE from "three";
import { Timeline } from "./Timeline.js";
import { Qubit } from "./Qubit.js";
import { State } from "./State.js";
import { Heatmap } from "./Heatmap.js";
import { Slice } from "./Slice.js";
import { BlochSphere } from "./BlochSphere.js";
import { HeatmapLegend } from "./Legend.js";

interface QubitOperation {
    name: string;
    qubits: number[];
}

interface LogicalCircuitInfo {
    num_qubits: number;
    interaction_graph_ops_per_slice: QubitOperation[][];
}

interface CompiledCircuitInfo {
    num_qubits: number;
    compiled_interaction_graph_ops_per_slice: QubitOperation[][];
}

interface DeviceInfo {
    num_qubits_on_device: number;
    connectivity_graph_coupling_map: number[][];
}

interface QFTVizData {
    logical_circuit_info: LogicalCircuitInfo;
    compiled_circuit_info: CompiledCircuitInfo;
    device_info: DeviceInfo;
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
    uniform float uInactiveAlpha;
    varying vec3 vNormal;

    void main() {
        vec3 colorValue;
        float alphaValue;

        if (uIntensity <= 0.001) {
            alphaValue = uInactiveAlpha;
            colorValue = vec3(0.5, 0.5, 0.5);
        } else if (uIntensity <= 0.5) {
            alphaValue = 1.0;
            colorValue = vec3(uIntensity * 2.0, 1.0, 0.0);
        } else {
            alphaValue = 1.0;
            colorValue = vec3(1.0, 1.0 - (uIntensity - 0.5) * 2.0, 0.0);
        }
        gl_FragColor = vec4(colorValue, alphaValue);
    }
`;

export class QubitGrid {
    scene: THREE.Scene;
    slices: Array<Slice>;
    interactionPairsPerSlice: Array<Array<{ q1: number; q2: number }>> = [];
    mouse: THREE.Vector2;
    timeline: Timeline;
    heatmap!: Heatmap;
    maxSlicesForHeatmap: number;
    private couplingMap: number[][] | null = null;
    private connectionLines: THREE.Group;
    private qubitPositions: Map<number, THREE.Vector3> = new Map();
    private lastCalculatedSlicesChangeIDs: Array<Set<number>> = [];
    public lastMaxObservedRawHeatmapSum: number = 0;
    public lastEffectiveSlicesForHeatmap: number = 0;

    public qubitInstances: Map<number, Qubit> = new Map();
    private current_slice_index: number = 0;

    private _qubit_count: number;
    private _grid_rows: number;
    private _grid_cols: number;

    private kRepel: number;
    private idealDist: number;
    private iterations: number;
    private coolingFactor: number;
    private kAttract: number = 0.05;

    private currentConnectionThickness: number;
    private currentInactiveElementAlpha: number;

    private onSlicesLoadedCallback:
        | ((count: number, initialIndex: number) => void)
        | undefined;

    private camera: THREE.PerspectiveCamera;
    heatmapLegend!: HeatmapLegend;
    private readonly heatmapLegendContainerId = "heatmap-legend-container";
    private readonly heatmapYellowThreshold = 0.5;
    private readonly heatmapWeightBase = 1.3;
    private readonly datasetName: string;
    private readonly visualizationMode: "compiled" | "logical";

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
        datasetName: string,
        visualizationMode: "compiled" | "logical",
        initialMaxSlicesForHeatmap: number = 10,
        initialKRepel: number = 0.3,
        initialIdealDist: number = 5.0,
        initialIterations: number = 300,
        initialCoolingFactor: number = 0.95,
        initialConnectionThickness: number = 0.05,
        initialInactiveElementAlpha: number = 0.1,
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
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
        this.currentInactiveElementAlpha = initialInactiveElementAlpha;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;

        this.camera = camera;
        this.datasetName = datasetName;
        this.visualizationMode = visualizationMode;

        this.timeline = new Timeline((sliceIndex) =>
            this.loadStateFromSlice(sliceIndex),
        );
        this.connectionLines = new THREE.Group();
        this.scene.add(this.connectionLines);

        this.heatmap = new Heatmap(camera, 1, this.maxSlicesForHeatmap);
        this.scene.add(this.heatmap.mesh);

        this.heatmapLegend = new HeatmapLegend(
            this.heatmapLegendContainerId,
            this.heatmapYellowThreshold,
        );
        if (this.heatmapLegend) {
            let initialEffectiveSlices = 0;
            if (this.maxSlicesForHeatmap === -1) {
                initialEffectiveSlices = Math.max(
                    0,
                    this.current_slice_index + 1,
                );
            } else {
                initialEffectiveSlices = Math.max(
                    0,
                    Math.min(
                        this.current_slice_index + 1,
                        this.maxSlicesForHeatmap,
                    ),
                );
            }
            this.heatmapLegend.update(
                this.maxSlicesForHeatmap,
                initialEffectiveSlices,
                0,
            );
        }

        const dataUrl = `/quvis/${this.datasetName}_viz_data.json`;
        this.loadSlicesFromJSON(dataUrl, camera);
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
            const spacing = this.idealDist;
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
            if (numQubits <= 1 || !couplingMap) return;
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
        if (this.heatmap.mesh) this.scene.add(this.heatmap.mesh);

        this.heatmap.updatePoints(new Map(), -1, []);

        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap =
            this.maxSlicesForHeatmap === -1
                ? this.current_slice_index + 1
                : Math.min(
                      this.current_slice_index + 1,
                      this.maxSlicesForHeatmap,
                  );
        this.lastEffectiveSlicesForHeatmap = Math.max(
            0,
            this.lastEffectiveSlicesForHeatmap,
        );

        if (this.heatmapLegend) {
            this.heatmapLegend.update(
                this.maxSlicesForHeatmap,
                this.lastEffectiveSlicesForHeatmap,
                0,
            );
        }
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
        this.onSlicesLoadedCallback?.(
            this.slices.length,
            this.current_slice_index,
        );
    }

    async loadSlicesFromJSON(url: string, camera: THREE.PerspectiveCamera) {
        this.slices = [];
        this.interactionPairsPerSlice = [];
        this.qubitInstances.forEach((qubit) => qubit.dispose());
        this.qubitInstances.clear();
        this.heatmap.clearPositionsCache();
        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap = 0;

        try {
            console.log(`Fetching data from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData: QFTVizData = await response.json();
            console.log("Successfully fetched and parsed JSON data:", jsonData);

            let num_qubits_for_mode: number;
            let operations_list_for_mode: QubitOperation[][];

            if (this.visualizationMode === "logical") {
                console.log("LOGICAL MODE SELECTED");
                console.log(
                    "jsonData.logical_circuit_info:",
                    jsonData.logical_circuit_info,
                );
                if (jsonData.logical_circuit_info) {
                    num_qubits_for_mode =
                        jsonData.logical_circuit_info.num_qubits;
                    operations_list_for_mode =
                        jsonData.logical_circuit_info
                            .interaction_graph_ops_per_slice;
                    console.log("Logical num_qubits:", num_qubits_for_mode);
                    console.log(
                        "Logical operations_list_for_mode:",
                        operations_list_for_mode,
                    );
                    if (!operations_list_for_mode) {
                        console.error(
                            "ERROR: Logical operations_list_for_mode is undefined/null AFTER assignment!",
                        );
                    } else if (!Array.isArray(operations_list_for_mode)) {
                        console.error(
                            "ERROR: Logical operations_list_for_mode is NOT AN ARRAY!",
                        );
                    }
                } else {
                    console.error(
                        "ERROR: jsonData.logical_circuit_info IS UNDEFINED!",
                    );
                    // Fallback to prevent further errors, though this indicates a major issue
                    num_qubits_for_mode = 0;
                    operations_list_for_mode = [];
                }
            } else {
                // "compiled"
                console.log("COMPILED MODE SELECTED");
                console.log(
                    "jsonData.compiled_circuit_info:",
                    jsonData.compiled_circuit_info,
                );
                num_qubits_for_mode = jsonData.compiled_circuit_info.num_qubits;
                operations_list_for_mode =
                    jsonData.compiled_circuit_info
                        .compiled_interaction_graph_ops_per_slice;
                console.log("Compiled num_qubits:", num_qubits_for_mode);
                console.log(
                    "Compiled operations_list_for_mode:",
                    operations_list_for_mode,
                );
            }

            this._qubit_count = num_qubits_for_mode;
            // Always load the coupling map from device_info if available.
            // Positioning will use it. Drawing connections will be mode-dependent.
            this.couplingMap =
                jsonData.device_info.connectivity_graph_coupling_map;

            // Determine grid dimensions based on the number of qubits in the selected view
            this._grid_cols = Math.ceil(Math.sqrt(this._qubit_count));
            this._grid_rows = Math.ceil(this._qubit_count / this._grid_cols);

            this.slices = operations_list_for_mode.map(
                (ops_in_slice, sliceIdx) => {
                    const slice = new Slice(sliceIdx); // Correct constructor call
                    const interactionPairs: Array<{ q1: number; q2: number }> =
                        [];

                    ops_in_slice.forEach((op) => {
                        op.qubits.forEach((qid) =>
                            slice.interacting_qubits.add(qid),
                        ); // Populate interacting_qubits
                        if (op.qubits.length === 2) {
                            interactionPairs.push({
                                q1: op.qubits[0],
                                q2: op.qubits[1],
                            });
                        }
                    });
                    this.interactionPairsPerSlice.push(interactionPairs);
                    return slice;
                },
            );

            console.log(
                `Processing complete. Number of slices generated: ${this.slices.length}`,
            );

            if (this.slices.length > 0) {
                this.current_slice_index = 0; // Start at the first slice
                this.timeline.setSliceCount(this.slices.length); // Corrected Timeline method
                this.timeline.setSlice(this.current_slice_index); // Corrected Timeline method
                this.loadStateFromSlice(this.current_slice_index); // Load initial state
            } else {
                this.current_slice_index = -1;
                this.timeline.setSliceCount(0); // Corrected Timeline method
            }

            // Re-create heatmap if qubit count changed for the new mode
            if (
                this.heatmap &&
                this.heatmap.mesh.geometry.attributes.position.count !==
                    this._qubit_count
            ) {
                this.scene.remove(this.heatmap.mesh);
                this.heatmap.dispose();
                this.heatmap = new Heatmap(
                    camera,
                    this._qubit_count,
                    this.maxSlicesForHeatmap,
                );
                this.scene.add(this.heatmap.mesh);
                // Legend update is handled by refreshLegend below
            }

            // Pass the potentially nulled-out couplingMap for logical mode
            this.calculateQubitPositions(
                this._qubit_count,
                this.couplingMap,
                20,
                20,
                10,
            );
            this.createGrid();
            this.drawConnections(); // Initial drawing of connections
            this.updateQubitOpacities(); // Update opacities based on the initial slice

            if (this.onSlicesLoadedCallback) {
                this.onSlicesLoadedCallback(
                    this.slices.length,
                    this.current_slice_index,
                );
            }
            this.refreshLegend(); // Refresh legend after data is loaded
        } catch (error) {
            this.handleLoadError(
                error instanceof Error ? error : new Error(String(error)),
                camera,
                `Failed to load or parse data from ${url}`,
            );
        }
    }

    public onCurrentSliceChange() {
        if (
            this.qubitInstances.size === 0 &&
            (this.slices.length === 0 || this.current_slice_index < 0)
        ) {
            if (this.heatmap) this.heatmap.updatePoints(new Map(), -1, []);
            this.lastCalculatedSlicesChangeIDs = [];
            this.updateQubitOpacities();
            this.drawConnections();
            this.refreshLegend();
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
            if (this.qubitInstances.size > 0 && this.slices) {
                const heatmapUpdateResults = this.heatmap.updatePoints(
                    this.qubitInstances,
                    this.current_slice_index,
                    this.slices,
                );
                this.lastMaxObservedRawHeatmapSum =
                    heatmapUpdateResults.maxObservedRawWeightedSum;
                this.lastEffectiveSlicesForHeatmap =
                    heatmapUpdateResults.numSlicesEffectivelyUsed;
            } else {
                this.heatmap.updatePoints(new Map(), -1, []);
                this.lastMaxObservedRawHeatmapSum = 0;
                this.lastEffectiveSlicesForHeatmap = 0;
            }
        }
        this.updateQubitOpacities();
        this.drawConnections();
        this.refreshLegend();
    }

    private updateQubitOpacities() {
        const currentSlicesChangeData = this.lastCalculatedSlicesChangeIDs;
        this.qubitInstances.forEach((qubit, qubitId) => {
            if (qubit.blochSphere) {
                const intensity = this.getQubitInteractionIntensity(
                    qubitId,
                    currentSlicesChangeData,
                );
                if (intensity <= 0.001) {
                    qubit.blochSphere.setOpacity(
                        this.currentInactiveElementAlpha,
                    );
                } else {
                    qubit.blochSphere.setOpacity(1.0);
                }
            }
        });
    }

    loadStateFromSlice(sliceIndex: number): void {
        if (sliceIndex >= 0 && sliceIndex < this.slices.length)
            this.current_slice_index = sliceIndex;
        else if (this.slices.length > 0) this.current_slice_index = 0;
        else this.current_slice_index = -1;

        const currentSliceData = this.current_slice_data;

        this.qubitInstances.forEach((qubit, id) => {
            let targetState: State;
            if (
                currentSliceData &&
                currentSliceData.interacting_qubits.has(id)
            ) {
                targetState = State.ONE;
            } else {
                targetState = State.ZERO;
            }
            qubit.state = targetState;
        });

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
        this.updateQubitOpacities();
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
                cylinder.material.dispose();
        }
    }

    drawConnections() {
        this.clearConnectionCylinders(); // Always clear previous connections

        const yAxis = new THREE.Vector3(0, 1, 0); // Define yAxis for cylinder orientation

        if (this.visualizationMode === "logical") {
            // In logical mode, draw connections for active 2-qubit gates in the current slice.
            if (
                this.current_slice_index >= 0 &&
                this.current_slice_index < this.interactionPairsPerSlice.length
            ) {
                const currentSliceInteractionPairs =
                    this.interactionPairsPerSlice[this.current_slice_index];
                currentSliceInteractionPairs.forEach((pair) => {
                    const posA = this.qubitPositions.get(pair.q1);
                    const posB = this.qubitPositions.get(pair.q2);

                    if (posA && posB) {
                        const distance = posA.distanceTo(posB);
                        if (distance === 0) return;

                        const material = new THREE.ShaderMaterial({
                            vertexShader: CYLINDER_VERTEX_SHADER,
                            fragmentShader: CYLINDER_FRAGMENT_SHADER,
                            uniforms: {
                                uIntensity: { value: 0.5 }, // Bright yellow for active logical gate
                                uInactiveAlpha: { value: 1.0 }, // Opaque
                            },
                            transparent: true, // Should be true if alpha can be < 1, though here it's fixed
                        });

                        const cylinderGeo = new THREE.CylinderGeometry(
                            this.currentConnectionThickness,
                            this.currentConnectionThickness,
                            distance,
                            8, // segmentsRadial
                            1, // segmentsHeight
                        );
                        const cylinderMesh = new THREE.Mesh(
                            cylinderGeo,
                            material,
                        );
                        cylinderMesh.position
                            .copy(posA)
                            .add(posB)
                            .multiplyScalar(0.5);
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
                });
            }
            return;
        }

        // Proceed to draw connections based on couplingMap for compiled mode (existing logic)
        if (
            !this.couplingMap ||
            this.couplingMap.length === 0 ||
            !this.qubitPositions ||
            this.qubitPositions.size === 0 ||
            !this.interactionPairsPerSlice
        ) {
            return;
        }

        const weight_base = 1.3;

        const windowEndSlice = this.current_slice_index + 1;
        let windowStartSlice;
        if (this.maxSlicesForHeatmap === -1) {
            windowStartSlice = 0;
        } else {
            windowStartSlice = Math.max(
                0,
                windowEndSlice - this.maxSlicesForHeatmap,
            );
        }
        const numSlicesInWindow = windowEndSlice - windowStartSlice;

        const relevantInteractionPairsForWindow =
            this.interactionPairsPerSlice.slice(
                windowStartSlice,
                windowEndSlice,
            );

        const pairData: Array<{
            idA: number;
            idB: number;
            rawSum: number;
            posA?: THREE.Vector3;
            posB?: THREE.Vector3;
        }> = [];

        // 1. Calculate all raw weighted sums for pairs
        for (const pair of this.couplingMap) {
            if (pair.length === 2) {
                const qubitIdA = pair[0];
                const qubitIdB = pair[1];
                const posA = this.qubitPositions.get(qubitIdA);
                const posB = this.qubitPositions.get(qubitIdB);

                if (!posA || !posB || posA.distanceTo(posB) === 0) {
                    pairData.push({ idA: qubitIdA, idB: qubitIdB, rawSum: 0 });
                    continue;
                }

                let currentPairWeightedSum = 0;
                if (
                    numSlicesInWindow > 0 &&
                    relevantInteractionPairsForWindow.length ===
                        numSlicesInWindow
                ) {
                    for (let i = 0; i < numSlicesInWindow; i++) {
                        const sliceInteractionPairs =
                            relevantInteractionPairsForWindow[i];
                        for (const interaction of sliceInteractionPairs) {
                            if (
                                (interaction.q1 === qubitIdA &&
                                    interaction.q2 === qubitIdB) ||
                                (interaction.q1 === qubitIdB &&
                                    interaction.q2 === qubitIdA)
                            ) {
                                currentPairWeightedSum += Math.pow(
                                    weight_base,
                                    i,
                                );
                                break;
                            }
                        }
                    }
                } else if (
                    this.maxSlicesForHeatmap === 0 &&
                    this.current_slice_index >= 0 &&
                    this.current_slice_index <
                        this.interactionPairsPerSlice.length
                ) {
                    const currentSlicePairs =
                        this.interactionPairsPerSlice[this.current_slice_index];
                    for (const interaction of currentSlicePairs) {
                        if (
                            (interaction.q1 === qubitIdA &&
                                interaction.q2 === qubitIdB) ||
                            (interaction.q1 === qubitIdB &&
                                interaction.q2 === qubitIdA)
                        ) {
                            currentPairWeightedSum = 1.0; // Special case: full intensity if active in current slice and 0 history window
                            break;
                        }
                    }
                }
                pairData.push({
                    idA: qubitIdA,
                    idB: qubitIdB,
                    rawSum: currentPairWeightedSum,
                    posA,
                    posB,
                });
            }
        }

        // 2. Find max observed raw pair sum
        const maxObservedRawPairSum = Math.max(
            ...pairData.map((p) => p.rawSum),
            0,
        );

        // 3. Create meshes with normalized intensity
        for (const data of pairData) {
            if (!data.posA || !data.posB) continue;

            const distance = data.posA.distanceTo(data.posB);
            if (distance === 0) continue;

            let calculatedNormalizedIntensity = 0;
            if (maxObservedRawPairSum > 0) {
                calculatedNormalizedIntensity =
                    data.rawSum / maxObservedRawPairSum;
            } else if (this.maxSlicesForHeatmap === 0 && data.rawSum === 1.0) {
                calculatedNormalizedIntensity = 1.0;
            }

            let finalConnectionIntensity = calculatedNormalizedIntensity;
            if (data.rawSum > 0.0001) {
                finalConnectionIntensity = Math.max(
                    calculatedNormalizedIntensity,
                    0.002,
                );
            } else {
                finalConnectionIntensity = 0;
            }

            const material = new THREE.ShaderMaterial({
                vertexShader: CYLINDER_VERTEX_SHADER,
                fragmentShader: CYLINDER_FRAGMENT_SHADER,
                uniforms: {
                    uIntensity: { value: finalConnectionIntensity },
                    uInactiveAlpha: { value: this.currentInactiveElementAlpha },
                },
                transparent: true,
            });

            const cylinderGeo = new THREE.CylinderGeometry(
                this.currentConnectionThickness,
                this.currentConnectionThickness,
                distance,
                8,
                1,
            );
            const cylinderMesh = new THREE.Mesh(cylinderGeo, material);
            cylinderMesh.position
                .copy(data.posA)
                .add(data.posB)
                .multiplyScalar(0.5);
            const direction = new THREE.Vector3()
                .subVectors(data.posB, data.posA)
                .normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
                yAxis,
                direction,
            );
            cylinderMesh.quaternion.copy(quaternion);
            this.connectionLines.add(cylinderMesh);
        }
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
        if (
            slicesToConsider.length === 0 &&
            this.qubitInstances.has(qubitId) &&
            this.maxSlicesForHeatmap > 0
        )
            return 0;
        if (slicesToConsider.length === 0 && this.maxSlicesForHeatmap === 0)
            return 0;
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
        const layoutAreaSide = Math.max(
            5,
            Math.sqrt(this._qubit_count) * 2.5 * (this.idealDist / 5),
        );
        this.calculateQubitPositions(
            this._qubit_count,
            this.couplingMap,
            layoutAreaSide,
            layoutAreaSide,
            layoutAreaSide * 0.5,
        );
        this.createGrid();
        if (this.heatmap) this.heatmap.clearPositionsCache();
        this.onCurrentSliceChange();
    }

    public setQubitScale(scale: number): void {
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere) qubit.blochSphere.setScale(scale);
        });
    }

    public setConnectionThickness(thickness: number): void {
        this.currentConnectionThickness = thickness;
        this.drawConnections();
    }

    public setInactiveElementAlpha(alpha: number): void {
        this.currentInactiveElementAlpha = alpha;
        this.updateQubitOpacities();
        this.drawConnections();
    }

    public updateLayoutParameters(params: {
        repelForce?: number;
        idealDistance?: number;
        iterations?: number;
        coolingFactor?: number;
    }) {
        let changed = false;
        if (
            params.repelForce !== undefined &&
            this.kRepel !== params.repelForce
        ) {
            this.kRepel = params.repelForce;
            changed = true;
        }
        if (
            params.idealDistance !== undefined &&
            this.idealDist !== params.idealDistance
        ) {
            this.idealDist = params.idealDistance;
            changed = true;
        }
        if (
            params.iterations !== undefined &&
            this.iterations !== params.iterations
        ) {
            this.iterations = params.iterations;
            changed = true;
        }
        if (
            params.coolingFactor !== undefined &&
            this.coolingFactor !== params.coolingFactor
        ) {
            this.coolingFactor = params.coolingFactor;
            changed = true;
        }

        if (changed) {
            this.recalculateLayoutAndRedraw(
                this.kRepel,
                this.idealDist,
                this.iterations,
                this.coolingFactor,
            );
        }
    }

    public updateAppearanceParameters(params: {
        qubitSize?: number;
        connectionThickness?: number;
        inactiveAlpha?: number;
    }) {
        if (params.qubitSize !== undefined) {
            this.setQubitScale(params.qubitSize);
        }
        if (params.connectionThickness !== undefined) {
            this.setConnectionThickness(params.connectionThickness);
        }
        if (params.inactiveAlpha !== undefined) {
            this.setInactiveElementAlpha(params.inactiveAlpha);
        }
    }

    public setCurrentSlice(sliceIndex: number): void {
        this.loadStateFromSlice(sliceIndex);
    }

    public updateMaxSlicesForHeatmap(newMaxSlices: number): void {
        if (this.maxSlicesForHeatmap === newMaxSlices) return;
        if (newMaxSlices < -1) return;

        this.maxSlicesForHeatmap = newMaxSlices;

        if (this.heatmap) {
            this.heatmap.maxSlices = this.maxSlicesForHeatmap;
        }

        this.onCurrentSliceChange();
    }

    public refreshLegend(): void {
        if (this.heatmapLegend) {
            console.log(
                `QubitGrid.refreshLegend: Updating legend with maxSlicesForHeatmap=${this.maxSlicesForHeatmap}, lastEffectiveSlicesForHeatmap=${this.lastEffectiveSlicesForHeatmap}, lastMaxObservedRawHeatmapSum=${this.lastMaxObservedRawHeatmapSum}`,
            );
            this.heatmapLegend.update(
                this.maxSlicesForHeatmap,
                this.lastEffectiveSlicesForHeatmap,
                this.lastMaxObservedRawHeatmapSum,
            );
        } else {
            console.warn(
                "QubitGrid: refreshLegend called but heatmapLegend not initialized.",
            );
        }
    }

    public dispose(): void {
        console.log("QubitGrid dispose called");
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                this.scene.remove(qubit.blochSphere.blochSphere);
            }
            qubit.dispose();
        });
        this.qubitInstances.clear();

        this.scene.remove(this.connectionLines);
        this.connectionLines.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry?.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach((m) => m.dispose());
                } else {
                    object.material?.dispose();
                }
            }
        });
        while (this.connectionLines.children.length > 0) {
            this.connectionLines.remove(this.connectionLines.children[0]);
        }

        if (this.heatmap && this.heatmap.mesh) {
            this.scene.remove(this.heatmap.mesh);
            this.heatmap.dispose();
        }

        if (this.timeline && typeof this.timeline.dispose === "function") {
            this.timeline.dispose();
        }

        this.qubitPositions.clear();
        this.slices = [];
        console.log("QubitGrid resources cleaned up");
    }
}
