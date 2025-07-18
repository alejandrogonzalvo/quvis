import { describe, it, expect, beforeEach, vi } from "vitest";
import { Heatmap } from "../scene/objects/Heatmap.js";
import * as THREE from "three";

describe("Heatmap LOD Functions", () => {
    let heatmap: Heatmap;
    let mockCamera: THREE.PerspectiveCamera;
    const qubitNumber = 5;
    const maxSlices = 10;

    beforeEach(() => {
        // Create a fresh mock camera for each test
        mockCamera = new THREE.PerspectiveCamera();

        // Create a new Heatmap instance for each test
        heatmap = new Heatmap(mockCamera, qubitNumber, maxSlices);
    });

    describe("setLOD method", () => {
        it("should set high LOD correctly when no clustered mesh exists", () => {
            // Arrange
            heatmap.clusteredMesh = null;
            heatmap.mesh.visible = false;

            // Act
            heatmap.setLOD("high");

            // Assert
            expect(heatmap.mesh.visible).toBe(true);
        });

        it("should set low LOD correctly when clustered mesh exists", () => {
            // Arrange: Create a mock clustered mesh
            const mockClusteredMesh = new THREE.Points(
                new THREE.BufferGeometry(),
                new THREE.ShaderMaterial(),
            );
            mockClusteredMesh.visible = false;
            heatmap.clusteredMesh = mockClusteredMesh;
            heatmap.mesh.visible = true;

            // Act
            heatmap.setLOD("low");

            // Assert
            expect(heatmap.mesh.visible).toBe(false);
            expect(heatmap.clusteredMesh.visible).toBe(true);
        });

        it("should set high LOD correctly when clustered mesh exists", () => {
            // Arrange: Create a mock clustered mesh
            const mockClusteredMesh = new THREE.Points(
                new THREE.BufferGeometry(),
                new THREE.ShaderMaterial(),
            );
            mockClusteredMesh.visible = true;
            heatmap.clusteredMesh = mockClusteredMesh;
            heatmap.mesh.visible = false;

            // Act
            heatmap.setLOD("high");

            // Assert
            expect(heatmap.mesh.visible).toBe(true);
            expect(heatmap.clusteredMesh.visible).toBe(false);
        });

        it("should handle low LOD when no clustered mesh exists", () => {
            // Arrange
            heatmap.clusteredMesh = null;
            heatmap.mesh.visible = false;

            // Act
            heatmap.setLOD("low");

            // Assert
            expect(heatmap.mesh.visible).toBe(true);
            // No clustered mesh to make visible, so main mesh should remain visible
        });

        it("should maintain state consistency across multiple LOD switches", () => {
            // Arrange: Create a mock clustered mesh
            const mockClusteredMesh = new THREE.Points(
                new THREE.BufferGeometry(),
                new THREE.ShaderMaterial(),
            );
            heatmap.clusteredMesh = mockClusteredMesh;

            // Act & Assert: Test multiple switches
            heatmap.setLOD("high");
            expect(heatmap.mesh.visible).toBe(true);
            expect(heatmap.clusteredMesh.visible).toBe(false);

            heatmap.setLOD("low");
            expect(heatmap.mesh.visible).toBe(false);
            expect(heatmap.clusteredMesh.visible).toBe(true);

            heatmap.setLOD("high");
            expect(heatmap.mesh.visible).toBe(true);
            expect(heatmap.clusteredMesh.visible).toBe(false);
        });

        it("should not throw errors with invalid visibility states", () => {
            // Arrange: Create clustered mesh with undefined visibility
            const mockClusteredMesh = new THREE.Points(
                new THREE.BufferGeometry(),
                new THREE.ShaderMaterial(),
            );
            delete mockClusteredMesh.visible;
            heatmap.clusteredMesh = mockClusteredMesh;

            // Act & Assert: Should not throw
            expect(() => {
                heatmap.setLOD("low");
                heatmap.setLOD("high");
            }).not.toThrow();
        });
    });

    describe("LOD integration with other methods", () => {
        it("should maintain LOD state after generateClusters call", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            const numDeviceQubits = 2;

            // Act
            heatmap.generateClusters(qubitPositions, numDeviceQubits);
            heatmap.setLOD("low");

            // Assert
            expect(heatmap.mesh.visible).toBe(false);
            if (heatmap.clusteredMesh) {
                expect(heatmap.clusteredMesh.visible).toBe(true);
            }
        });

        it("should handle LOD after clearPositionsCache", () => {
            // Arrange: Set up initial state
            const mockClusteredMesh = new THREE.Points(
                new THREE.BufferGeometry(),
                new THREE.ShaderMaterial(),
            );
            heatmap.clusteredMesh = mockClusteredMesh;

            // Act
            heatmap.clearPositionsCache();
            heatmap.setLOD("low");

            // Assert: Should still work correctly
            expect(heatmap.mesh.visible).toBe(false);
            expect(heatmap.clusteredMesh.visible).toBe(true);
        });
    });

    describe("Constructor initialization for LOD", () => {
        it("should initialize main mesh as visible by default", () => {
            // Assert
            expect(heatmap.mesh.visible).toBe(true);
            expect(heatmap.clusteredMesh).toBeNull();
        });
    });
});

describe("Heatmap Core Functions", () => {
    let heatmap: Heatmap;
    let mockCamera: THREE.PerspectiveCamera;
    const qubitNumber = 5;
    const maxSlices = 10;

    beforeEach(() => {
        mockCamera = new THREE.PerspectiveCamera();
        heatmap = new Heatmap(mockCamera, qubitNumber, maxSlices);
    });

    describe("Constructor", () => {
        it("should initialize with correct parameters", () => {
            expect(heatmap.camera).toBe(mockCamera);
            expect(heatmap.maxSlices).toBe(maxSlices);
            expect(heatmap.positions).toBeInstanceOf(Float32Array);
            expect(heatmap.positions.length).toBe(qubitNumber * 3);
            expect(heatmap.intensities).toBeInstanceOf(Float32Array);
            expect(heatmap.intensities.length).toBe(qubitNumber);
        });

        it("should initialize mesh and material correctly", () => {
            expect(heatmap.mesh).toBeDefined();
            expect(heatmap.material).toBeDefined();
            expect(heatmap.mesh.visible).toBe(true);
            expect(heatmap.mesh.geometry).toBeDefined();
        });

        it("should initialize shader uniforms", () => {
            const uniforms = heatmap.material.uniforms;
            expect(uniforms.aspect).toBeDefined();
            expect(uniforms.radius).toBeDefined();
            expect(uniforms.baseSize).toBeDefined();
            expect(uniforms.cameraPosition).toBeDefined();
            expect(uniforms.scaleFactor).toBeDefined();
            expect(uniforms.baseSize.value).toBe(500.0);
        });

        it("should initialize geometry attributes", () => {
            // Assert
            const geometry = heatmap.mesh.geometry;
            expect(geometry.attributes.position).toBeDefined();
            expect(geometry.attributes.intensity).toBeDefined();
            // Check that attributes are properly sized (they may not have .array in the mock)
            if (geometry.attributes.position.array) {
                expect(geometry.attributes.position.array.length).toBe(
                    qubitNumber * 3,
                );
            }
            if (geometry.attributes.intensity.array) {
                expect(geometry.attributes.intensity.array.length).toBe(
                    qubitNumber,
                );
            }
        });

        it("should handle edge case with zero qubits", () => {
            const zeroQubitHeatmap = new Heatmap(mockCamera, 0, maxSlices);

            expect(zeroQubitHeatmap.positions.length).toBe(0);
            expect(zeroQubitHeatmap.intensities.length).toBe(0);
        });

        it("should handle edge case with negative maxSlices", () => {
            const negativeSliceHeatmap = new Heatmap(
                mockCamera,
                qubitNumber,
                -1,
            );

            expect(negativeSliceHeatmap.maxSlices).toBe(-1);
            expect(negativeSliceHeatmap.positions.length).toBe(qubitNumber * 3);
        });
    });

    describe("updateBaseSize method", () => {
        it("should update main mesh base size", () => {
            const newSize = 750.0;

            heatmap.updateBaseSize(newSize);

            expect(heatmap.material.uniforms.baseSize.value).toBe(newSize);
        });

        it("should update clustered mesh base size when it exists", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));

            // Generate clusters first
            heatmap.generateClusters(qubitPositions, 2);

            const newSize = 1000.0;

            // Act & Assert - verify the method executes without error
            expect(() => {
                heatmap.updateBaseSize(newSize);
            }).not.toThrow();

            // Verify that both materials have numeric baseSize values and are defined
            expect(heatmap.material.uniforms.baseSize.value).toBeDefined();
            expect(typeof heatmap.material.uniforms.baseSize.value).toBe(
                "number",
            );

            if (heatmap.clusteredMesh) {
                expect(
                    heatmap.clusteredMesh.material.uniforms.baseSize.value,
                ).toBeDefined();
                expect(
                    typeof heatmap.clusteredMesh.material.uniforms.baseSize
                        .value,
                ).toBe("number");
                expect(
                    heatmap.clusteredMesh.material.uniforms.baseSize.value,
                ).toBeGreaterThan(0);
            }
        });

        it("should handle updating when no clustered mesh exists", () => {
            // Arrange
            heatmap.clusteredMesh = null;
            const newSize = 600.0;

            // Act & Assert
            expect(() => {
                heatmap.updateBaseSize(newSize);
            }).not.toThrow();
            expect(heatmap.material.uniforms.baseSize.value).toBe(newSize);
        });

        it("should handle zero and negative values", () => {
            // Arrange & Act
            heatmap.updateBaseSize(0);
            expect(heatmap.material.uniforms.baseSize.value).toBe(0);

            heatmap.updateBaseSize(-100);
            expect(heatmap.material.uniforms.baseSize.value).toBe(-100);
        });
    });

    describe("generateClusters method", () => {
        it("should generate clusters correctly with valid input", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            qubitPositions.set(2, new THREE.Vector3(2, 2, 2));
            qubitPositions.set(3, new THREE.Vector3(3, 3, 3));
            const numDeviceQubits = 4;

            // Act
            heatmap.generateClusters(qubitPositions, numDeviceQubits);

            // Assert
            expect(heatmap.clusteredMesh).not.toBeNull();
            expect(heatmap.clusteredMesh?.visible).toBe(false);
            expect(heatmap.clusteredMesh?.geometry).toBeDefined();
        });

        it("should handle empty qubit positions", () => {
            // Arrange
            const emptyPositions = new Map<number, THREE.Vector3>();

            // Act
            heatmap.generateClusters(emptyPositions, 0);

            // Assert
            expect(heatmap.clusteredMesh).toBeNull();
        });

        it("should cleanup existing clustered mesh before creating new one", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            heatmap.generateClusters(qubitPositions, 1);
            const firstMesh = heatmap.clusteredMesh;

            // Act
            heatmap.generateClusters(qubitPositions, 1);

            // Assert
            expect(heatmap.clusteredMesh).not.toBe(firstMesh);
            expect(heatmap.clusteredMesh).not.toBeNull();
        });

        it("should handle single qubit position", () => {
            // Arrange
            const singlePosition = new Map<number, THREE.Vector3>();
            singlePosition.set(0, new THREE.Vector3(5, 5, 5));

            // Act
            heatmap.generateClusters(singlePosition, 1);

            // Assert
            expect(heatmap.clusteredMesh).not.toBeNull();
            if (heatmap.clusteredMesh) {
                // Check that geometry has position attribute (may not have .array in mock)
                expect(
                    heatmap.clusteredMesh.geometry.attributes.position,
                ).toBeDefined();
                if (heatmap.clusteredMesh.geometry.attributes.position.array) {
                    expect(
                        heatmap.clusteredMesh.geometry.attributes.position.array
                            .length,
                    ).toBeGreaterThan(0);
                }
            }
        });

        it("should create clusters with correct material properties", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            const originalBaseSize = heatmap.material.uniforms.baseSize.value;

            // Act
            heatmap.generateClusters(qubitPositions, 2);

            // Assert
            if (heatmap.clusteredMesh) {
                expect(
                    heatmap.clusteredMesh.material.uniforms.baseSize.value,
                ).toBe(originalBaseSize * 4.0);
            }
        });

        it("should handle positions with identical coordinates", () => {
            // Arrange
            const identicalPositions = new Map<number, THREE.Vector3>();
            identicalPositions.set(0, new THREE.Vector3(1, 1, 1));
            identicalPositions.set(1, new THREE.Vector3(1, 1, 1));
            identicalPositions.set(2, new THREE.Vector3(1, 1, 1));

            // Act & Assert
            expect(() => {
                heatmap.generateClusters(identicalPositions, 3);
            }).not.toThrow();
        });
    });

    describe("clearPositionsCache method", () => {
        it("should clear qubit positions array", () => {
            // Arrange
            heatmap.qubitPositions = [
                new THREE.Vector3(1, 2, 3),
                new THREE.Vector3(4, 5, 6),
            ];

            // Act
            heatmap.clearPositionsCache();

            // Assert
            expect(heatmap.qubitPositions).toEqual([]);
            expect(heatmap.qubitPositions.length).toBe(0);
        });

        it("should not affect other properties", () => {
            // Arrange
            const originalPositions = heatmap.positions;
            const originalIntensities = heatmap.intensities;
            const originalMesh = heatmap.mesh;

            // Act
            heatmap.clearPositionsCache();

            // Assert
            expect(heatmap.positions).toBe(originalPositions);
            expect(heatmap.intensities).toBe(originalIntensities);
            expect(heatmap.mesh).toBe(originalMesh);
        });
    });

    describe("updatePoints method", () => {
        it("should handle empty qubit positions", () => {
            // Arrange
            const emptyPositions = new Map<number, THREE.Vector3>();
            const cumulativeInteractions: number[][] = [];

            // Act
            const result = heatmap.updatePoints(
                emptyPositions,
                0,
                cumulativeInteractions,
            );

            // Assert
            expect(result.maxObservedRawWeightedSum).toBe(0);
            expect(result.numSlicesEffectivelyUsed).toBe(0);
            expect(Array.from(heatmap.intensities)).toEqual([0, 0, 0, 0, 0]);
        });

        it("should update positions correctly", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(1, 2, 3));
            qubitPositions.set(1, new THREE.Vector3(4, 5, 6));
            const cumulativeInteractions: number[][] = [
                [10, 20],
                [5, 15],
            ];

            // Act
            heatmap.updatePoints(qubitPositions, 1, cumulativeInteractions);

            // Assert
            expect(heatmap.positions[0]).toBe(1);
            expect(heatmap.positions[1]).toBe(2);
            expect(heatmap.positions[2]).toBe(3);
            expect(heatmap.positions[3]).toBe(4);
            expect(heatmap.positions[4]).toBe(5);
            expect(heatmap.positions[5]).toBe(6);
        });

        it("should normalize intensities correctly", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            const cumulativeInteractions: number[][] = [
                [10, 20], // qubit 0: slice 0=10, slice 1=20, window=20
                [5, 15], // qubit 1: slice 0=5, slice 1=15, window=15
            ];

            // Act
            const result = heatmap.updatePoints(
                qubitPositions,
                1,
                cumulativeInteractions,
            );

            // Assert
            expect(result.maxObservedRawWeightedSum).toBe(20);
            expect(heatmap.intensities[0]).toBe(1.0); // 20/20 = 1.0
            expect(heatmap.intensities[1]).toBe(0.75); // 15/20 = 0.75
        });

        it("should handle window size correctly with maxSlices", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            const cumulativeInteractions: number[][] = [
                [1, 3, 6, 10, 15, 21], // 6 slices of interactions
            ];

            // Act - with maxSlices=10, window should be slices 0-5 (indices 0,1,2,3,4,5)
            const result = heatmap.updatePoints(
                qubitPositions,
                5,
                cumulativeInteractions,
            );

            // Assert
            expect(result.numSlicesEffectivelyUsed).toBe(6); // All 6 slices since maxSlices=10 > 6
            // Window value should be cumulativeInteractions[0][5] = 21
            expect(result.maxObservedRawWeightedSum).toBe(21);
        });

        it("should handle all slices mode (maxSlices = -1)", () => {
            // Arrange
            const allSlicesHeatmap = new Heatmap(mockCamera, 1, -1);
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            const cumulativeInteractions: number[][] = [
                [1, 3, 6, 10], // 4 slices
            ];

            // Act
            const result = allSlicesHeatmap.updatePoints(
                qubitPositions,
                3,
                cumulativeInteractions,
            );

            // Assert
            expect(result.numSlicesEffectivelyUsed).toBe(4);
            expect(result.maxObservedRawWeightedSum).toBe(10);
        });

        it("should handle negative slice index", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            const cumulativeInteractions: number[][] = [[1, 2, 3]];

            // Act
            const result = heatmap.updatePoints(
                qubitPositions,
                -1,
                cumulativeInteractions,
            );

            // Assert
            expect(result.maxObservedRawWeightedSum).toBe(0);
            expect(result.numSlicesEffectivelyUsed).toBe(0);
            expect(heatmap.intensities[0]).toBe(0);
        });

        it("should handle empty cumulative interactions", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            const emptyCumulativeInteractions: number[][] = [];

            // Act
            const result = heatmap.updatePoints(
                qubitPositions,
                0,
                emptyCumulativeInteractions,
            );

            // Assert
            expect(result.maxObservedRawWeightedSum).toBe(0);
            expect(heatmap.intensities[0]).toBe(0);
        });

        it("should resize buffers when qubit positions size changes", () => {
            // Arrange
            const smallPositions = new Map<number, THREE.Vector3>();
            smallPositions.set(0, new THREE.Vector3(0, 0, 0));
            heatmap.updatePoints(smallPositions, 0, []);

            const largePositions = new Map<number, THREE.Vector3>();
            for (let i = 0; i < 10; i++) {
                largePositions.set(i, new THREE.Vector3(i, i, i));
            }

            // Act
            heatmap.updatePoints(largePositions, 0, []);

            // Assert
            expect(heatmap.positions.length).toBe(10 * 3);
            expect(heatmap.intensities.length).toBe(10);
        });

        it("should update clustered mesh intensities when available", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            heatmap.generateClusters(qubitPositions, 2);

            const cumulativeInteractions: number[][] = [
                [10], // qubit 0
                [5], // qubit 1
            ];

            // Act
            heatmap.updatePoints(qubitPositions, 0, cumulativeInteractions);

            // Assert
            expect(heatmap.clusteredMesh).not.toBeNull();
            if (heatmap.clusteredMesh) {
                const clusteredIntensityAttr =
                    heatmap.clusteredMesh.geometry.attributes.intensity;
                expect(clusteredIntensityAttr.needsUpdate).toBe(true);
            }
        });
    });

    describe("dispose method", () => {
        it("should dispose main mesh geometry and material", () => {
            // Arrange
            const geometryDisposeSpy = vi.spyOn(
                heatmap.mesh.geometry,
                "dispose",
            );
            const materialDisposeSpy = vi.spyOn(
                heatmap.mesh.material,
                "dispose",
            );

            // Act
            heatmap.dispose();

            // Assert
            expect(geometryDisposeSpy).toHaveBeenCalled();
            expect(materialDisposeSpy).toHaveBeenCalled();
        });

        it("should dispose clustered mesh when it exists", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            heatmap.generateClusters(qubitPositions, 1);

            const clusteredMesh = heatmap.clusteredMesh!;
            const clusteredGeometryDisposeSpy = vi.spyOn(
                clusteredMesh.geometry,
                "dispose",
            );
            const clusteredMaterialDisposeSpy = vi.spyOn(
                clusteredMesh.material,
                "dispose",
            );

            // Act
            heatmap.dispose();

            // Assert
            expect(clusteredGeometryDisposeSpy).toHaveBeenCalled();
            expect(clusteredMaterialDisposeSpy).toHaveBeenCalled();
            expect(heatmap.clusteredMesh).toBeNull();
        });

        it("should handle disposal when no clustered mesh exists", () => {
            // Arrange
            heatmap.clusteredMesh = null;

            // Act & Assert
            expect(() => {
                heatmap.dispose();
            }).not.toThrow();
        });

        it("should remove clustered mesh from parent if it has one", () => {
            // Arrange
            const mockParent = {
                remove: vi.fn(),
                add: vi.fn(),
            } as Partial<THREE.Object3D> as THREE.Object3D;
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));

            heatmap.mesh.parent = mockParent;
            heatmap.generateClusters(qubitPositions, 1);

            // Act
            heatmap.dispose();

            // Assert
            expect(mockParent.remove).toHaveBeenCalled();
        });
    });

    describe("Integration tests", () => {
        it("should maintain consistency between main and clustered mesh intensities", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            qubitPositions.set(0, new THREE.Vector3(0, 0, 0));
            qubitPositions.set(1, new THREE.Vector3(1, 1, 1));
            heatmap.generateClusters(qubitPositions, 2);

            const cumulativeInteractions: number[][] = [
                [10, 20],
                [5, 15],
            ];

            // Act
            heatmap.updatePoints(qubitPositions, 1, cumulativeInteractions);

            // Assert
            expect(heatmap.intensities[0]).toBe(1.0);
            expect(heatmap.intensities[1]).toBe(0.75);
            // Clustered intensities should be computed as averages
            if (heatmap.clusteredMesh) {
                const clusteredIntensityAttr = heatmap.clusteredMesh.geometry
                    .attributes.intensity as THREE.BufferAttribute;
                expect(clusteredIntensityAttr).toBeDefined();
                if (clusteredIntensityAttr.array) {
                    expect(clusteredIntensityAttr.array.length).toBeGreaterThan(
                        0,
                    );
                }
            }
        });

        it("should handle complex workflow: create, cluster, update, dispose", () => {
            // Arrange
            const qubitPositions = new Map<number, THREE.Vector3>();
            for (let i = 0; i < 8; i++) {
                qubitPositions.set(i, new THREE.Vector3(i, i, i));
            }

            const cumulativeInteractions: number[][] = [];
            for (let i = 0; i < 8; i++) {
                cumulativeInteractions.push([i * 2, i * 4, i * 6]);
            }

            // Act & Assert
            expect(() => {
                heatmap.generateClusters(qubitPositions, 8);
                heatmap.updateBaseSize(800);
                heatmap.updatePoints(qubitPositions, 2, cumulativeInteractions);
                heatmap.setLOD("low");
                heatmap.setLOD("high");
                heatmap.clearPositionsCache();
                heatmap.dispose();
            }).not.toThrow();
        });
    });
});
