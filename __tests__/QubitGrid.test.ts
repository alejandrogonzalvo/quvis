import { QubitGrid } from "../src/QubitGrid.js";
import * as THREE from "three";

// Mock Three.js objects
jest.mock('three', () => {
    const originalThree = jest.requireActual('three');
    return {
        ...originalThree,
        Scene: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
        })),
        Vector2: jest.fn(),
        PerspectiveCamera: jest.fn(),
    };
});

describe("QubitGrid", () => {
    it("should be created without errors", () => {
        // Create mock instances
        const mockScene = new THREE.Scene();
        const mockMouse = new THREE.Vector2();
        const mockCamera = new THREE.PerspectiveCamera();
        
        // Instantiate QubitGrid
        expect(() => new QubitGrid(mockScene, mockMouse, mockCamera, 4)).not.toThrow();
    });
}); 