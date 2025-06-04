export enum State {
    ZERO = 0,
    ONE = 1,
    PLUS = "+",
    MINUS = "-",
    SUPERPOSITION = "superposition",
}

export const States = [];
for (const state in State) {
    // This loop will add both number keys (as strings) and string keys for numeric enums
    // e.g., "0", "1", "ZERO", "ONE", "PLUS", etc.
    // This might not be the desired outcome for `States` array if it expects only key names.
    // Consider filtering if only key names are needed: if(isNaN(parseInt(state))) States.push(state);
    States.push(state);
}
