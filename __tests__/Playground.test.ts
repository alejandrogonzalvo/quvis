/// <reference types="@types/jest" />
import { Playground } from "../src/Playground.js";
import * as THREE from "three";
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock Three.js and global DOM objects
jest.mock('three', () => {
    const originalThree = jest.requireActual('three');
    return {
        ...originalThree,
        Scene: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            background: {},
        })),
        PerspectiveCamera: jest.fn().mockImplementation(() => ({
            position: { set: jest.fn() },
            add: jest.fn(),
        })),
        WebGLRenderer: jest.fn().mockImplementation(() => ({
            setSize: jest.fn(),
            domElement: {},
            render: jest.fn(),
        })),
        Vector2: jest.fn(),
        Raycaster: jest.fn(),
        Color: jest.fn(),
        Group: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
        })),
        AmbientLight: jest.fn(),
        DirectionalLight: jest.fn(),
        PointLight: jest.fn(),
        HemisphereLight: jest.fn(),
    };
});

jest.mock('three/addons/controls/OrbitControls.js', () => ({
    OrbitControls: jest.fn().mockImplementation(() => ({
        enableDamping: false,
        dampingFactor: 0,
        update: jest.fn(),
    })),
}));

// Mock QubitGrid
jest.mock('../src/QubitGrid.js', () => ({
    QubitGrid: jest.fn().mockImplementation(() => ({
        heatmap: {
            material: {
                uniforms: {
                    aspect: { value: 0 }
                }
            },
            mesh: {}
        },
    })),
}));


describe("Playground", () => {
    let mockAppendChild: jest.SpyInstance;
    let mockGetElementById: jest.SpyInstance;
    let mockCreateElement: jest.SpyInstance;

    beforeEach(() => {
        mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
        mockGetElementById = jest.spyOn(document, 'getElementById').mockImplementation(jest.fn());
        mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation(jest.fn().mockReturnValue({
            style: {},
            textContent: ''
        }));
        // Mock window properties
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 });

    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should be created without errors", () => {
        expect(() => new Playground()).not.toThrow();
    });
}); 