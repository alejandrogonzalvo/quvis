export enum State {
    ZERO = "0",
    ONE = "1",
    PLUS = "+",
    MINUS = "-",
    SUPERPOSITION = "superposition",
}

export const States = [];
for (const state in State) {
    States.push(state);
}
