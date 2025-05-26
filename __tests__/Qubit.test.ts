import { Qubit } from "../src/Qubit.js";
import { State } from "../src/State.js";
import { BlochSphere } from "../src/BlochSphere.js";

// Mock BlochSphere
jest.mock('../src/BlochSphere.js', () => {
    return {
        BlochSphere: jest.fn().mockImplementation(() => {
            return {
                animateStateVector: jest.fn(), // Mock this method as it's called by Qubit
            };
        })
    };
});

describe("Qubit", () => {
    let mockBlochSphere: BlochSphere;

    beforeEach(() => {
        // Create a new mock for each test to ensure independence
        mockBlochSphere = new (jest.requireMock('../src/BlochSphere.js') as any).BlochSphere();
    });

    it("should be created without errors", () => {
        expect(() => new Qubit(1, State.ZERO, mockBlochSphere)).not.toThrow();
    });

    it("should set initial state and call animate", () => {
        const qubit = new Qubit(1, State.ONE, mockBlochSphere);
        expect(qubit.state).toBe(State.ONE);
        // Animate is called during construction via the setter
        expect(mockBlochSphere.animateStateVector).toHaveBeenCalledWith(State.ONE);
    });

    it("should change state and call animate", () => {
        const qubit = new Qubit(1, State.ZERO, mockBlochSphere);
        (mockBlochSphere.animateStateVector as jest.Mock).mockClear(); // Clear previous calls from constructor

        qubit.state = State.PLUS;
        expect(qubit.state).toBe(State.PLUS);
        expect(mockBlochSphere.animateStateVector).toHaveBeenCalledWith(State.PLUS);
        expect(mockBlochSphere.animateStateVector).toHaveBeenCalledTimes(1);
    });

    it("should not call animate if state is the same", () => {
        const qubit = new Qubit(1, State.ZERO, mockBlochSphere);
        (mockBlochSphere.animateStateVector as jest.Mock).mockClear(); // Clear previous calls

        qubit.state = State.ZERO; // Set to the same state
        expect(qubit.state).toBe(State.ZERO);
        expect(mockBlochSphere.animateStateVector).not.toHaveBeenCalled();
    });
}); 