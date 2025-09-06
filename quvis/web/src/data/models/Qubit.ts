import { BlochSphere } from "../../scene/objects/BlochSphere.js";
import { State } from "./State.js";

export class Qubit {
    id: number;
    private _state: State;
    blochSphere: BlochSphere | null;

    constructor(
        id: number = 0,
        initialState: State = State.ZERO,
        blochSphereInstance: BlochSphere | null = null,
    ) {
        this.id = id;
        this._state = initialState;
        this.blochSphere = blochSphereInstance;
        // console.log(`Qubit ${this.id} constructed. Initial _state: ${this._state}, typeof _state: ${typeof this._state}. (Enum string: ${State[this._state]})`);
    }

    get state(): State {
        return this._state;
    }

    set state(newState: State) {
        // console.log(`Qubit ${this.id} SET state: received newState: ${newState}, typeof newState: ${typeof newState}. (Enum string: ${State[newState]})`);
        // console.log(`Qubit ${this.id} SET state: current _state BEFORE: ${this._state}, typeof _state: ${typeof this._state}. (Enum string: ${State[this._state]})`);
        this._state = newState;
        // console.log(`Qubit ${this.id} SET state: _state AFTER: ${this._state}, typeof _state: ${typeof this._state}. (Enum string: ${State[this._state]})`);
    }

    setLOD(level: "high" | "medium" | "low"): void {
        if (this.blochSphere) {
            this.blochSphere.setLOD(level);
        }
    }

    dispose() {
        if (this.blochSphere) {
            this.blochSphere.dispose();
        }
    }
}
