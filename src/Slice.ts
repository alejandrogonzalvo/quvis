export class Slice {
    time_step: number;
    interacting_qubits: Set<number>;

    constructor(time_step: number = 0) {
        this.time_step = time_step;
        this.interacting_qubits = new Set<number>();
    }

    clone(): Slice {
        const newSlice = new Slice(this.time_step);
        newSlice.interacting_qubits = new Set(this.interacting_qubits);
        return newSlice;
    }
}
