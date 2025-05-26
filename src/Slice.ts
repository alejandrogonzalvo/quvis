import { Qubit } from "./Qubit.js";

export class Slice {
    timeStep: number;
    qubits: Map<number, Qubit>;
    interacting_qubits: Set<number>;

    constructor(
        timeStep: number = 0,
        qubits: Map<number, Qubit> = new Map(),
        interacting_qubits: Set<number> = new Set(),
    ) {
        this.timeStep = timeStep;
        this.qubits = qubits;
        this.interacting_qubits = interacting_qubits;
    }

    clone(): Slice {
        const cloned_qubits = new Map<number, Qubit>();
        this.qubits.forEach((qubit, id) => {
            cloned_qubits.set(
                id,
                new Qubit(id, qubit.state, qubit.blochSphere),
            );
        });
        return new Slice(this.timeStep + 1, cloned_qubits, new Set<number>());
    }
}
