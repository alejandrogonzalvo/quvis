import { Heatmap } from "../src/Heatmap.js";
import * as THREE from "three";

// Mock Three.js objects
jest.mock('three', () => {
    const originalThree = jest.requireActual('three');
    return {
        ...originalThree,
        PerspectiveCamera: jest.fn(),
        BufferGeometry: jest.fn().mockImplementation(() => ({
            setAttribute: jest.fn(),
        })),
        ShaderMaterial: jest.fn(),
        Points: jest.fn(),
        Vector3: jest.fn(),
        BufferAttribute: jest.fn(),
    };
});

describe("Heatmap", () => {
    it("should be created without errors", () => {
        const mockCamera = new THREE.PerspectiveCamera();
        expect(() => new Heatmap(mockCamera, 16, 10)).not.toThrow();
    });
}); 