export interface VisualizationState {
    mode: "compiled" | "logical";
    currentSlice: number;
    maxHeatmapSlices: number;
    oneQubitFidelityBase: number;
    twoQubitFidelityBase: number;
}

export class VisualizationStateManager {
    private state: VisualizationState;
    private onModeSwitchedCallback:
        | ((newSliceCount: number, newCurrentSliceIndex: number) => void)
        | undefined;
    private onSlicesLoadedCallback:
        | ((count: number, initialIndex: number) => void)
        | undefined;

    constructor(
        mode: "compiled" | "logical" = "compiled",
        maxHeatmapSlices: number = 5,
        oneQubitFidelityBase: number = 0.99,
        twoQubitFidelityBase: number = 0.98,
        onModeSwitchedCallback?: (
            newSliceCount: number,
            newCurrentSliceIndex: number,
        ) => void,
        onSlicesLoadedCallback?: (count: number, initialIndex: number) => void,
    ) {
        this.state = {
            mode,
            currentSlice: 0,
            maxHeatmapSlices,
            oneQubitFidelityBase,
            twoQubitFidelityBase,
        };
        this.onModeSwitchedCallback = onModeSwitchedCallback;
        this.onSlicesLoadedCallback = onSlicesLoadedCallback;
    }

    public getState(): VisualizationState {
        return { ...this.state };
    }

    public getVisualizationMode(): "compiled" | "logical" {
        return this.state.mode;
    }

    public setVisualizationMode(mode: "compiled" | "logical"): void {
        if (this.state.mode !== mode) {
            this.state.mode = mode;
            console.log(`Visualization mode changed to: ${mode}`);
        }
    }

    public getCurrentSlice(): number {
        return this.state.currentSlice;
    }

    public setCurrentSlice(sliceIndex: number): void {
        this.state.currentSlice = sliceIndex;
    }

    public getMaxHeatmapSlices(): number {
        return this.state.maxHeatmapSlices;
    }

    public setMaxHeatmapSlices(slices: number): void {
        this.state.maxHeatmapSlices = slices;
    }

    public getOneQubitFidelityBase(): number {
        return this.state.oneQubitFidelityBase;
    }

    public getTwoQubitFidelityBase(): number {
        return this.state.twoQubitFidelityBase;
    }

    public updateFidelityParameters(params: {
        oneQubitBase?: number;
        twoQubitBase?: number;
    }): void {
        if (params.oneQubitBase !== undefined) {
            this.state.oneQubitFidelityBase = params.oneQubitBase;
        }
        if (params.twoQubitBase !== undefined) {
            this.state.twoQubitFidelityBase = params.twoQubitBase;
        }
        console.log(
            "Fidelity parameters updated:",
            this.state.oneQubitFidelityBase,
            this.state.twoQubitFidelityBase,
        );
    }

    public notifyModeSwitched(
        newSliceCount: number,
        newCurrentSliceIndex: number,
    ): void {
        this.onModeSwitchedCallback?.(newSliceCount, newCurrentSliceIndex);
    }

    public notifySlicesLoaded(count: number, initialIndex: number): void {
        this.onSlicesLoadedCallback?.(count, initialIndex);
    }
}
