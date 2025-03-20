import * as THREE from 'three';
import { BlochSphere } from './BlochSphere.js';
import { State } from './State.js';

export class Qubit {
    id: number;
    private _state: State;  // Private backing field
    blochSphere: BlochSphere;

    constructor(x: number, y: number, id: number = 0, initialState: State = State.ZERO) {
        this.id = id;
        this._state = initialState;
        this.blochSphere = new BlochSphere(x, y);
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
