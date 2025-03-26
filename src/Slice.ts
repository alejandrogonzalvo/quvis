import { Qubit } from "./Qubit.js";

export class Slice {
    qubits: Map<number, Qubit>;
    interacting_qubits: Set<number>;
    
    constructor(qubits: Map<number, Qubit> = new Map(), interacting_qubits: Set<number> = new Set()) {
        this.qubits = qubits;
        this.interacting_qubits = interacting_qubits;
    }

    clone(): Slice {
        let cloned_qubits = new Map<number, Qubit>();
        this.qubits.forEach((qubit, id) => {
            cloned_qubits.set(id, new Qubit(id, qubit.state, qubit.blochSphere));
        });
        return new Slice(
            cloned_qubits,
            new Set<number>()
        )
    }
}