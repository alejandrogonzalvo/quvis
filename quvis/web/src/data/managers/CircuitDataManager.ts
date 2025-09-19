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

interface Circuit {
    circuit_info: LogicalCircuitInfo | CompiledCircuitInfo;
    device_info: DeviceInfo;
    algorithm_name: string;
    circuit_type: 'logical' | 'compiled';
    circuit_stats: {
        original_gates?: number;
        transpiled_gates?: number;
        depth: number;
        qubits: number;
        swap_count?: number;
    };
    routing_info?: any;
    routing_analysis?: any;
    algorithm_params?: any;
}

export class CircuitDataManager {
    private circuits: Circuit[] | null = null;
    private _currentCircuitIndex: number = 0;

    // Active data based on current circuit
    private allOperationsPerSlice: QubitOperation[][] = [];
    private _interactionPairsPerSlice: Array<
        Array<{ q1: number; q2: number }>
    > = [];
    private _qubit_count: number = 0;
    private _visualizationMode: 'compiled' | 'logical' = 'compiled';

    // Cumulative data for performance calculations
    private cumulativeQubitInteractions: number[][] = [];
    private cumulativePairInteractions: Map<string, number[]> = new Map();
    private slicesProcessedForHeatmap = 0;
    public isFullyLoaded = false;

    private readonly heatmapWeightBase = 1.3;

    constructor() {
        // Default values will be set when data is loaded
    }

    get qubitCount(): number {
        return this._qubit_count;
    }

    get visualizationMode(): 'compiled' | 'logical' {
        return this._visualizationMode;
    }

    get operationsPerSlice(): QubitOperation[][] {
        return this.allOperationsPerSlice;
    }

    get interactionPairsPerSlice(): Array<Array<{ q1: number; q2: number }>> {
        return this._interactionPairsPerSlice;
    }

    get couplingMap(): number[][] {
        if (this.circuits) {
            const currentCircuit = this.circuits[this._currentCircuitIndex];
            return (
                currentCircuit?.device_info?.connectivity_graph_coupling_map ||
                []
            );
        }
        return [];
    }

    get deviceQubitCount(): number {
        if (this.circuits) {
            const currentCircuit = this.circuits[this._currentCircuitIndex];
            return currentCircuit?.device_info?.num_qubits_on_device || 0;
        }
        return 0;
    }

    get isMultiCircuit(): boolean {
        return true; // Always multi-circuit mode now
    }

    get totalCircuits(): number {
        return this.circuits?.length || 0;
    }

    get currentCircuitIndex(): number {
        return this._currentCircuitIndex;
    }

    get currentCircuitInfo() {
        if (!this.circuits) return null;
        return this.circuits[this._currentCircuitIndex];
    }

    get allCircuitsInfo() {
        return this.circuits || [];
    }

    get processedSlicesCount(): number {
        return this.slicesProcessedForHeatmap;
    }

    get cumulativeQubitInteractionData(): number[][] {
        return this.cumulativeQubitInteractions;
    }

    get cumulativeWeightedPairInteractionData(): Map<string, number[]> {
        return this.cumulativePairInteractions;
    }

    async loadDataFile(filePath: string): Promise<void> {
        try {
            console.log(`Loading data file: ${filePath}`);
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch ${filePath}: ${response.statusText}`
                );
            }
            const jsonData = await response.json();
            this.processCircuitData(jsonData as Circuit[]);
        } catch (error) {
            console.error('Error loading data file:', error);
            throw error;
        }
    }

    loadData(data: Circuit[]): void {
        this.processCircuitData(data);
    }

    private processCircuitData(data: Circuit[]): void {
        this.clearData();

        console.log('data:', data);
        this.circuits = data;
        this._currentCircuitIndex = 0;

        // Load the first circuit
        this.switchToCircuit(0);
    }

    switchToCircuit(circuitIndex: number): void {
        this._currentCircuitIndex = circuitIndex;
        const circuit = this.circuits[circuitIndex];

        console.log('circuit:', circuit);
        if (circuit.circuit_type === 'logical') {
            this._qubit_count = (
                circuit.circuit_info as LogicalCircuitInfo
            ).num_qubits;
            this.allOperationsPerSlice =
                (circuit.circuit_info as LogicalCircuitInfo)
                    .interaction_graph_ops_per_slice || [];
        } else {
            this._qubit_count = (
                circuit.circuit_info as CompiledCircuitInfo
            ).num_qubits;
            this.allOperationsPerSlice =
                (circuit.circuit_info as CompiledCircuitInfo)
                    .compiled_interaction_graph_ops_per_slice || [];
        }

        // Set visualization mode based on circuit type
        this._visualizationMode = circuit.circuit_type;

        this.processInteractionPairs();
        this.initializeCumulativeData();
        this.calculateCumulativeDataInBackground();
    }

    private processInteractionPairs(): void {
        this._interactionPairsPerSlice = [];
        this.allOperationsPerSlice.forEach((ops_in_slice) => {
            const pairs: Array<{ q1: number; q2: number }> = [];
            ops_in_slice.forEach((op) => {
                if (op.qubits.length >= 2) {
                    for (let i = 0; i < op.qubits.length; i++) {
                        for (let j = i + 1; j < op.qubits.length; j++) {
                            pairs.push({ q1: op.qubits[i], q2: op.qubits[j] });
                        }
                    }
                }
            });
            this._interactionPairsPerSlice.push(pairs);
        });
    }

    /**
     * Initializes cumulative interaction data storage
     */
    private initializeCumulativeData(): void {
        // Initialize cumulative heatmap data structures
        // Each qubit gets an empty array to store cumulative interaction counts over time slices
        this.cumulativeQubitInteractions = Array.from(
            { length: this._qubit_count },
            () => []
        );

        this.cumulativePairInteractions.clear();

        const couplingMap = this.couplingMap;
        if (couplingMap && couplingMap.length > 0) {
            for (const pair of couplingMap) {
                const q1 = Math.min(pair[0], pair[1]);
                const q2 = Math.max(pair[0], pair[1]);
                const key = `${q1}-${q2}`;
                this.cumulativePairInteractions.set(key, []);
            }
        }

        this.slicesProcessedForHeatmap = 0;
        this.isFullyLoaded = false;
    }

    private calculateCumulativeDataInBackground(): void {
        const totalSlices = this.allOperationsPerSlice.length;
        if (totalSlices === 0) {
            this.isFullyLoaded = true;
            return;
        }

        const chunkSize = 500;
        let startIndex = 0;

        const processChunk = () => {
            const endIndex = Math.min(startIndex + chunkSize, totalSlices);

            for (let i = startIndex; i < endIndex; i++) {
                const interactingQubits = new Set<number>();
                this.allOperationsPerSlice[i].forEach((op) => {
                    op.qubits.forEach((qid) => interactingQubits.add(qid));
                });

                for (let qid = 0; qid < this._qubit_count; qid++) {
                    const hadInteraction = interactingQubits.has(qid) ? 1 : 0;
                    const prevSum =
                        i === 0
                            ? 0
                            : this.cumulativeQubitInteractions[qid][i - 1];
                    this.cumulativeQubitInteractions[qid].push(
                        prevSum + hadInteraction
                    );
                }
            }

            if (this.couplingMap) {
                this.processCouplingMapInteractions(startIndex, endIndex);
            }

            this.slicesProcessedForHeatmap = endIndex;

            startIndex = endIndex;
            if (startIndex < totalSlices) {
                setTimeout(processChunk, 0); // Yield to main thread
            } else {
                console.log('Fully loaded all slice data in background.');
                this.isFullyLoaded = true;
            }
        };

        setTimeout(processChunk, 0);
    }

    private processCouplingMapInteractions(
        startIndex: number,
        endIndex: number
    ): void {
        for (let i = startIndex; i < endIndex; i++) {
            const sliceInteractionPairs = this._interactionPairsPerSlice[i];
            const interactionsInSlice = new Set<string>();
            for (const interaction of sliceInteractionPairs) {
                const q1 = Math.min(interaction.q1, interaction.q2);
                const q2 = Math.max(interaction.q1, interaction.q2);
                interactionsInSlice.add(`${q1}-${q2}`);
            }

            for (const [
                key,
                scaledCumulativeWeights,
            ] of this.cumulativePairInteractions.entries()) {
                const hadInteraction = interactionsInSlice.has(key) ? 1 : 0;
                const prevScaledSum =
                    i === 0 ? 0 : scaledCumulativeWeights[i - 1];
                scaledCumulativeWeights.push(prevScaledSum + hadInteraction);
            }
        }
    }

    getSliceCount(): number {
        return this.allOperationsPerSlice.length;
    }

    getInteractingQubitsForSlice(sliceIndex: number): Set<number> {
        const interactingQubits = new Set<number>();
        if (sliceIndex >= 0 && sliceIndex < this.allOperationsPerSlice.length) {
            this.allOperationsPerSlice[sliceIndex].forEach((op) => {
                op.qubits.forEach((qid) => interactingQubits.add(qid));
            });
        }
        return interactingQubits;
    }

    private countGatesInRange(
        startIndex: number,
        endIndex: number,
        qubitId: number
    ): [number, number] {
        let oneQubitCount = 0;
        let twoQubitCount = 0;

        for (let i = startIndex; i <= endIndex; i++) {
            const sliceOps = this.allOperationsPerSlice[i];
            for (const op of sliceOps) {
                if (op.qubits.includes(qubitId)) {
                    if (op.qubits.length === 1) {
                        oneQubitCount++;
                    } else if (op.qubits.length === 2) {
                        twoQubitCount++;
                    }
                }
            }
        }

        return [oneQubitCount, twoQubitCount];
    }

    getGateCountForQubit(
        qubitId: number,
        currentSliceIndex: number,
        effectiveSlicesForHeatmap: number
    ): {
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

        const windowForCountsInWindow = Math.max(0, effectiveSlicesForHeatmap);

        if (this.allOperationsPerSlice.length === 0 || currentSliceIndex < 0) {
            return {
                oneQubitGatesInWindow: 0,
                twoQubitGatesInWindow: 0,
                totalOneQubitGates: 0,
                totalTwoQubitGates: 0,
                windowForCountsInWindow: windowForCountsInWindow,
            };
        }

        let actualSlicesToIterateForWindow = windowForCountsInWindow;
        if (windowForCountsInWindow === 0) {
            actualSlicesToIterateForWindow = 1;
        }

        const windowStartSliceIndex = Math.max(
            0,
            currentSliceIndex - actualSlicesToIterateForWindow + 1
        );
        const currentSliceEndIndex = currentSliceIndex;

        [oneQubitGatesInWindow, twoQubitGatesInWindow] = this.countGatesInRange(
            windowStartSliceIndex,
            currentSliceEndIndex,
            qubitId
        );

        // Count total gates up to current slice
        [totalOneQubitGates, totalTwoQubitGates] = this.countGatesInRange(
            0,
            currentSliceIndex,
            qubitId
        );

        const reportedWindowForInWindowCounts =
            windowForCountsInWindow === 0 ? 1 : windowForCountsInWindow;

        return {
            oneQubitGatesInWindow,
            twoQubitGatesInWindow,
            totalOneQubitGates,
            totalTwoQubitGates,
            windowForCountsInWindow: reportedWindowForInWindowCounts,
        };
    }

    getInteractionCountForPair(
        pairKey: string, // e.g. "0-1"
        currentSliceIndex: number,
        maxSlicesForHeatmap: number
    ): {
        interactionsInWindow: number;
        totalInteractions: number;
        windowForCountsInWindow: number;
    } {
        const cumulativeData = this.cumulativePairInteractions.get(pairKey);

        if (!cumulativeData || currentSliceIndex < 0) {
            return {
                interactionsInWindow: 0,
                totalInteractions: 0,
                windowForCountsInWindow: maxSlicesForHeatmap,
            };
        }

        const totalInteractions = cumulativeData[currentSliceIndex] || 0;

        let windowStartSliceIndex;
        let windowForCountsInWindow;
        let reportedWindowForInWindowCounts;

        if (maxSlicesForHeatmap === -1) {
            // "All" mode
            windowStartSliceIndex = 0;
            windowForCountsInWindow = currentSliceIndex + 1;
            reportedWindowForInWindowCounts = windowForCountsInWindow;
        } else {
            windowForCountsInWindow = Math.max(0, maxSlicesForHeatmap);
            let actualSlicesToIterateForWindow = windowForCountsInWindow;
            if (windowForCountsInWindow === 0) {
                actualSlicesToIterateForWindow = 1;
            }

            windowStartSliceIndex = Math.max(
                0,
                currentSliceIndex - actualSlicesToIterateForWindow + 1
            );
            reportedWindowForInWindowCounts =
                windowForCountsInWindow === 0 ? 1 : windowForCountsInWindow;
        }

        const interactionsBeforeWindow =
            windowStartSliceIndex > 0
                ? cumulativeData[windowStartSliceIndex - 1] || 0
                : 0;
        const interactionsInWindow =
            totalInteractions - interactionsBeforeWindow;

        return {
            interactionsInWindow,
            totalInteractions,
            windowForCountsInWindow: reportedWindowForInWindowCounts,
        };
    }

    clearData(): void {
        this.circuits = null;
        this._currentCircuitIndex = 0;
        this.allOperationsPerSlice = [];
        this._interactionPairsPerSlice = [];
        this._qubit_count = 0;
        this.cumulativeQubitInteractions = [];
        this.cumulativePairInteractions.clear();
        this.slicesProcessedForHeatmap = 0;
        this.isFullyLoaded = false;
    }
}
