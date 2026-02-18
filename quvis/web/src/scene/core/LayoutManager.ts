import * as THREE from "three";

interface LayoutParameters {
    kRepel: number;
    idealDist: number;
    iterations: number;
    coolingFactor: number;
    kAttract: number;
    barnesHutTheta: number;
    coreDistance: number;
}

export class LayoutManager {
    // Physics Constants
    private static readonly MIN_FORCE_DIST = 0.01;
    private static readonly GRAVITY_THRESHOLD = 0.1;
    private static readonly GRAVITY_STRENGTH = 0.05;

    // Core Layout Constants
    private static readonly CORE_ITERATIONS = 200;
    private static readonly CORE_REPEL_FACTOR = 0.5;
    private static readonly CORE_ATTRACT_FACTOR = 0.5;
    private static readonly CORE_COOLING_FACTOR = 0.9;

    // Intra-Core Layout Constants
    private static readonly INTRA_CORE_ITERATIONS = 300;
    private static readonly INTRA_CORE_ATTRACT_FACTOR = 0.2;
    private static readonly EXTERNAL_ATTRACTION_STRENGTH = 0.8;
    private static readonly BOUNDARY_ATTRACTION_DIST_FACTOR = 0.5;

    // Area Calculation
    private static readonly LAYOUT_AREA_SCALE = 2.5;
    private static readonly MIN_LAYOUT_AREA = 5;
    private static readonly LAYOUT_DEPTH_FACTOR = 0.5;

    // Default Parameters
    public static readonly DEFAULT_K_REPEL = 0.3;
    public static readonly DEFAULT_IDEAL_DIST = 5.0;
    public static readonly DEFAULT_ITERATIONS = 300;
    public static readonly DEFAULT_COOLING_FACTOR = 0.95;
    public static readonly DEFAULT_K_ATTRACT = 0.1;
    public static readonly DEFAULT_BARNES_HUT_THETA = 0.8;
    public static readonly DEFAULT_CORE_DISTANCE = 5.0;

    private qubitPositions: Map<number, THREE.Vector3> = new Map();
    private layoutWorker: Worker;
    private layoutParams: LayoutParameters;
    private layoutAreaSide: number = 0;
    public lastLayoutCalculationTime: number = 0;

    constructor(
        initialKRepel: number = LayoutManager.DEFAULT_K_REPEL,
        initialIdealDist: number = LayoutManager.DEFAULT_IDEAL_DIST,
        initialIterations: number = LayoutManager.DEFAULT_ITERATIONS,
        initialCoolingFactor: number = LayoutManager.DEFAULT_COOLING_FACTOR,
        initialKAttract: number = LayoutManager.DEFAULT_K_ATTRACT,
        initialBarnesHutTheta: number = LayoutManager.DEFAULT_BARNES_HUT_THETA,
        initialCoreDistance: number = LayoutManager.DEFAULT_CORE_DISTANCE,
    ) {
        this.layoutParams = {
            kRepel: initialKRepel,
            idealDist: initialIdealDist,
            iterations: initialIterations,
            coolingFactor: initialCoolingFactor,
            kAttract: initialKAttract,
            barnesHutTheta: initialBarnesHutTheta,
            coreDistance: initialCoreDistance,
        };

        this.layoutWorker = new Worker(
            new URL("../../data/workers/layoutWorker.ts", import.meta.url),
            { type: "module" },
        );
    }

    get positions(): Map<number, THREE.Vector3> {
        return this.qubitPositions;
    }

    get parameters(): LayoutParameters {
        return { ...this.layoutParams };
    }

    get areaSide(): number {
        return this.layoutAreaSide;
    }

    /**
     * Calculate grid layout positions for qubits
     */
    calculateGridLayout(numQubits: number): void {
        if (numQubits === 0) {
            this.qubitPositions.clear();
            return;
        }

        const cols = Math.ceil(Math.sqrt(numQubits));
        const rows = Math.ceil(numQubits / cols);

        const gridWidth = (cols - 1) * this.layoutParams.idealDist;
        const gridHeight = (rows - 1) * this.layoutParams.idealDist;
        this.layoutAreaSide = Math.max(gridWidth, gridHeight);

        const startX = -gridWidth / 2;
        const startY = gridHeight / 2;

        this.qubitPositions.clear();
        for (let i = 0; i < numQubits; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * this.layoutParams.idealDist;
            const y = startY - row * this.layoutParams.idealDist;
            this.qubitPositions.set(i, new THREE.Vector3(x, y, 0));
        }
    }

    /**
     * Apply grid layout to existing qubits, maintaining their order
     */
    applyGridLayoutToExistingQubits(): void {
        const qubitIds = Array.from(this.qubitPositions.keys()).sort(
            (a, b) => a - b,
        );
        const numQubits = qubitIds.length;

        if (numQubits === 0) return;

        const cols = Math.ceil(Math.sqrt(numQubits));
        const rows = Math.ceil(numQubits / cols);

        const gridWidth = (cols - 1) * this.layoutParams.idealDist;
        const gridHeight = (rows - 1) * this.layoutParams.idealDist;
        const startX = -gridWidth / 2;
        const startY = gridHeight / 2;

        qubitIds.forEach((qubitId, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * this.layoutParams.idealDist;
            const y = startY - row * this.layoutParams.idealDist;
            this.qubitPositions.set(qubitId, new THREE.Vector3(x, y, 0));
        });
    }

    /**
     * Calculate force-directed layout using web worker
     */
    async calculateForceDirectedLayout(
        numDeviceQubits: number,
        couplingMap: number[][] | null,
        onLayoutComplete: (positions: Map<number, THREE.Vector3>) => void,
    ): Promise<void> {
        if (numDeviceQubits === 0) {
            this.qubitPositions.clear();
            onLayoutComplete(this.qubitPositions);
            return;
        }

        this.qubitPositions.clear();
        this.layoutAreaSide = Math.max(
            LayoutManager.MIN_LAYOUT_AREA,
            Math.sqrt(numDeviceQubits) *
            LayoutManager.LAYOUT_AREA_SCALE *
            (this.layoutParams.idealDist / LayoutManager.MIN_LAYOUT_AREA),
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

            onLayoutComplete(this.qubitPositions);
        };

        this.layoutWorker.postMessage({
            numDeviceQubits,
            couplingMap,
            areaWidth: this.layoutAreaSide,
            areaHeight: this.layoutAreaSide,
            areaDepth: this.layoutAreaSide * LayoutManager.LAYOUT_DEPTH_FACTOR,
            iterations: this.layoutParams.iterations,
            coolingFactor: this.layoutParams.coolingFactor,
            kRepel: this.layoutParams.kRepel,
            idealDist: this.layoutParams.idealDist,
            kAttract: this.layoutParams.kAttract,
            barnesHutTheta: this.layoutParams.barnesHutTheta,
        });
    }

    /**
     * Update layout parameters
     */
    updateParameters(params: {
        repelForce?: number;
        idealDistance?: number;
        iterations?: number;
        coolingFactor?: number;
        attractForce?: number;
        coreDistance?: number;
    }): boolean {
        let changed = false;

        if (
            params.repelForce !== undefined &&
            this.layoutParams.kRepel !== params.repelForce
        ) {
            this.layoutParams.kRepel = params.repelForce;
            changed = true;
        }
        if (
            params.idealDistance !== undefined &&
            this.layoutParams.idealDist !== params.idealDistance
        ) {
            this.layoutParams.idealDist = params.idealDistance;
            changed = true;
        }
        if (
            params.iterations !== undefined &&
            this.layoutParams.iterations !== params.iterations
        ) {
            this.layoutParams.iterations = params.iterations;
            changed = true;
        }
        if (
            params.coolingFactor !== undefined &&
            this.layoutParams.coolingFactor !== params.coolingFactor
        ) {
            this.layoutParams.coolingFactor = params.coolingFactor;
            changed = true;
        }
        if (
            params.attractForce !== undefined &&
            this.layoutParams.kAttract !== params.attractForce
        ) {
            this.layoutParams.kAttract = params.attractForce;
            changed = true;
        }
        if (
            params.coreDistance !== undefined &&
            this.layoutParams.coreDistance !== params.coreDistance
        ) {
            this.layoutParams.coreDistance = params.coreDistance;
            changed = true;
        }

        return changed;
    }

    /**
     * Update just the ideal distance and apply grid layout
     */
    updateIdealDistance(distance: number): void {
        if (this.layoutParams.idealDist !== distance) {
            this.layoutParams.idealDist = distance;
            this.applyGridLayoutToExistingQubits();
        }
    }

    getQubitPosition(qubitId: number): THREE.Vector3 | undefined {
        return this.qubitPositions.get(qubitId);
    }

    setQubitPosition(qubitId: number, position: THREE.Vector3): void {
        this.qubitPositions.set(qubitId, position.clone());
    }

    clearPositions(): void {
        this.qubitPositions.clear();
    }

    getQubitIds(): number[] {
        return Array.from(this.qubitPositions.keys());
    }

    hasQubit(qubitId: number): boolean {
        return this.qubitPositions.has(qubitId);
    }

    getQubitCount(): number {
        return this.qubitPositions.size;
    }

    private validateSimulationInput(
        numNodes: number,
        edges: number[][],
        externalAttractions: { nodeIndex: number; targetPosition: THREE.Vector3; strength: number }[]
    ): void {
        for (const edge of edges) {
            if (edge[0] >= numNodes || edge[1] >= numNodes) {
                throw new Error(
                    `Invalid edge in force simulation: [${edge[0]}, ${edge[1]}] for ${numNodes} nodes`
                );
            }
        }
        for (const att of externalAttractions) {
            if (att.nodeIndex >= numNodes) {
                throw new Error(
                    `Invalid external attraction: nodeIndex ${att.nodeIndex} out of bounds for ${numNodes} nodes`
                );
            }
        }
    }

    /**
     * Run a synchronous force-directed simulation for a graph
     */
    private runForceSimulation(
        numNodes: number,
        edges: number[][],
        iterations: number,
        kRepel: number,
        kAttract: number,
        idealDist: number,
        coolingFactor: number,
        externalAttractions: { nodeIndex: number; targetPosition: THREE.Vector3; strength: number }[] = [],
        boundsScale: number = 1.0
    ): THREE.Vector3[] {
        const positions: THREE.Vector3[] = [];
        const forces: THREE.Vector3[] = [];

        // Validate inputs before simulation
        this.validateSimulationInput(numNodes, edges, externalAttractions);

        // Initialize random positions
        for (let i = 0; i < numNodes; i++) {
            positions.push(new THREE.Vector3(
                (Math.random() - 0.5) * idealDist * Math.sqrt(numNodes),
                (Math.random() - 0.5) * idealDist * Math.sqrt(numNodes),
                0
            ));
            forces.push(new THREE.Vector3());
        }

        let temp = idealDist * Math.sqrt(numNodes);

        for (let it = 0; it < iterations; it++) {
            // Reset forces
            for (let i = 0; i < numNodes; i++) {
                forces[i].set(0, 0, 0);
            }

            // Repulsion (Brute force O(N^2))
            for (let i = 0; i < numNodes; i++) {
                for (let j = i + 1; j < numNodes; j++) {
                    const delta = new THREE.Vector3().subVectors(positions[j], positions[i]);
                    let dist = delta.length();
                    if (dist < LayoutManager.MIN_FORCE_DIST) dist = LayoutManager.MIN_FORCE_DIST;

                    const force = delta.normalize().multiplyScalar((kRepel * kRepel) / dist);
                    forces[i].sub(force);
                    forces[j].add(force);
                }
            }

            // Attraction (Internal Edges)
            for (const edge of edges) {
                const u = edge[0];
                const v = edge[1];

                const delta = new THREE.Vector3().subVectors(positions[v], positions[u]);
                let dist = delta.length();
                if (dist < LayoutManager.MIN_FORCE_DIST) dist = LayoutManager.MIN_FORCE_DIST;

                const forceMag = kAttract * (dist - idealDist);
                const forceVec = delta.normalize().multiplyScalar(forceMag);

                forces[u].add(forceVec);
                forces[v].sub(forceVec);
            }

            // External Attraction (Orientation)
            for (const att of externalAttractions) {
                const nodePos = positions[att.nodeIndex];
                const delta = new THREE.Vector3().subVectors(att.targetPosition, nodePos);
                const dist = delta.length();
                // Simple spring force towards target
                const force = delta.normalize().multiplyScalar(dist * att.strength);
                forces[att.nodeIndex].add(force);
            }

            // Central gravity (Keep graph centered)
            for (let i = 0; i < numNodes; i++) {
                const distToCenter = positions[i].length();
                if (distToCenter > LayoutManager.GRAVITY_THRESHOLD) {
                    forces[i].sub(positions[i].clone().normalize().multiplyScalar(distToCenter * LayoutManager.GRAVITY_STRENGTH));
                }
            }

            // Apply forces
            for (let i = 0; i < numNodes; i++) {
                const force = forces[i];
                const mag = force.length();
                if (mag > 0) {
                    // Limit displacement by temperature
                    const displacement = force.normalize().multiplyScalar(Math.min(mag, temp));
                    positions[i].add(displacement);
                }
            }

            temp *= coolingFactor;
        }

        return positions;
    }

    /**
     * Calculate layout for modular architecture
     */
    calculateModularLayout(
        modularInfo: {
            num_cores: number;
            qubits_per_core: number;
            global_topology: string;
            inter_core_links?: number[][];
        },
        coreDistance: number = LayoutManager.DEFAULT_CORE_DISTANCE,
        couplingMap: number[][] | null = null
    ): void {
        const { num_cores, qubits_per_core, global_topology, inter_core_links } = modularInfo;
        const numQubits = num_cores * qubits_per_core;

        if (numQubits === 0) {
            this.qubitPositions.clear();
            return;
        }

        this.qubitPositions.clear();

        // 1. Calculate Core Positions (Inter-Core Layout)
        // Extract core-to-core connectivity
        const coreEdges: number[][] = [];
        const coreConnections = new Set<string>();

        for (const link of inter_core_links) {
            const core1 = Math.floor(link[0] / qubits_per_core);
            const core2 = Math.floor(link[1] / qubits_per_core);

            if (core1 === core2) continue;

            const key = `${Math.min(core1, core2)}-${Math.max(core1, core2)}`;
            if (!coreConnections.has(key)) {
                coreEdges.push([core1, core2]);
                coreConnections.add(key);
            }
        }

        // Run simulation for cores
        const corePositions = this.runForceSimulation(
            num_cores,
            coreEdges,
            LayoutManager.CORE_ITERATIONS, // Iterations
            coreDistance * LayoutManager.CORE_REPEL_FACTOR, // kRepel (adjust for scale)
            LayoutManager.CORE_ATTRACT_FACTOR, // kAttract
            coreDistance, // Ideal distance
            LayoutManager.CORE_COOLING_FACTOR
        );


        // 2. Calculate Intra-Core Layouts
        // We will compute one reference layout if they are all identical, or one per core if coupling differs.
        // Assuming homogeneous cores mostly, but better to be safe and compute per core if coupling map is provided.

        const coreLocalPositions: Map<number, THREE.Vector3[]> = new Map();

        if (couplingMap) {
            // Group connections by core
            const coreInternalEdges: Map<number, number[][]> = new Map();
            for (let c = 0; c < num_cores; c++) coreInternalEdges.set(c, []);

            for (const pair of couplingMap) {
                const core1 = Math.floor(pair[0] / qubits_per_core);
                const core2 = Math.floor(pair[1] / qubits_per_core);
                if (core1 === core2) {
                    const localQ1 = pair[0] % qubits_per_core;
                    const localQ2 = pair[1] % qubits_per_core;
                    coreInternalEdges.get(core1)?.push([localQ1, localQ2]);
                }
            }

            for (let c = 0; c < num_cores; c++) {
                const edges = coreInternalEdges.get(c) || [];

                // Identify external attractions for this core
                const externalAttractions: { nodeIndex: number, targetPosition: THREE.Vector3, strength: number }[] = [];

                // Default center is (0,0,0) relative to core, but we want to attract towards THE OTHER CORE'S position
                // relative to THIS core's position.
                // Relative vector = OtherCorePos - ThisCorePos.
                const thisCorePos = corePositions[c];

                if (inter_core_links) {
                    for (const link of inter_core_links) {
                        const q1 = link[0];
                        const q2 = link[1];

                        // Check if this link involves current core
                        const c1 = Math.floor(q1 / qubits_per_core);
                        const c2 = Math.floor(q2 / qubits_per_core);

                        if (c1 === c && c2 !== c) {
                            // q1 is in this core, connecting to q2 in c2
                            const localIndex = q1 % qubits_per_core;
                            const otherCorePos = corePositions[c2];
                            const direction = new THREE.Vector3().subVectors(otherCorePos, thisCorePos);

                            // We want to attract localIndex towards 'direction' (relative to local origin 0,0)
                            // We can set the target to be some distance along that vector.
                            // Say, edge of the core.
                            const target = direction.normalize().multiplyScalar(this.layoutParams.idealDist * Math.sqrt(qubits_per_core) * LayoutManager.BOUNDARY_ATTRACTION_DIST_FACTOR);

                            externalAttractions.push({
                                nodeIndex: localIndex,
                                targetPosition: target,
                                strength: LayoutManager.EXTERNAL_ATTRACTION_STRENGTH // Strong attraction to orient it
                            });
                        } else if (c2 === c && c1 !== c) {
                            // q2 is in this core, connecting to q1 in c1
                            const localIndex = q2 % qubits_per_core;
                            const otherCorePos = corePositions[c1];
                            const direction = new THREE.Vector3().subVectors(otherCorePos, thisCorePos);
                            const target = direction.normalize().multiplyScalar(this.layoutParams.idealDist * Math.sqrt(qubits_per_core) * LayoutManager.BOUNDARY_ATTRACTION_DIST_FACTOR);

                            externalAttractions.push({
                                nodeIndex: localIndex,
                                targetPosition: target,
                                strength: LayoutManager.EXTERNAL_ATTRACTION_STRENGTH
                            });
                        }
                    }
                }

                const localPos = this.runForceSimulation(
                    qubits_per_core,
                    edges,
                    LayoutManager.INTRA_CORE_ITERATIONS,
                    this.layoutParams.kRepel,
                    LayoutManager.INTRA_CORE_ATTRACT_FACTOR, // Stronger attraction for internal stiffness
                    this.layoutParams.idealDist,
                    this.layoutParams.coolingFactor,
                    externalAttractions
                );
                coreLocalPositions.set(c, localPos);
            }

        } else {
            // Fallback to grid per core
            const coreCols = Math.ceil(Math.sqrt(qubits_per_core));
            const idealDist = this.layoutParams.idealDist;
            const coreWidth = (coreCols - 1) * idealDist;
            const offsets: THREE.Vector3[] = [];
            for (let j = 0; j < qubits_per_core; j++) {
                const col = j % coreCols;
                const row = Math.floor(j / coreCols);
                offsets.push(new THREE.Vector3(
                    col * idealDist - coreWidth / 2,
                    -row * idealDist + coreWidth / 2,
                    0
                ));
            }
            for (let c = 0; c < num_cores; c++) coreLocalPositions.set(c, offsets);
        }

        // 3. Combine Positions
        for (let i = 0; i < num_cores; i++) {
            const corePos = corePositions[i];
            const localPositions = coreLocalPositions.get(i);
            if (!localPositions) {
                throw new Error(`No local positions found for core ${i}`);
            }
            for (let j = 0; j < qubits_per_core; j++) {
                const globalId = i * qubits_per_core + j;
                const finalPos = new THREE.Vector3().copy(corePos).add(localPositions[j]);
                this.qubitPositions.set(globalId, finalPos);
            }
        }

        // Estimate area side
        let maxDim = 0;
        this.qubitPositions.forEach(p => {
            maxDim = Math.max(maxDim, Math.abs(p.x), Math.abs(p.y));
        });
        this.layoutAreaSide = maxDim * LayoutManager.LAYOUT_AREA_SCALE;

    }

    /**
     * Dispose of the layout manager and clean up resources
     */
    dispose(): void {
        if (this.layoutWorker) {
            this.layoutWorker.terminate();
        }
        this.qubitPositions.clear();
    }
}
