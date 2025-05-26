import { BlochSphere } from "../src/BlochSphere.js";
import * as THREE from "three";
import { State } from "../src/State.js"; // Assuming State is used by animateStateVector

// Mock Three.js
jest.mock('three', () => {
    const originalThree = jest.requireActual('three');
    return {
        ...originalThree,
        Group: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            position: { set: jest.fn() },
            lookAt: jest.fn(),
            children: [], // Mock children array for find method
        })),
        SphereGeometry: jest.fn(),
        MeshPhongMaterial: jest.fn(),
        Mesh: jest.fn().mockImplementation(() => ({
            rotation: {},
        })),
        CylinderGeometry: jest.fn(),
        MeshBasicMaterial: jest.fn(),
        TorusGeometry: jest.fn(),
        Vector3: jest.fn().mockImplementation(() => ({
            multiplyScalar: jest.fn().mockReturnThis(),
        })),
        ConeGeometry: jest.fn(),
        Euler: jest.fn(),
    };
});

// Mock gsap
jest.mock('gsap', () => ({
    gsap: {
        to: jest.fn(),
    },
}));

describe("BlochSphere", () => {
    it("should be created without errors", () => {
        expect(() => new BlochSphere(0, 0)).not.toThrow();
    });

    it("should call animateStateVector without errors", () => {
        const blochSphere = new BlochSphere(0, 0);
        // Mock the stateVector within the blochSphere instance
        const mockStateVector = { rotation: {} }; // Add any other properties accessed
        blochSphere.blochSphere.children.push(mockStateVector as any); // 'as any' to bypass strict type checking for the mock

        expect(() => blochSphere.animateStateVector(State.ZERO)).not.toThrow();
        expect(() => blochSphere.animateStateVector(State.ONE)).not.toThrow();
        expect(() => blochSphere.animateStateVector(State.PLUS)).not.toThrow();
        expect(() => blochSphere.animateStateVector(State.MINUS)).not.toThrow();

    });
}); 