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

export class CircuitDataManager {
    // Data stores for different views
    private logicalCircuitInfo: LogicalCircuitInfo | null = null;
    private compiledCircuitInfo: CompiledCircuitInfo | null = null;
    private deviceInfo: DeviceInfo | null = null;

    // Active data based on current mode
    private allOperationsPerSlice: QubitOperation[][] = [];
    private interactionPairsPerSlice: Array<Array<{ q1: number; q2: number }>> =
        [];
    private _qubit_count: number = 0;
    private _visualizationMode: "compiled" | "logical" = "compiled";

    // Cumulative data for performance calculations
    private cumulativeQubitInteractions: number[][] = [];
    private cumulativeWeightedPairInteractions: Map<string, number[]> =
        new Map();
    private slicesProcessedForHeatmap = 0;
    public isFullyLoaded = false;

    private readonly heatmapWeightBase = 1.3;

    constructor(visualizationMode: "compiled" | "logical" = "compiled") {
        this._visualizationMode = visualizationMode;
    }

    // Getters for read-only access to data
    get logicalCircuit(): LogicalCircuitInfo | null {
        return this.logicalCircuitInfo;
    }

    get compiledCircuit(): CompiledCircuitInfo | null {
        return this.compiledCircuitInfo;
    }

    get device(): DeviceInfo | null {
        return this.deviceInfo;
    }

    get operationsPerSlice(): QubitOperation[][] {
        return this.allOperationsPerSlice;
    }

    get interactionPairs(): Array<Array<{ q1: number; q2: number }>> {
        return this.interactionPairsPerSlice;
    }

    get qubitCount(): number {
        return this._qubit_count;
    }

    get visualizationMode(): "compiled" | "logical" {
        return this._visualizationMode;
    }

    get couplingMap(): number[][] | null {
        return this.deviceInfo?.connectivity_graph_coupling_map || null;
    }

    get cumulativeQubitInteractionData(): number[][] {
        return this.cumulativeQubitInteractions;
    }

    get cumulativeWeightedPairInteractionData(): Map<string, number[]> {
        return this.cumulativeWeightedPairInteractions;
    }

    get processedSlicesCount(): number {
        return this.slicesProcessedForHeatmap;
    }

    async loadFromJSON(url: string): Promise<void> {
        try {
            console.log(`Fetching data from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData: QFTVizData = await response.json();
            console.log("Successfully fetched and parsed JSON data from URL.");
            this.processCircuitData(jsonData);
        } catch (error) {
            console.error(
                "Failed to load or parse slices from JSON URL:",
                error,
            );
            throw error;
        }
    }

    loadFromObject(data: QFTVizData): void {
        try {
            this.processCircuitData(data);
        } catch (error) {
            console.error("Failed to process circuit data object:", error);
            throw error;
        }
    }

    private processCircuitData(data: QFTVizData): void {
        this.clearData();

        console.log("Processing raw QFTVizData:", data);

        this.logicalCircuitInfo = data.logical_circuit_info || null;
        this.compiledCircuitInfo = data.compiled_circuit_info || null;
        this.deviceInfo = data.device_info || null;

        if (
            !this.deviceInfo ||
            this.deviceInfo.num_qubits_on_device === undefined
        ) {
            throw new Error("Device info or num_qubits_on_device is missing.");
        }

        this.switchToMode(this._visualizationMode);
    }

    switchToMode(mode: "compiled" | "logical"): void {
        this._visualizationMode = mode;
        let newQubitCount = 0;

        if (mode === "logical" && this.logicalCircuitInfo) {
            newQubitCount = this.logicalCircuitInfo.num_qubits;
            this.allOperationsPerSlice =
                this.logicalCircuitInfo.interaction_graph_ops_per_slice || [];
        } else if (mode === "compiled" && this.compiledCircuitInfo) {
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

        this._qubit_count = newQubitCount;
        this.processInteractionPairs();
        this.initializeCumulativeData();
        this.calculateCumulativeDataInBackground();
    }

    private processInteractionPairs(): void {
        this.interactionPairsPerSlice = this.allOperationsPerSlice.map(
            (ops_in_slice) => {
                const currentSlicePairs: Array<{ q1: number; q2: number }> = [];
                ops_in_slice.forEach((op) => {
                    if (op.qubits.length === 2) {
                        currentSlicePairs.push({
                            q1: op.qubits[0],
                            q2: op.qubits[1],
                        });
                    }
                });
                return currentSlicePairs;
            },
        );
    }

    private initializeCumulativeData(): void {
        this.cumulativeQubitInteractions = new Array(this._qubit_count)
            .fill(0)
            .map(() => []);
        this.cumulativeWeightedPairInteractions = new Map<string, number[]>();

        // Initialize pair interactions based on coupling map
        const couplingMap = this.couplingMap;
        if (couplingMap) {
            for (const pair of couplingMap) {
                const q1 = Math.min(pair[0], pair[1]);
                const q2 = Math.max(pair[0], pair[1]);
                const key = `${q1}-${q2}`;
                this.cumulativeWeightedPairInteractions.set(key, []);
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

            // Process cumulativeQubitInteractions for the chunk
            for (let i = startIndex; i < endIndex; i++) {
                // Create a set of interacting qubits for this slice
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
                        prevSum + hadInteraction,
                    );
                }
            }

            // Process cumulativeWeightedPairInteractions for the chunk
            const couplingMap = this.couplingMap;
            if (couplingMap) {
                this.processCouplingMapWeightedInteractions(
                    couplingMap,
                    startIndex,
                    endIndex,
                );
            }

            this.slicesProcessedForHeatmap = endIndex;

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

    private processCouplingMapWeightedInteractions(
        couplingMap: number[][],
        startIndex: number,
        endIndex: number,
    ): void {
        const weight_base = this.heatmapWeightBase;
        for (const pair of couplingMap) {
            const q1 = Math.min(pair[0], pair[1]);
            const q2 = Math.max(pair[0], pair[1]);
            const key = `${q1}-${q2}`;
            const scaledCumulativeWeights =
                this.cumulativeWeightedPairInteractions.get(key)!;

            for (let i = startIndex; i < endIndex; i++) {
                const sliceInteractionPairs = this.interactionPairsPerSlice[i];
                let hadInteraction = 0;
                for (const interaction of sliceInteractionPairs) {
                    if (
                        (interaction.q1 === q1 && interaction.q2 === q2) ||
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
        qubitId: number,
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
        effectiveSlicesForHeatmap: number,
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
            currentSliceIndex - actualSlicesToIterateForWindow + 1,
        );
        const currentSliceEndIndex = currentSliceIndex;

        [oneQubitGatesInWindow, twoQubitGatesInWindow] = this.countGatesInRange(
            windowStartSliceIndex,
            currentSliceEndIndex,
            qubitId,
        );

        // Count total gates up to current slice
        [totalOneQubitGates, totalTwoQubitGates] = this.countGatesInRange(
            0,
            currentSliceIndex,
            qubitId,
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

    clearData(): void {
        this.logicalCircuitInfo = null;
        this.compiledCircuitInfo = null;
        this.deviceInfo = null;
        this.allOperationsPerSlice = [];
        this.interactionPairsPerSlice = [];
        this._qubit_count = 0;
        this.cumulativeQubitInteractions = [];
        this.cumulativeWeightedPairInteractions = new Map();
        this.slicesProcessedForHeatmap = 0;
        this.isFullyLoaded = false;
    }
}
