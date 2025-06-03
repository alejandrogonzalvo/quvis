import { BlochSphere } from "./BlochSphere.js";
import { State } from "./State.js";

export class Qubit {
    id: number;
    private _state: State;
    blochSphere: BlochSphere;

    constructor(
        id: number = 0,
        initialState: State = State.ZERO,
        blochSphereInstance: BlochSphere,
    ) {
        this.id = id;
        this._state = initialState;
        this.blochSphere = blochSphereInstance;
        this.state = this._state;
    }

    get state(): State {
        return this._state;
    }

    set state(newState: State) {
        this._state = newState;
        this.animate();
    }

    animate() {
        if (this.blochSphere) {
            this.blochSphere.animateStateVector(this.state);
        }
    }

    dispose() {
        if (this.blochSphere) {
            this.blochSphere.dispose();
        }
    }
}
