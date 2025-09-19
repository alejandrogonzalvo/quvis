import * as THREE from "three";

interface LayoutParameters {
    kRepel: number;
    idealDist: number;
    iterations: number;
    coolingFactor: number;
    kAttract: number;
    barnesHutTheta: number;
}

export class LayoutManager {
    private qubitPositions: Map<number, THREE.Vector3> = new Map();
    private layoutWorker: Worker;
    private layoutParams: LayoutParameters;
    private layoutAreaSide: number = 0;
    public lastLayoutCalculationTime: number = 0;

    constructor(
        initialKRepel: number = 0.3,
        initialIdealDist: number = 5.0,
        initialIterations: number = 300,
        initialCoolingFactor: number = 0.95,
        initialKAttract: number = 0.05,
        initialBarnesHutTheta: number = 0.8,
    ) {
        this.layoutParams = {
            kRepel: initialKRepel,
            idealDist: initialIdealDist,
            iterations: initialIterations,
            coolingFactor: initialCoolingFactor,
            kAttract: initialKAttract,
            barnesHutTheta: initialBarnesHutTheta,
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
     * Calculate heavy hex layout positions for qubits
     * Based on IBM's heavy hex lattice topology
     * Returns the coupling map that matches the heavy hex connectivity
     */
    calculateHeavyHexLayout(numQubits: number): number[][] {
        if (numQubits === 0) {
            this.qubitPositions.clear();
            return [];
        }

        const spacing = this.layoutParams.idealDist;
        const hexRadius = spacing;
        const positions: THREE.Vector3[] = [];

        // Heavy hex pattern: hexagons with qubits on vertices and edges
        // Each hexagon has 12 qubits (6 vertices + 6 edge midpoints)
        const hexHeight = Math.sqrt(3) * hexRadius;
        const hexWidth = 2 * hexRadius;

        // Calculate how many hexagons we need
        const qubitsPerHex = 12;
        const numHexagons = Math.ceil(numQubits / qubitsPerHex);
        const hexCols = Math.ceil(Math.sqrt(numHexagons));
        const hexRows = Math.ceil(numHexagons / hexCols);

        let qubitIndex = 0;

        for (let hexRow = 0; hexRow < hexRows && qubitIndex < numQubits; hexRow++) {
            for (let hexCol = 0; hexCol < hexCols && qubitIndex < numQubits; hexCol++) {
                // Center position of this hexagon
                const hexCenterX = hexCol * hexWidth * 0.75;
                const hexCenterY = hexRow * hexHeight + (hexCol % 2) * (hexHeight / 2);

                // Generate qubits for this hexagon
                // 6 vertices
                for (let vertex = 0; vertex < 6 && qubitIndex < numQubits; vertex++) {
                    const angle = (vertex * Math.PI) / 3;
                    const x = hexCenterX + hexRadius * Math.cos(angle);
                    const y = hexCenterY + hexRadius * Math.sin(angle);
                    positions.push(new THREE.Vector3(x, y, 0));
                    qubitIndex++;
                }

                // 6 edge midpoints (heavy hex characteristic)
                for (let edge = 0; edge < 6 && qubitIndex < numQubits; edge++) {
                    const angle1 = (edge * Math.PI) / 3;
                    const angle2 = ((edge + 1) * Math.PI) / 3;
                    const x = hexCenterX + (hexRadius / 2) * (Math.cos(angle1) + Math.cos(angle2));
                    const y = hexCenterY + (hexRadius / 2) * (Math.sin(angle1) + Math.sin(angle2));
                    positions.push(new THREE.Vector3(x, y, 0));
                    qubitIndex++;
                }
            }
        }

        // Center the entire layout
        if (positions.length > 0) {
            const bounds = this.calculateBounds(positions);
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            this.qubitPositions.clear();
            positions.forEach((pos, index) => {
                this.qubitPositions.set(index, new THREE.Vector3(
                    pos.x - centerX,
                    pos.y - centerY,
                    0
                ));
            });

            this.layoutAreaSide = Math.max(
                bounds.maxX - bounds.minX,
                bounds.maxY - bounds.minY
            );
        }

        // Generate heavy hex coupling map
        return this.generateHeavyHexCouplingMap(numQubits);
    }

    /**
     * Apply heavy hex layout to existing qubits, maintaining their order
     * Returns the coupling map for the heavy hex topology
     */
    applyHeavyHexLayoutToExistingQubits(): number[][] {
        const qubitIds = Array.from(this.qubitPositions.keys()).sort(
            (a, b) => a - b,
        );
        const numQubits = qubitIds.length;

        if (numQubits === 0) return [];

        // Calculate positions and get coupling map
        const couplingMap = this.calculateHeavyHexLayout(numQubits);

        // Map calculated positions to existing qubit IDs
        const positions = Array.from(this.qubitPositions.values());
        qubitIds.forEach((qubitId, index) => {
            if (index < positions.length) {
                this.qubitPositions.set(qubitId, positions[index]);
            }
        });

        return couplingMap;
    }

    /**
     * Calculate bounding box of positions
     */
    private calculateBounds(positions: THREE.Vector3[]): {
        minX: number; maxX: number; minY: number; maxY: number;
    } {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
        });

        return { minX, maxX, minY, maxY };
    }

    /**
     * Generate heavy hex coupling map based on IBM's connectivity pattern
     * IBM heavy hex: each qubit connects to at most 3 neighbors (degree ≤ 3)
     */
    private generateHeavyHexCouplingMap(numQubits: number): number[][] {
        const couplingMap: number[][] = [];

        // Simplified heavy hex for small qubit counts
        // Create a more sparse connectivity pattern that matches IBM's actual heavy hex
        if (numQubits <= 12) {
            // Single hexagon pattern for small circuits
            return this.generateSingleHexagonCoupling(numQubits);
        }

        // For larger circuits, use a tiling approach but keep it sparse
        return this.generateTiledHeavyHexCoupling(numQubits);
    }

    /**
     * Generate coupling for a single hexagon (≤12 qubits)
     */
    private generateSingleHexagonCoupling(numQubits: number): number[][] {
        const couplingMap: number[][] = [];

        if (numQubits <= 6) {
            // Linear chain for very small circuits
            for (let i = 0; i < numQubits - 1; i++) {
                couplingMap.push([i, i + 1]);
            }
        } else {
            // Hexagon pattern: create a ring of connections
            // First 6 qubits form the hexagon vertices
            for (let i = 0; i < Math.min(6, numQubits); i++) {
                const next = (i + 1) % Math.min(6, numQubits);
                if (next !== i && next < numQubits) {
                    couplingMap.push([i, next]);
                }
            }

            // Additional qubits connect to the hexagon
            for (let i = 6; i < numQubits; i++) {
                const connectTo = i % 6; // Connect to corresponding vertex
                if (connectTo < numQubits) {
                    couplingMap.push([i, connectTo]);
                }
            }
        }

        return couplingMap;
    }

    /**
     * Generate coupling for multiple hexagons (>12 qubits)
     * More accurate to IBM's heavy hex topology
     */
    private generateTiledHeavyHexCoupling(numQubits: number): number[][] {
        const couplingMap: number[][] = [];

        // Use a more accurate heavy hex pattern
        // Each hexagon contains 12 qubits, but arranged in a specific pattern
        const qubitsPerHex = 12;
        const numHexagons = Math.ceil(numQubits / qubitsPerHex);

        for (let hexIndex = 0; hexIndex < numHexagons; hexIndex++) {
            const hexStart = hexIndex * qubitsPerHex;
            const hexEnd = Math.min(hexStart + qubitsPerHex, numQubits);
            const qubitsInHex = hexEnd - hexStart;

            // Generate internal hexagon connections
            this.addHexagonInternalConnections(couplingMap, hexStart, qubitsInHex);
        }

        // Add very sparse inter-hexagon connections
        this.addSparseInterHexagonConnections(couplingMap, numQubits, qubitsPerHex, numHexagons);

        return couplingMap;
    }

    /**
     * Add internal connections within a single hexagon
     */
    private addHexagonInternalConnections(couplingMap: number[][], hexStart: number, qubitsInHex: number): void {
        if (qubitsInHex >= 6) {
            // Create hexagon ring for first 6 qubits
            for (let i = 0; i < Math.min(6, qubitsInHex); i++) {
                const next = (i + 1) % Math.min(6, qubitsInHex);
                const q1 = hexStart + i;
                const q2 = hexStart + next;
                if (q1 < hexStart + qubitsInHex && q2 < hexStart + qubitsInHex) {
                    couplingMap.push([q1, q2]);
                }
            }

            // Connect additional qubits (7-12) to the hexagon vertices
            for (let i = 6; i < qubitsInHex; i++) {
                const connectTo = hexStart + ((i - 6) % 6); // Connect to vertex
                if (connectTo < hexStart + Math.min(6, qubitsInHex)) {
                    couplingMap.push([hexStart + i, connectTo]);
                }
            }
        } else {
            // For incomplete hexagons, create a simple chain
            for (let i = 0; i < qubitsInHex - 1; i++) {
                couplingMap.push([hexStart + i, hexStart + i + 1]);
            }
        }
    }

    /**
     * Add very sparse connections between hexagons
     */
    private addSparseInterHexagonConnections(couplingMap: number[][], numQubits: number, qubitsPerHex: number, numHexagons: number): void {
        // Only add inter-hexagon connections for adjacent hexagons in a grid pattern
        const hexCols = Math.ceil(Math.sqrt(numHexagons));

        for (let hexIndex = 0; hexIndex < numHexagons; hexIndex++) {
            const hexRow = Math.floor(hexIndex / hexCols);
            const hexCol = hexIndex % hexCols;
            const hexStart = hexIndex * qubitsPerHex;

            // Connect to right neighbor (if exists and both hexagons have enough qubits)
            if (hexCol < hexCols - 1 && hexIndex + 1 < numHexagons) {
                const rightHexStart = (hexIndex + 1) * qubitsPerHex;
                if (rightHexStart < numQubits) {
                    // Connect edge qubits (vertices 1 and 4 typically connect horizontally)
                    const leftEdge = hexStart + 1;   // vertex 1 of left hex
                    const rightEdge = rightHexStart + 4; // vertex 4 of right hex
                    if (leftEdge < numQubits && rightEdge < numQubits) {
                        couplingMap.push([leftEdge, rightEdge]);
                    }
                }
            }

            // Connect to bottom neighbor (much sparser)
            const bottomHexIndex = hexIndex + hexCols;
            if (bottomHexIndex < numHexagons) {
                const bottomHexStart = bottomHexIndex * qubitsPerHex;
                if (bottomHexStart < numQubits) {
                    // Connect specific edge vertices
                    const topEdge = hexStart + 2;    // vertex 2 of top hex
                    const bottomEdge = bottomHexStart + 5; // vertex 5 of bottom hex
                    if (topEdge < numQubits && bottomEdge < numQubits) {
                        couplingMap.push([topEdge, bottomEdge]);
                    }
                }
            }
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
            5,
            Math.sqrt(numDeviceQubits) *
                2.5 *
                (this.layoutParams.idealDist / 5),
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
            areaDepth: this.layoutAreaSide * 0.5,
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

    /**
     * Update ideal distance and apply heavy hex layout
     * Returns the coupling map for the heavy hex topology
     */
    updateIdealDistanceHeavyHex(distance: number): number[][] {
        if (this.layoutParams.idealDist !== distance) {
            this.layoutParams.idealDist = distance;
            return this.applyHeavyHexLayoutToExistingQubits();
        }
        // Return current coupling map if distance hasn't changed
        return this.generateHeavyHexCouplingMap(this.qubitPositions.size);
    }

    /**
     * Get position of a specific qubit
     */
    getQubitPosition(qubitId: number): THREE.Vector3 | undefined {
        return this.qubitPositions.get(qubitId);
    }

    /**
     * Set position of a specific qubit
     */
    setQubitPosition(qubitId: number, position: THREE.Vector3): void {
        this.qubitPositions.set(qubitId, position.clone());
    }

    /**
     * Clear all positions
     */
    clearPositions(): void {
        this.qubitPositions.clear();
    }

    /**
     * Get all qubit IDs that have positions
     */
    getQubitIds(): number[] {
        return Array.from(this.qubitPositions.keys());
    }

    /**
     * Check if a qubit has a position
     */
    hasQubit(qubitId: number): boolean {
        return this.qubitPositions.has(qubitId);
    }

    /**
     * Get the number of qubits with positions
     */
    getQubitCount(): number {
        return this.qubitPositions.size;
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
