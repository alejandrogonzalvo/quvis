export class Timeline {
    slices: number;
    currentSlice: number;

    private onSliceChange: (sliceIndex: number) => void;

    constructor(onSliceChange: (sliceIndex: number) => void) {
        this.currentSlice = 0;
        this.slices = 0;
        this.onSliceChange = onSliceChange;
    }

    setSlice(sliceIndex: number) {
        this.currentSlice = sliceIndex;
        this.onSliceChange(this.currentSlice);
    }

    addSlice() {
        this.slices += 1;
    }

    setSliceCount(count: number) {
        this.slices = count;
        this.currentSlice = count > 0 ? 0 : 0;
    }
}
