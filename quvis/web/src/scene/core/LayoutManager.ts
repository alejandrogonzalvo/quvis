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
     */
    private generateHeavyHexCouplingMap(numQubits: number): number[][] {
        const couplingMap: number[][] = [];

        // Heavy hex pattern: each hexagon has 12 qubits
        // Within each hexagon:
        // - 6 vertices (qubits 0-5 in each hex)
        // - 6 edge midpoints (qubits 6-11 in each hex)
        // Connectivity within each hexagon:
        // - Each vertex connects to its 2 adjacent vertices (in a ring)
        // - Each vertex connects to its corresponding edge midpoint
        // - Edge midpoints connect neighboring hexagons

        const qubitsPerHex = 12;
        const numHexagons = Math.ceil(numQubits / qubitsPerHex);
        const hexCols = Math.ceil(Math.sqrt(numHexagons));

        for (let qubit = 0; qubit < numQubits; qubit++) {
            const hexIndex = Math.floor(qubit / qubitsPerHex);
            const qubitInHex = qubit % qubitsPerHex;
            const hexRow = Math.floor(hexIndex / hexCols);
            const hexCol = hexIndex % hexCols;
            const hexBase = hexIndex * qubitsPerHex;

            if (qubitInHex < 6) {
                // Vertex qubit (0-5 in hex)
                const vertex = qubitInHex;

                // Connect to adjacent vertices in the same hexagon (ring)
                const nextVertex = (vertex + 1) % 6;
                const prevVertex = (vertex + 5) % 6; // equivalent to (vertex - 1 + 6) % 6

                const nextQubit = hexBase + nextVertex;
                const prevQubit = hexBase + prevVertex;

                if (nextQubit < numQubits) {
                    couplingMap.push([qubit, nextQubit]);
                }
                if (prevQubit < numQubits && prevQubit !== nextQubit) {
                    couplingMap.push([qubit, prevQubit]);
                }

                // Connect to corresponding edge midpoint
                const edgeQubit = hexBase + 6 + vertex;
                if (edgeQubit < numQubits) {
                    couplingMap.push([qubit, edgeQubit]);
                }
            } else {
                // Edge midpoint qubit (6-11 in hex)
                const edge = qubitInHex - 6;

                // Connect to the vertex this edge belongs to
                const vertexQubit = hexBase + edge;
                if (vertexQubit < numQubits) {
                    couplingMap.push([qubit, vertexQubit]);
                }

                // Connect to adjacent hexagons (heavy hex inter-hex connectivity)
                // This creates the characteristic heavy hex pattern
                const adjacentHexagons = this.getAdjacentHexagons(hexRow, hexCol, hexCols, numHexagons);
                for (const adjHex of adjacentHexagons) {
                    if (adjHex < numHexagons) {
                        const adjEdgeQubit = adjHex * qubitsPerHex + 6 + ((edge + 3) % 6); // opposite edge
                        if (adjEdgeQubit < numQubits) {
                            couplingMap.push([qubit, adjEdgeQubit]);
                        }
                    }
                }
            }
        }

        return couplingMap;
    }

    /**
     * Get adjacent hexagons for heavy hex inter-hexagon connectivity
     */
    private getAdjacentHexagons(row: number, col: number, cols: number, totalHexagons: number): number[] {
        const adjacent: number[] = [];

        // Hexagonal tiling adjacency (6 neighbors in hex grid)
        const offsets = [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;

            if (newRow >= 0 && newCol >= 0 && newCol < cols) {
                const adjHex = newRow * cols + newCol;
                if (adjHex < totalHexagons && adjHex >= 0) {
                    adjacent.push(adjHex);
                }
            }
        }

        return adjacent;
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
