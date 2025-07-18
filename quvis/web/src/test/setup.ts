import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Three.js
vi.mock("three", () => {
    return {
        Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
            x,
            y,
            z,
            set: vi.fn(),
            add: vi.fn(),
            divideScalar: vi.fn().mockReturnThis(),
            clone: vi.fn().mockReturnThis(),
        })),
        Box3: vi.fn().mockImplementation(() => ({
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
            isEmpty: vi.fn().mockReturnValue(false),
            expandByPoint: vi.fn(),
            getSize: vi.fn().mockImplementation((target) => {
                target.x = 10;
                target.y = 10;
                target.z = 10;
                return target;
            }),
        })),
        BufferGeometry: vi.fn().mockImplementation(() => ({
            setAttribute: vi.fn(),
            dispose: vi.fn(),
            attributes: {
                position: { needsUpdate: false },
                intensity: { needsUpdate: false },
            },
        })),
        BufferAttribute: vi.fn().mockImplementation((array, itemSize) => ({
            array,
            itemSize,
            needsUpdate: false,
        })),
        ShaderMaterial: vi.fn().mockImplementation((params) => ({
            uniforms: params?.uniforms || {},
            dispose: vi.fn(),
            clone: vi.fn().mockReturnThis(),
        })),
        Points: vi.fn().mockImplementation((geometry, material) => ({
            geometry,
            material,
            visible: true,
            parent: {
                add: vi.fn(),
                remove: vi.fn(),
            },
        })),
        PerspectiveCamera: vi.fn().mockImplementation(() => ({
            position: { x: 0, y: 0, z: 0 },
            lookAt: vi.fn(),
        })),
        AdditiveBlending: 2,
    };
});

// Mock window objects if needed
Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1024,
});

Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: 768,
});
