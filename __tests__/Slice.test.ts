import { Slice } from "../src/Slice.js";
import { Qubit } from "../src/Qubit.js";
import { State } from "../src/State.js";
import { BlochSphere } from "../src/BlochSphere.js";

// Mock Qubit and its dependencies as they are used by Slice's clone method
jest.mock('../src/Qubit.js', () => {
    return {
        Qubit: jest.fn().mockImplementation((id, state, blochSphere) => {
            return {
                id,
                state,
                blochSphere,
                // Mock any methods or properties of Qubit that Slice might interact with, if any
            };
        })
    };
});

jest.mock('../src/BlochSphere.js', () => {
    return {
        BlochSphere: jest.fn().mockImplementation(() => {
            return {
                // Mock properties/methods of BlochSphere
            };
        })
    };
});


describe("Slice", () => {
    it("should be created without errors", () => {
        expect(() => new Slice()).not.toThrow();
    });

    it("should clone without errors", () => {
        const slice = new Slice();
        // Optionally populate with mock qubits if clone method depends on it
        const mockBlochSphere = new BlochSphere(0,0);
        const qubit1 = new Qubit(1, State.ZERO, mockBlochSphere);
        slice.qubits.set(1, qubit1);
        
        expect(() => slice.clone()).not.toThrow();
    });
}); 