import * as THREE from "three";
import { BlochSphere } from "./BlochSphere.js";
import { State } from "./State.js";

export class Qubit {
    id: number;
    private _state: State;
    blochSphere: BlochSphere;

    constructor(
        id: number = 0,
        initialState: State = State.ZERO,
        blockSphere: BlochSphere,
    ) {
        this.id = id;
        this._state = initialState;
        this.blochSphere = blockSphere;
        this.state = this._state;
    }

    // Getter for public access
    get state(): State {
        return this._state;
    }

    // Setter that triggers animation on change
    set state(newState: State) {
        if (this._state !== newState) {
            this._state = newState;
            this.animate();
        }
    }

    animate() {
        this.blochSphere.animateStateVector(this.state);
    }
}
