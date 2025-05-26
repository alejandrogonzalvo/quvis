import { State, States } from "../src/State.js";

describe("State", () => {
    it("State enum should have correct members", () => {
        expect(State.ZERO).toBe("0");
        expect(State.ONE).toBe("1");
        expect(State.PLUS).toBe("+");
        expect(State.MINUS).toBe("-");
        expect(State.SUPERPOSITION).toBe("superposition");
    });

    it("States array should contain all enum keys", () => {
        // The States array is populated with the string keys of the enum
        const enumKeys = Object.keys(State);
        expect(States).toEqual(expect.arrayContaining(enumKeys));
        expect(States.length).toBe(enumKeys.length);
    });
}); 