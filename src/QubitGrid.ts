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
    attribute float instanceIntensity;
    varying float vIntensity;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vIntensity = instanceIntensity;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
`;

const CYLINDER_FRAGMENT_SHADER = `
    varying float vIntensity;
    uniform float uInactiveAlpha;
    varying vec3 vNormal;

    void main() {
        vec3 colorValue;
        float alphaValue;

        if (vIntensity <= 0.001) {
            alphaValue = uInactiveAlpha;
            colorValue = vec3(0.5, 0.5, 0.5);
        } else if (vIntensity <= 0.5) {
            alphaValue = 1.0;
            colorValue = vec3(vIntensity * 2.0, 1.0, 0.0);
        } else {
            alphaValue = 1.0;
            colorValue = vec3(1.0, 1.0 - (vIntensity - 0.5) * 2.0, 0.0);
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
    private instancedConnectionMesh: THREE.InstancedMesh | null = null;
    private logicalConnectionMesh: THREE.InstancedMesh | null = null;
    private intensityAttribute: THREE.InstancedBufferAttribute | null = null;
    private qubitPositions: Map<number, THREE.Vector3> = new Map();
    private lastCalculatedSlicesChangeIDs: Array<Set<number>> = [];
    public lastMaxObservedRawHeatmapSum: number = 0;
    public lastEffectiveSlicesForHeatmap: number = 0;
    public lastLayoutCalculationTime: number = 0;

    // Data stores for different views
    private logicalCircuitInfo: LogicalCircuitInfo | null = null;
    private compiledCircuitInfo: CompiledCircuitInfo | null = null;
    private deviceInfo: DeviceInfo | null = null;

    // Active data based on _visualizationMode
    private allOperationsPerSlice: QubitOperation[][] = [];
    private _qubit_count: number; // Number of qubits for the *active* mode (logical/compiled)
    private cumulativeQubitInteractions: number[][] = [];
    private cumulativeWeightedPairInteractions: Map<string, number[]> =
        new Map();
    private _isQubitRenderEnabled: boolean = true;
    private _areBlochSpheresVisible: boolean = false;
    private _areConnectionLinesVisible: boolean = true;
    private slicesProcessedForHeatmap = 0;
    public isFullyLoaded = false;

    public qubitInstances: Map<number, Qubit> = new Map(); // Stores all qubits based on num_qubits_on_device
    private current_slice_index: number = 0;

    // private _grid_rows: number; // Can be derived or less relevant if layout is force-directed
    // private _grid_cols: number; // Can be derived

    private kRepel: number;
    private idealDist: number;
    private iterations: number;
    private coolingFactor: number;
    private kAttract: number = 0.05;
    private barnesHutTheta: number = 0.8;

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
    private _visualizationMode: "compiled" | "logical";

    private layoutWorker: Worker;
    private layoutAreaSide: number = 0;
    private currentLOD: "high" | "medium" | "low" = "high";

    // Getter for the number of slices in the currently active mode
    public getActiveSliceCount(): number {
        return this.slices ? this.slices.length : 0;
    }

    // Getter for the current slice index in the currently active mode
    public getActiveCurrentSliceIndex(): number {
        return this.current_slice_index;
    }

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
        datasetNameOrData: string | object,
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
        this.current_slice_index = -1;

        this.kRepel = initialKRepel;
        this.idealDist = initialIdealDist;
        this.iterations = initialIterations;
        this.coolingFactor = initialCoolingFactor;
        this.currentConnectionThickness = initialConnectionThickness;
        this.currentInactiveElementAlpha = initialInactiveElementAlpha;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;

        this.layoutWorker = new Worker(
            new URL("./layoutWorker.ts", import.meta.url),
            { type: "module" },
        );

        this.camera = camera;
        this._visualizationMode = visualizationMode;

        this.timeline = new Timeline((sliceIndex) =>
            this.loadStateFromSlice(sliceIndex),
        );

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

        if (typeof datasetNameOrData === "string") {
            const dataUrl = datasetNameOrData.endsWith(".json")
                ? `/quvis/${datasetNameOrData}`
                : `/quvis/${datasetNameOrData}_viz_data.json`;
            this.loadSlicesFromJSON(dataUrl, camera);
        } else if (datasetNameOrData && typeof datasetNameOrData === "object") {
            if (
                "logical_circuit_info" in datasetNameOrData ||
                "compiled_circuit_info" in datasetNameOrData
            ) {
                this._processCircuitData(
                    datasetNameOrData as QFTVizData,
                    camera,
                );
            } else {
                console.error(
                    "Invalid custom data object passed to QubitGrid constructor:",
                    datasetNameOrData,
                );
                this.handleLoadError(
                    new Error("Invalid custom data object"),
                    camera,
                    "Invalid custom data format",
                );
            }
        } else {
            console.error(
                "Invalid datasetNameOrData provided to QubitGrid constructor:",
                datasetNameOrData,
            );
            this.handleLoadError(
                new Error("No dataset provided"),
                camera,
                "No dataset provided",
            );
        }
    }

    private initializeInstancedConnections(maxConnections: number) {
        this.clearInstancedConnections();

        if (maxConnections === 0) return;

        const cylinderGeo = new THREE.CylinderGeometry(
            1, // The radius will be set by the instance matrix
            1,
            1, // The height (distance) will be set by the instance matrix
            8,
            1,
        );

        const material = new THREE.ShaderMaterial({
            vertexShader: CYLINDER_VERTEX_SHADER,
            fragmentShader: CYLINDER_FRAGMENT_SHADER,
            uniforms: {
                uInactiveAlpha: { value: this.currentInactiveElementAlpha },
            },
            transparent: true,
        });

        this.instancedConnectionMesh = new THREE.InstancedMesh(
            cylinderGeo,
            material,
            maxConnections,
        );
        this.instancedConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage,
        );
        this.intensityAttribute = new THREE.InstancedBufferAttribute(
            new Float32Array(maxConnections),
            1,
        );
        this.instancedConnectionMesh.geometry.setAttribute(
            "instanceIntensity",
            this.intensityAttribute,
        );
        this.scene.add(this.instancedConnectionMesh);
    }

    private initializeLogicalInstancedConnections(maxConnections: number) {
        if (this.logicalConnectionMesh) {
            this.scene.remove(this.logicalConnectionMesh);
            this.logicalConnectionMesh.geometry.dispose();
            (this.logicalConnectionMesh.material as THREE.Material).dispose();
            this.logicalConnectionMesh = null;
        }

        if (maxConnections === 0) return;

        const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.75,
        });

        this.logicalConnectionMesh = new THREE.InstancedMesh(
            cylinderGeo,
            material,
            maxConnections,
        );
        this.logicalConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage,
        );
        this.scene.add(this.logicalConnectionMesh);
    }

    private clearInstancedConnections() {
        if (this.instancedConnectionMesh) {
            this.scene.remove(this.instancedConnectionMesh);
            this.instancedConnectionMesh.geometry.dispose();
            (
                this.instancedConnectionMesh.material as THREE.ShaderMaterial
            ).dispose();
            this.instancedConnectionMesh = null;
        }
    }

    private handleLoadError(
        error: Error,
        camera: THREE.PerspectiveCamera,
        message: string = "Error loading data",
    ) {
        console.error(message, error);
        this.logicalCircuitInfo = null;
        this.compiledCircuitInfo = null;
        this.deviceInfo = null;

        this.allOperationsPerSlice = [];
        this.slices = [];
        this.interactionPairsPerSlice = [];

        const mockDeviceQubits = 9;
        this._qubit_count = mockDeviceQubits;
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
        this.recalculateLayoutAndRedraw(
            this.kRepel,
            this.idealDist,
            this.iterations,
            this.coolingFactor,
            () => {
                this.createGrid(mockDeviceQubits);
                const errorSlice = new Slice(0);
                errorSlice.interacting_qubits = new Set();
                this.slices = [errorSlice];
                this.timeline.setSliceCount(1);
                this.loadStateFromSlice(0);
                if (this.couplingMap) {
                    this.initializeInstancedConnections(
                        this.couplingMap.length,
                    );
                }
                this.onSlicesLoadedCallback?.(
                    this.slices.length,
                    this.current_slice_index,
                );
            },
        );
    }

    async loadSlicesFromJSON(url: string, camera: THREE.PerspectiveCamera) {
        try {
            console.log(`Fetching data from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData: QFTVizData = await response.json();
            console.log("Successfully fetched and parsed JSON data from URL.");
            this._processCircuitData(jsonData, camera);
        } catch (error) {
            console.error(
                "Failed to load or parse slices from JSON URL:",
                error,
            );
            this.handleLoadError(
                error instanceof Error ? error : new Error(String(error)),
                camera,
                `Failed to load data from ${url}`,
            );
        }
    }

    private _processCircuitData(
        data: QFTVizData,
        camera: THREE.PerspectiveCamera,
    ) {
        this.slices = [];
        this.interactionPairsPerSlice = [];
        this.allOperationsPerSlice = [];
        this.qubitInstances.forEach((qubit) => qubit.dispose());
        this.qubitInstances.clear();
        if (this.heatmap) {
            this.heatmap.clearPositionsCache();
        }
        this.lastMaxObservedRawHeatmapSum = 0;
        this.lastEffectiveSlicesForHeatmap = 0;

        try {
            console.log("Processing raw QFTVizData:", data);

            this.logicalCircuitInfo = data.logical_circuit_info || null;
            this.compiledCircuitInfo = data.compiled_circuit_info || null;
            this.deviceInfo = data.device_info || null;

            if (
                !this.deviceInfo ||
                this.deviceInfo.num_qubits_on_device === undefined
            ) {
                throw new Error(
                    "Device info or num_qubits_on_device is missing.",
                );
            }

            this.couplingMap =
                this.deviceInfo.connectivity_graph_coupling_map || null;

            if (this.couplingMap) {
                this.initializeInstancedConnections(this.couplingMap.length);
            }

            this.switchToMode(this._visualizationMode, true, camera);
        } catch (error) {
            this.handleLoadError(
                error instanceof Error ? error : new Error(String(error)),
                camera,
                "Failed to process circuit data.",
            );
        }
    }

    private switchToMode(
        mode: "compiled" | "logical",
        isInitialSetup: boolean,
        camera?: THREE.PerspectiveCamera,
    ) {
        console.log(
            `Switching to mode: ${mode}, Initial setup: ${isInitialSetup}`,
        );
        this._visualizationMode = mode;

        let selectedCircuitInfo:
            | LogicalCircuitInfo
            | CompiledCircuitInfo
            | null = null;
        let newQubitCount = 0;

        if (mode === "logical" && this.logicalCircuitInfo) {
            selectedCircuitInfo = this.logicalCircuitInfo;
            newQubitCount = this.logicalCircuitInfo.num_qubits;
            this.allOperationsPerSlice =
                this.logicalCircuitInfo.interaction_graph_ops_per_slice || [];

            let maxLogicalConnections = 0;
            if (this.allOperationsPerSlice) {
                this.allOperationsPerSlice.forEach((ops_in_slice) => {
                    const twoQubitOps = ops_in_slice.filter(
                        (op) => op.qubits.length === 2,
                    ).length;
                    if (twoQubitOps > maxLogicalConnections) {
                        maxLogicalConnections = twoQubitOps;
                    }
                });
            }
            this.initializeLogicalInstancedConnections(maxLogicalConnections);
        } else if (mode === "compiled" && this.compiledCircuitInfo) {
            //eslint-disable-next-line @typescript-eslint/no-unused-vars
            selectedCircuitInfo = this.compiledCircuitInfo;
            newQubitCount = this.compiledCircuitInfo.num_qubits;
            this.allOperationsPerSlice =
                this.compiledCircuitInfo
                    .compiled_interaction_graph_ops_per_slice || [];
        } else {
            console.warn(
                `Data for mode ${mode} is not available. Defaulting to 0 qubits and no operations.`,
            );
            this.allOperationsPerSlice = [];
            newQubitCount = 0;
        }

        const previousQubitCount = this._qubit_count;
        this._qubit_count = newQubitCount;

        this.interactionPairsPerSlice = [];

        // Initialize cumulative interactions array - will be filled by background process
        this.cumulativeQubitInteractions = [];
        this.cumulativeWeightedPairInteractions = new Map();

        this.slices = this.allOperationsPerSlice.map(
            (ops_in_slice, sliceIdx) => {
                const slice = new Slice(sliceIdx);
                const currentSlicePairs: Array<{ q1: number; q2: number }> = [];
                ops_in_slice.forEach((op) => {
                    op.qubits.forEach((qid) =>
                        slice.interacting_qubits.add(qid),
                    );
                    if (op.qubits.length === 2) {
                        currentSlicePairs.push({
                            q1: op.qubits[0],
                            q2: op.qubits[1],
                        });
                    }
                });
                this.interactionPairsPerSlice.push(currentSlicePairs);

                return slice;
            },
        );

        this.calculateCumulativeDataInBackground();

        if (this.slices.length > 0) {
            if (
                this.current_slice_index < 0 ||
                this.current_slice_index >= this.slices.length
            ) {
                this.current_slice_index = 0;
            }
            this.timeline.setSliceCount(this.slices.length);
            this.timeline.setSlice(this.current_slice_index);
        } else {
            this.current_slice_index = -1;
            this.timeline.setSliceCount(0);
        }

        if (isInitialSetup) {
            if (!this.deviceInfo || camera === undefined) {
                console.error(
                    "Device info or camera missing for initial setup in switchToMode.",
                );
                return;
            }
            const numDeviceQubits = this.deviceInfo.num_qubits_on_device;

            this.calculateGridLayoutPositions(numDeviceQubits);
            this.lastLayoutCalculationTime = 0; // Grid layout is instantaneous

            if (this.heatmap) {
                this.heatmap.generateClusters(
                    this.qubitPositions,
                    numDeviceQubits,
                );
            }

            this.createGrid(numDeviceQubits);

            if (this.heatmap && this.heatmap.mesh)
                this.scene.remove(this.heatmap.mesh);
            if (this.heatmap) this.heatmap.dispose();
            this.heatmap = new Heatmap(
                camera,
                this._qubit_count,
                this.maxSlicesForHeatmap,
            );
            this.scene.add(this.heatmap.mesh);

            if (this.onSlicesLoadedCallback) {
                this.onSlicesLoadedCallback(
                    this.slices.length,
                    this.current_slice_index,
                );
            }
            this.onCurrentSliceChange();
        } else {
            if (previousQubitCount !== this._qubit_count && camera) {
                if (this.heatmap && this.heatmap.mesh)
                    this.scene.remove(this.heatmap.mesh);
                if (this.heatmap) this.heatmap.dispose();
                this.heatmap = new Heatmap(
                    camera,
                    this._qubit_count,
                    this.maxSlicesForHeatmap,
                );
                this.scene.add(this.heatmap.mesh);
                if (this.heatmap) this.heatmap.clearPositionsCache();
            }
        }

        this.onCurrentSliceChange();
        if (this.couplingMap) {
            this.initializeInstancedConnections(this.couplingMap.length);
            this.drawConnections();
        }
    }

    private calculateGridLayoutPositions(numQubits: number) {
        if (numQubits === 0) {
            this.qubitPositions.clear();
            return;
        }

        const cols = Math.ceil(Math.sqrt(numQubits));
        const rows = Math.ceil(numQubits / cols);

        const gridWidth = (cols - 1) * this.idealDist;
        const gridHeight = (rows - 1) * this.idealDist;
        const startX = -gridWidth / 2;
        const startY = gridHeight / 2;

        this.qubitPositions.clear();
        for (let i = 0; i < numQubits; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * this.idealDist;
            const y = startY - row * this.idealDist;
            this.qubitPositions.set(i, new THREE.Vector3(x, y, 0));
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

        const lastLoadedSlice = this.slicesProcessedForHeatmap - 1;
        const effectiveSliceIndex = Math.min(
            this.current_slice_index,
            lastLoadedSlice,
        );

        if (this.heatmap) {
            if (this.qubitPositions.size > 0 && this.slices) {
                const heatmapUpdateResults = this.heatmap.updatePoints(
                    this.qubitPositions,
                    effectiveSliceIndex,
                    this.cumulativeQubitInteractions,
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

    createGrid(numQubitsToCreate: number) {
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere)
                this.scene.remove(qubit.blochSphere.blochSphere);
            qubit.dispose();
        });
        this.qubitInstances.clear();

        this._isQubitRenderEnabled = numQubitsToCreate <= 1000;
        if (!this._isQubitRenderEnabled) {
            console.warn(
                `Device has ${numQubitsToCreate} qubits. Not rendering qubit spheres to maintain performance.`,
            );
        }

        for (let i = 0; i < numQubitsToCreate; i++) {
            const pos =
                this.qubitPositions.get(i) || new THREE.Vector3(0, 0, 0);
            this.createQubit(i, pos.x, pos.y, pos.z);
        }
        this.updateQubitOpacities();
    }

    createQubit(id: number) {
        // Don't create BlochSphere here anymore. Do it lazily.
        const qubit = new Qubit(id, State.ZERO, null);
        this.qubitInstances.set(id, qubit);
        // UserData is now set on the BlochSphere group when it's created,
        // so we don't need to handle it here.
    }

    drawConnections() {
        const yAxis = new THREE.Vector3(0, 1, 0);

        if (!this._areConnectionLinesVisible) {
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
            }
            if (this.logicalConnectionMesh) {
                this.logicalConnectionMesh.count = 0;
            }
            return;
        }

        if (this._visualizationMode === "logical") {
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
                this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
            }

            if (
                this.logicalConnectionMesh &&
                this.logicalConnectionMesh.visible
            ) {
                let instanceCount = 0;
                if (
                    this.current_slice_index >= 0 &&
                    this.current_slice_index <
                        this.interactionPairsPerSlice.length
                ) {
                    const currentSliceInteractionPairs =
                        this.interactionPairsPerSlice[this.current_slice_index];

                    const matrix = new THREE.Matrix4();
                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    const direction = new THREE.Vector3();

                    currentSliceInteractionPairs.forEach((pair) => {
                        const posA = this.qubitPositions.get(pair.q1);
                        const posB = this.qubitPositions.get(pair.q2);

                        if (posA && posB) {
                            const distance = posA.distanceTo(posB);
                            if (distance > 0) {
                                position
                                    .copy(posA)
                                    .add(posB)
                                    .multiplyScalar(0.5);
                                direction.subVectors(posB, posA).normalize();
                                quaternion.setFromUnitVectors(yAxis, direction);
                                scale.set(
                                    this.currentConnectionThickness * 0.8,
                                    distance,
                                    this.currentConnectionThickness * 0.8,
                                );
                                matrix.compose(position, quaternion, scale);
                                this.logicalConnectionMesh!.setMatrixAt(
                                    instanceCount,
                                    matrix,
                                );
                                instanceCount++;
                            }
                        }
                    });
                }
                this.logicalConnectionMesh.count = instanceCount;
                this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
            } else if (this.logicalConnectionMesh) {
                this.logicalConnectionMesh.count = 0;
                this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        // Compiled mode
        if (this.logicalConnectionMesh) {
            this.logicalConnectionMesh.count = 0;
            this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
        }

        if (
            !this.couplingMap ||
            !this.instancedConnectionMesh ||
            !this.instancedConnectionMesh.visible ||
            this.couplingMap.length === 0 ||
            !this.qubitPositions ||
            this.qubitPositions.size === 0 ||
            !this.interactionPairsPerSlice
        ) {
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
                this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        const lastLoadedSlice = this.slicesProcessedForHeatmap - 1;
        const effectiveSliceIndex = Math.min(
            this.current_slice_index,
            lastLoadedSlice,
        );

        const weight_base = this.heatmapWeightBase;

        const windowEndSlice = effectiveSliceIndex + 1;
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

        const pairData: Array<{
            idA: number;
            idB: number;
            rawSum: number;
            posA?: THREE.Vector3;
            posB?: THREE.Vector3;
        }> = [];

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

                const q1 = Math.min(qubitIdA, qubitIdB);
                const q2 = Math.max(qubitIdA, qubitIdB);
                const key = `${q1}-${q2}`;

                let currentPairWeightedSum = 0;
                if (
                    numSlicesInWindow > 0 &&
                    this.cumulativeWeightedPairInteractions.has(key)
                ) {
                    const scaledCumulativeWeights =
                        this.cumulativeWeightedPairInteractions.get(key)!;

                    const C = windowEndSlice - 1;

                    if (C >= 0 && C < scaledCumulativeWeights.length) {
                        const S_prime_C = scaledCumulativeWeights[C];
                        const S_prime_Start_minus_1 =
                            windowStartSlice > 0
                                ? scaledCumulativeWeights[windowStartSlice - 1]
                                : 0;
                        const numSlicesInWindow = C - windowStartSlice + 1;
                        if (numSlicesInWindow > 0) {
                            currentPairWeightedSum =
                                S_prime_C -
                                S_prime_Start_minus_1 *
                                    Math.pow(weight_base, -numSlicesInWindow);
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

        const maxObservedRawPairSum = Math.max(
            ...pairData.map((p) => p.rawSum),
            0,
        );

        let instanceCount = 0;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const direction = new THREE.Vector3();

        if (!this.intensityAttribute) return;

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

            position.copy(data.posA).add(data.posB).multiplyScalar(0.5);
            direction.subVectors(data.posB, data.posA).normalize();
            quaternion.setFromUnitVectors(yAxis, direction);
            scale.set(
                this.currentConnectionThickness,
                distance,
                this.currentConnectionThickness,
            );
            matrix.compose(position, quaternion, scale);
            this.instancedConnectionMesh.setMatrixAt(instanceCount, matrix);

            this.intensityAttribute.setX(
                instanceCount,
                finalConnectionIntensity,
            );

            instanceCount++;
        }

        (
            this.instancedConnectionMesh.material as THREE.ShaderMaterial
        ).uniforms.uInactiveAlpha.value = this.currentInactiveElementAlpha;

        this.instancedConnectionMesh.count = instanceCount;
        this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
        this.intensityAttribute.needsUpdate = true;
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

    private calculateCumulativeDataInBackground() {
        const totalSlices = this.allOperationsPerSlice.length;
        if (totalSlices === 0) {
            this.isFullyLoaded = true;
            return;
        }

        // Initialize data structures with empty inner arrays to be grown dynamically
        this.cumulativeQubitInteractions = new Array(this._qubit_count)
            .fill(0)
            .map(() => []);
        this.cumulativeWeightedPairInteractions = new Map<string, number[]>();
        if (this.couplingMap) {
            for (const pair of this.couplingMap) {
                const q1 = Math.min(pair[0], pair[1]);
                const q2 = Math.max(pair[0], pair[1]);
                const key = `${q1}-${q2}`;
                // Initialize with empty arrays
                this.cumulativeWeightedPairInteractions.set(key, []);
            }
        }

        const chunkSize = 500; // Process 500 slices at a time
        let startIndex = 0;

        const processChunk = () => {
            const endIndex = Math.min(startIndex + chunkSize, totalSlices);

            // Process cumulativeQubitInteractions for the chunk
            for (let i = startIndex; i < endIndex; i++) {
                const slice = this.slices[i];
                for (let qid = 0; qid < this._qubit_count; qid++) {
                    const hadInteraction = slice.interacting_qubits.has(qid)
                        ? 1
                        : 0;
                    const prevSum =
                        i === 0
                            ? 0
                            : this.cumulativeQubitInteractions[qid][i - 1];
                    this.cumulativeQubitInteractions[qid].push(
                        prevSum + hadInteraction,
                    );
                }
            }

            // Process cumulativeWeightedPairInteractions for the chunk
            if (this.couplingMap) {
                const weight_base = this.heatmapWeightBase;
                for (const pair of this.couplingMap) {
                    const q1 = Math.min(pair[0], pair[1]);
                    const q2 = Math.max(pair[0], pair[1]);
                    const key = `${q1}-${q2}`;
                    const scaledCumulativeWeights =
                        this.cumulativeWeightedPairInteractions.get(key)!;

                    for (let i = startIndex; i < endIndex; i++) {
                        const sliceInteractionPairs =
                            this.interactionPairsPerSlice[i];
                        let hadInteraction = 0;
                        for (const interaction of sliceInteractionPairs) {
                            if (
                                (interaction.q1 === q1 &&
                                    interaction.q2 === q2) ||
                                (interaction.q1 === q2 && interaction.q2 === q1)
                            ) {
                                hadInteraction = 1;
                                break;
                            }
                        }
                        const prevScaledSum =
                            i === 0 ? 0 : scaledCumulativeWeights[i - 1];
                        scaledCumulativeWeights.push(
                            prevScaledSum / weight_base + hadInteraction,
                        );
                    }
                }
            }

            this.slicesProcessedForHeatmap = endIndex;

            // If user is viewing a slice that just got processed, refresh the view
            if (this.current_slice_index < this.slicesProcessedForHeatmap) {
                this.onCurrentSliceChange();
            }

            startIndex = endIndex;
            if (startIndex < totalSlices) {
                setTimeout(processChunk, 0); // Yield to main thread
            } else {
                console.log("Fully loaded all slice data in background.");
                this.isFullyLoaded = true;
            }
        };

        setTimeout(processChunk, 0);
    }

    public recalculateLayoutAndRedraw(
        newKRepel: number,
        newIdealDist: number,
        newIterations: number,
        newCoolingFactor: number,
        onLayoutCalculated: () => void,
    ) {
        this.kRepel = newKRepel;
        this.idealDist = newIdealDist;
        this.iterations = newIterations;
        this.coolingFactor = newCoolingFactor;

        if (!this.deviceInfo || this.deviceInfo.num_qubits_on_device === 0) {
            this.qubitPositions.clear();
            onLayoutCalculated();
            return;
        }

        const numDeviceQubits = this.deviceInfo.num_qubits_on_device;
        this.qubitPositions.clear();
        this.layoutAreaSide = Math.max(
            5,
            Math.sqrt(numDeviceQubits) * 2.5 * (this.idealDist / 5),
        );

        const startTime = performance.now();
        this.layoutWorker.onmessage = (event) => {
            this.lastLayoutCalculationTime = performance.now() - startTime;
            const { qubitPositions } = event.data;
            this.qubitPositions = new Map(
                qubitPositions.map(
                    ([id, pos]: [
                        number,
                        { x: number; y: number; z: number },
                    ]) => {
                        return [id, new THREE.Vector3(pos.x, pos.y, pos.z)];
                    },
                ),
            );
            if (this.heatmap) {
                this.heatmap.generateClusters(
                    this.qubitPositions,
                    numDeviceQubits,
                );
            }
            onLayoutCalculated();
        };

        this.layoutWorker.postMessage({
            numDeviceQubits,
            couplingMap: this.couplingMap,
            areaWidth: this.layoutAreaSide,
            areaHeight: this.layoutAreaSide,
            areaDepth: this.layoutAreaSide * 0.5,
            iterations: newIterations,
            coolingFactor: newCoolingFactor,
            kRepel: newKRepel,
            idealDist: newIdealDist,
            kAttract: this.kAttract,
            barnesHutTheta: this.barnesHutTheta,
        });
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

    public updateLayoutParameters(
        params: {
            repelForce?: number;
            idealDistance?: number;
            iterations?: number;
            coolingFactor?: number;
        },
        onLayoutComplete?: () => void,
    ) {
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
                () => {
                    this.createGrid(this.deviceInfo!.num_qubits_on_device);
                    if (this.heatmap) this.heatmap.clearPositionsCache();
                    this.onCurrentSliceChange();
                    if (onLayoutComplete) {
                        onLayoutComplete();
                    }
                },
            );
        } else {
            if (onLayoutComplete) {
                onLayoutComplete();
            }
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

    public getGateCountForQubit(qubitId: number): {
        oneQubitGatesInWindow: number;
        twoQubitGatesInWindow: number;
        totalOneQubitGates: number;
        totalTwoQubitGates: number;
        windowForCountsInWindow: number;
    } {
        let oneQubitGatesInWindow = 0;
        let twoQubitGatesInWindow = 0;
        let totalOneQubitGates = 0;
        let totalTwoQubitGates = 0;

        const windowForCountsInWindow = Math.max(
            0,
            this.lastEffectiveSlicesForHeatmap,
        );

        if (
            this.allOperationsPerSlice.length === 0 ||
            this.current_slice_index < 0
        ) {
            return {
                oneQubitGatesInWindow: 0,
                twoQubitGatesInWindow: 0,
                totalOneQubitGates: 0,
                totalTwoQubitGates: 0,
                windowForCountsInWindow: windowForCountsInWindow,
            };
        }

        let actualSlicesToIterateForWindow = windowForCountsInWindow;
        if (this.maxSlicesForHeatmap === 0 && windowForCountsInWindow === 0) {
            actualSlicesToIterateForWindow = 1;
        }

        const windowStartSliceIndex = Math.max(
            0,
            this.current_slice_index - actualSlicesToIterateForWindow + 1,
        );
        const currentSliceEndIndex = this.current_slice_index;

        for (let i = windowStartSliceIndex; i <= currentSliceEndIndex; i++) {
            if (i >= 0 && i < this.allOperationsPerSlice.length) {
                const sliceOps = this.allOperationsPerSlice[i];
                if (sliceOps) {
                    for (const op of sliceOps) {
                        if (op.qubits.includes(qubitId)) {
                            if (op.qubits.length === 1) {
                                oneQubitGatesInWindow++;
                            } else if (op.qubits.length === 2) {
                                twoQubitGatesInWindow++;
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i <= currentSliceEndIndex; i++) {
            if (i >= 0 && i < this.allOperationsPerSlice.length) {
                const sliceOps = this.allOperationsPerSlice[i];
                if (sliceOps) {
                    for (const op of sliceOps) {
                        if (op.qubits.includes(qubitId)) {
                            if (op.qubits.length === 1) {
                                totalOneQubitGates++;
                            } else if (op.qubits.length === 2) {
                                totalTwoQubitGates++;
                            }
                        }
                    }
                }
            }
        }

        const reportedWindowForInWindowCounts =
            this.maxSlicesForHeatmap === 0 ? 1 : windowForCountsInWindow;

        return {
            oneQubitGatesInWindow,
            twoQubitGatesInWindow,
            totalOneQubitGates,
            totalTwoQubitGates,
            windowForCountsInWindow: reportedWindowForInWindowCounts,
        };
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

        this.clearInstancedConnections();
        if (this.logicalConnectionMesh) {
            this.scene.remove(this.logicalConnectionMesh);
            this.logicalConnectionMesh.geometry.dispose();
            (this.logicalConnectionMesh.material as THREE.Material).dispose();
            this.logicalConnectionMesh = null;
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
        this.allOperationsPerSlice = [];
        console.log("QubitGrid resources cleaned up");
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }) {
        console.log("Fidelity parameters received in QubitGrid:", params);
    }

    public setVisualizationMode(mode: "compiled" | "logical"): void {
        if (this._visualizationMode === mode) {
            return;
        }
        this.switchToMode(mode, false, this.camera);
        console.log(`QubitGrid visualization mode set to: ${mode}`);
    }

    /**
     * Call this method from your animation loop to dynamically adjust level of detail
     * based on camera distance. This improves performance by hiding objects that are
     * too small to be seen clearly.
     *
     * Example usage in your Playground's animate() method:
     *
     * if (this.qubitGrid) {
     *     const distance = this.controls.getDistance();
     *     this.qubitGrid.updateLOD(distance);
     * }
     */
    public updateLOD(cameraDistance: number): void {
        if (this.layoutAreaSide === 0) return;

        let level: "high" | "medium" | "low";
        if (cameraDistance > this.layoutAreaSide * 1.2) {
            level = "low";
        } else if (cameraDistance > this.layoutAreaSide * 0.8) {
            level = "medium";
        } else {
            level = "high";
        }

        if (level !== this.currentLOD) {
            this.setLOD(level);
        }
    }

    private setLOD(level: "high" | "medium" | "low") {
        if (this.currentLOD === level) return;
        this.currentLOD = level;

        Object.values(this.qubitInstances).forEach((qubit) => {
            qubit.setLOD(level);
        });
    }

    public applyGridLayout() {
        if (!this.qubitInstances.size) return;

        const qubits = Array.from(this.qubitInstances.values()).sort(
            (a, b) => a.id - b.id,
        );
        const numQubits = qubits.length;
        const cols = Math.ceil(Math.sqrt(numQubits));
        const rows = Math.ceil(numQubits / cols);

        const gridWidth = (cols - 1) * this.idealDist;
        const gridHeight = (rows - 1) * this.idealDist;
        const startX = -gridWidth / 2;
        const startY = gridHeight / 2;

        qubits.forEach((qubit, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * this.idealDist;
            const y = startY - row * this.idealDist;
            if (qubit.blochSphere) {
                qubit.blochSphere.blochSphere.position.set(x, y, 0);
            }

            // Update stored position for layout algorithms if they are used later
            this.qubitPositions.set(qubit.id, new THREE.Vector3(x, y, 0));
        });

        if (this.heatmap) {
            this.heatmap.generateClusters(
                this.qubitPositions,
                this.qubitInstances.size,
            );
            this.heatmap.clearPositionsCache();
        }

        this.onCurrentSliceChange();
    }

    public updateIdealDistance(distance: number) {
        if (this.idealDist !== distance) {
            this.idealDist = distance;
            this.applyGridLayout(); // Re-apply grid layout with new distance
        }
    }

    public setBlochSpheresVisible(visible: boolean) {
        this._areBlochSpheresVisible = visible;

        if (visible) {
            // Lazy-create Bloch spheres if they don't exist
            this.qubitInstances.forEach((qubit) => {
                if (!qubit.blochSphere) {
                    const pos =
                        this.qubitPositions.get(qubit.id) ||
                        new THREE.Vector3();
                    const blochSphere = new BlochSphere(pos.x, pos.y, pos.z);
                    qubit.blochSphere = blochSphere;
                    this.scene.add(blochSphere.blochSphere);
                }
                qubit.blochSphere.blochSphere.visible = true;
            });
        } else {
            // Just hide them if they exist
            this.qubitInstances.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    qubit.blochSphere.blochSphere.visible = false;
                }
            });
        }
    }

    public setConnectionLinesVisible(visible: boolean) {
        this._areConnectionLinesVisible = visible;
        if (this.instancedConnectionMesh) {
            this.instancedConnectionMesh.visible = visible;
        }
        if (this.logicalConnectionMesh) {
            this.logicalConnectionMesh.visible = visible;
        }
    }
}
