import * as THREE from "three";
import { Qubit } from "../../data/models/Qubit.js";
import { State } from "../../data/models/State.js";
import { BlochSphere } from "../objects/BlochSphere.js";

const CYLINDER_VERTEX_SHADER = `
    varying vec3 vNormal;
    attribute float instanceIntensity;
    varying float vIntensity;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vIntensity = instanceIntensity;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
`;

const CYLINDER_FRAGMENT_SHADER = `
    varying float vIntensity;
    uniform float uInactiveAlpha;
    varying vec3 vNormal;

    void main() {
        vec3 colorValue;
        float alphaValue;

        if (vIntensity <= 0.001) {
            alphaValue = uInactiveAlpha;
            colorValue = vec3(0.5, 0.5, 0.5);
        } else if (vIntensity <= 0.5) {
            alphaValue = 1.0;
            colorValue = vec3(vIntensity * 2.0, 1.0, 0.0);
        } else {
            alphaValue = 1.0;
            colorValue = vec3(1.0, 1.0 - (vIntensity - 0.5) * 2.0, 0.0);
        }
        gl_FragColor = vec4(colorValue, alphaValue);
    }
`;

interface RenderParameters {
    qubitScale: number;
    connectionThickness: number;
    inactiveElementAlpha: number;
}

export class RenderManager {
    private scene: THREE.Scene;
    private qubitInstances: Map<number, Qubit> = new Map();

    // Connection meshes
    private instancedConnectionMesh: THREE.InstancedMesh | null = null;
    private logicalConnectionMesh: THREE.InstancedMesh | null = null;
    private intensityAttribute: THREE.InstancedBufferAttribute | null = null;

    // Render parameters
    private renderParams: RenderParameters;
    private _isQubitRenderEnabled: boolean = true;
    private _areBlochSpheresVisible: boolean = false;
    private _areConnectionLinesVisible: boolean = true;

    // LOD management
    private currentLOD: "high" | "medium" | "low" = "high";

    // Weight calculation constants
    private readonly heatmapWeightBase = 1.3;
    private readonly heatmapYellowThreshold = 0.5;

    constructor(
        scene: THREE.Scene,
        initialQubitScale: number = 1.0,
        initialConnectionThickness: number = 0.05,
        initialInactiveElementAlpha: number = 0.1,
        initialBlochSpheresVisible: boolean = false,
        initialConnectionLinesVisible: boolean = true,
    ) {
        this.scene = scene;
        this.renderParams = {
            qubitScale: initialQubitScale,
            connectionThickness: initialConnectionThickness,
            inactiveElementAlpha: initialInactiveElementAlpha,
        };
        this._areBlochSpheresVisible = initialBlochSpheresVisible;
        this._areConnectionLinesVisible = initialConnectionLinesVisible;
    }

    // Getters
    get qubitCount(): number {
        return this.qubitInstances.size;
    }

    get parameters(): RenderParameters {
        return { ...this.renderParams };
    }

    get areBlochSpheresVisible(): boolean {
        return this._areBlochSpheresVisible;
    }

    get areConnectionLinesVisible(): boolean {
        return this._areConnectionLinesVisible;
    }

    get isQubitRenderEnabled(): boolean {
        return this._isQubitRenderEnabled;
    }

    /**
     * Initialize instanced connections for device coupling map
     */
    initializeInstancedConnections(maxConnections: number): void {
        this.clearInstancedConnections();

        if (maxConnections === 0) return;

        const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);

        const material = new THREE.ShaderMaterial({
            vertexShader: CYLINDER_VERTEX_SHADER,
            fragmentShader: CYLINDER_FRAGMENT_SHADER,
            uniforms: {
                uInactiveAlpha: {
                    value: this.renderParams.inactiveElementAlpha,
                },
            },
            transparent: true,
        });

        this.instancedConnectionMesh = new THREE.InstancedMesh(
            cylinderGeo,
            material,
            maxConnections,
        );
        this.instancedConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage,
        );
        this.intensityAttribute = new THREE.InstancedBufferAttribute(
            new Float32Array(maxConnections),
            1,
        );
        this.instancedConnectionMesh.geometry.setAttribute(
            "instanceIntensity",
            this.intensityAttribute,
        );
        this.scene.add(this.instancedConnectionMesh);
    }

    /**
     * Initialize logical connections for logical circuit view
     */
    initializeLogicalInstancedConnections(maxConnections: number): void {
        if (this.logicalConnectionMesh) {
            this.scene.remove(this.logicalConnectionMesh);
            this.logicalConnectionMesh.geometry.dispose();
            (this.logicalConnectionMesh.material as THREE.Material).dispose();
            this.logicalConnectionMesh = null;
        }

        if (maxConnections === 0) return;

        const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.75,
        });

        this.logicalConnectionMesh = new THREE.InstancedMesh(
            cylinderGeo,
            material,
            maxConnections,
        );
        this.logicalConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage,
        );
        this.scene.add(this.logicalConnectionMesh);
    }

    /**
     * Clear instanced connections
     */
    private clearInstancedConnections(): void {
        if (this.instancedConnectionMesh) {
            this.scene.remove(this.instancedConnectionMesh);
            this.instancedConnectionMesh.geometry.dispose();
            (
                this.instancedConnectionMesh.material as THREE.ShaderMaterial
            ).dispose();
            this.instancedConnectionMesh = null;
        }
    }

    /**
     * Create grid of qubits
     */
    createGrid(
        numQubitsToCreate: number,
        qubitPositions: Map<number, THREE.Vector3>,
    ): void {
        // Clean up existing qubits
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                this.scene.remove(qubit.blochSphere.blochSphere);
            }
            qubit.dispose();
        });
        this.qubitInstances.clear();

        // Determine if we should render qubit spheres
        this._isQubitRenderEnabled = numQubitsToCreate <= 1000;
        if (!this._isQubitRenderEnabled) {
            console.warn(
                `Device has ${numQubitsToCreate} qubits. Not rendering qubit spheres to maintain performance.`,
            );
        }

        // Create qubits
        for (let i = 0; i < numQubitsToCreate; i++) {
            this.createQubit(i, qubitPositions.get(i));
        }

        this.updateQubitOpacities([], 0);
    }

    /**
     * Create a single qubit
     */
    private createQubit(id: number, position?: THREE.Vector3): void {
        const qubit = new Qubit(id, State.ZERO, null);
        this.qubitInstances.set(id, qubit);

        // Create BlochSphere if rendering is enabled and spheres should be visible
        if (
            this._isQubitRenderEnabled &&
            this._areBlochSpheresVisible &&
            position
        ) {
            this.createBlochSphereForQubit(qubit, position);
        }
    }

    /**
     * Create BlochSphere for a qubit
     */
    private createBlochSphereForQubit(
        qubit: Qubit,
        position: THREE.Vector3,
    ): void {
        if (!qubit.blochSphere) {
            const blochSphere = new BlochSphere(
                position.x,
                position.y,
                position.z,
            );
            qubit.blochSphere = blochSphere;
            blochSphere.blochSphere.userData.qubitId = qubit.id;
            blochSphere.blochSphere.userData.qubitState = qubit.state;
            blochSphere.setScale(this.renderParams.qubitScale);
            this.scene.add(blochSphere.blochSphere);
        }
    }

    /**
     * Draw connections based on mode and data
     */
    drawConnections(
        visualizationMode: "compiled" | "logical",
        qubitPositions: Map<number, THREE.Vector3>,
        couplingMap: number[][] | null,
        currentSliceInteractionPairs: Array<{ q1: number; q2: number }>,
        cumulativeWeightedPairInteractions: Map<string, number[]>,
        currentSliceIndex: number,
        maxSlicesForHeatmap: number,
        processedSlicesCount: number,
    ): void {
        const yAxis = new THREE.Vector3(0, 1, 0);

        if (!this._areConnectionLinesVisible) {
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
            }
            if (this.logicalConnectionMesh) {
                this.logicalConnectionMesh.count = 0;
            }
            return;
        }

        if (visualizationMode === "logical") {
            this.drawLogicalConnections(
                currentSliceInteractionPairs,
                qubitPositions,
                yAxis,
            );
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
                this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
            }
        } else {
            this.drawCompiledConnections(
                couplingMap,
                qubitPositions,
                cumulativeWeightedPairInteractions,
                currentSliceIndex,
                maxSlicesForHeatmap,
                processedSlicesCount,
                yAxis,
            );
            if (this.logicalConnectionMesh) {
                this.logicalConnectionMesh.count = 0;
                this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
            }
        }
    }

    /**
     * Draw logical connections for logical mode
     */
    private drawLogicalConnections(
        currentSliceInteractionPairs: Array<{ q1: number; q2: number }>,
        qubitPositions: Map<number, THREE.Vector3>,
        yAxis: THREE.Vector3,
    ): void {
        if (
            !this.logicalConnectionMesh ||
            !this.logicalConnectionMesh.visible
        ) {
            if (this.logicalConnectionMesh) {
                this.logicalConnectionMesh.count = 0;
                this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        let instanceCount = 0;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const direction = new THREE.Vector3();

        currentSliceInteractionPairs.forEach((pair) => {
            const posA = qubitPositions.get(pair.q1);
            const posB = qubitPositions.get(pair.q2);

            if (posA && posB) {
                const distance = posA.distanceTo(posB);
                if (distance > 0) {
                    position.copy(posA).add(posB).multiplyScalar(0.5);
                    direction.subVectors(posB, posA).normalize();
                    quaternion.setFromUnitVectors(yAxis, direction);
                    scale.set(
                        this.renderParams.connectionThickness * 0.8,
                        distance,
                        this.renderParams.connectionThickness * 0.8,
                    );
                    matrix.compose(position, quaternion, scale);
                    this.logicalConnectionMesh.setMatrixAt(
                        instanceCount,
                        matrix,
                    );
                    instanceCount++;
                }
            }
        });

        this.logicalConnectionMesh.count = instanceCount;
        this.logicalConnectionMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Draw compiled connections for compiled mode
     */
    private drawCompiledConnections(
        couplingMap: number[][] | null,
        qubitPositions: Map<number, THREE.Vector3>,
        cumulativeWeightedPairInteractions: Map<string, number[]>,
        currentSliceIndex: number,
        maxSlicesForHeatmap: number,
        processedSlicesCount: number,
        yAxis: THREE.Vector3,
    ): void {
        if (
            !couplingMap ||
            !this.instancedConnectionMesh ||
            !this.instancedConnectionMesh.visible ||
            couplingMap.length === 0 ||
            qubitPositions.size === 0
        ) {
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
                this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        const lastLoadedSlice = processedSlicesCount - 1;
        const effectiveSliceIndex = Math.min(
            currentSliceIndex,
            lastLoadedSlice,
        );

        // Debug logging for "All" slices mode
        if (maxSlicesForHeatmap === -1) {
            console.log(`Connection heatmap debug - All slices mode:
                currentSliceIndex: ${currentSliceIndex}
                processedSlicesCount: ${processedSlicesCount}
                lastLoadedSlice: ${lastLoadedSlice}
                effectiveSliceIndex: ${effectiveSliceIndex}
                cumulativeData available pairs: ${cumulativeWeightedPairInteractions.size}`);
        }

        const weight_base = this.heatmapWeightBase;

        const windowEndSlice = effectiveSliceIndex + 1;
        let windowStartSlice;
        if (maxSlicesForHeatmap === -1) {
            windowStartSlice = 0;
            console.log(`Window calculation (All slices):
                effectiveSliceIndex: ${effectiveSliceIndex}
                windowEndSlice: ${windowEndSlice}
                windowStartSlice: ${windowStartSlice}
                numSlicesInWindow: ${windowEndSlice - windowStartSlice}`);
        } else {
            windowStartSlice = Math.max(
                0,
                windowEndSlice - maxSlicesForHeatmap,
            );
        }
        const numSlicesInWindow = windowEndSlice - windowStartSlice;

        const pairData: Array<{
            idA: number;
            idB: number;
            rawSum: number;
            posA?: THREE.Vector3;
            posB?: THREE.Vector3;
        }> = [];

        // Calculate pair interaction intensities
        for (const pair of couplingMap) {
            if (pair.length === 2) {
                const qubitIdA = pair[0];
                const qubitIdB = pair[1];
                const posA = qubitPositions.get(qubitIdA);
                const posB = qubitPositions.get(qubitIdB);

                if (!posA || !posB || posA.distanceTo(posB) === 0) {
                    pairData.push({ idA: qubitIdA, idB: qubitIdB, rawSum: 0 });
                    continue;
                }

                const q1 = Math.min(qubitIdA, qubitIdB);
                const q2 = Math.max(qubitIdA, qubitIdB);
                const key = `${q1}-${q2}`;

                let currentPairWeightedSum = 0;
                if (
                    numSlicesInWindow > 0 &&
                    cumulativeWeightedPairInteractions.has(key)
                ) {
                    const scaledCumulativeWeights =
                        cumulativeWeightedPairInteractions.get(key)!;
                    const C = windowEndSlice - 1;

                    if (C >= 0 && C < scaledCumulativeWeights.length) {
                        const S_prime_C = scaledCumulativeWeights[C];
                        const S_prime_Start_minus_1 =
                            windowStartSlice > 0
                                ? scaledCumulativeWeights[windowStartSlice - 1]
                                : 0;
                        const numSlicesInWindow = C - windowStartSlice + 1;
                        if (numSlicesInWindow > 0) {
                            currentPairWeightedSum =
                                S_prime_C -
                                S_prime_Start_minus_1 *
                                    Math.pow(weight_base, -numSlicesInWindow);
                        }

                        // Debug logging for first pair when in "All" mode
                        if (
                            maxSlicesForHeatmap === -1 &&
                            qubitIdA === 0 &&
                            qubitIdB === 1
                        ) {
                            console.log(`Sample pair 0-1 calculation details:
                                C (windowEndSlice-1): ${C}
                                scaledCumulativeWeights.length: ${scaledCumulativeWeights.length}
                                S_prime_C: ${S_prime_C.toFixed(4)}
                                S_prime_Start_minus_1: ${S_prime_Start_minus_1.toFixed(4)}
                                weight_base: ${weight_base}
                                numSlicesInWindow: ${numSlicesInWindow}
                                Math.pow(weight_base, -numSlicesInWindow): ${Math.pow(weight_base, -numSlicesInWindow).toFixed(4)}
                                Final currentPairWeightedSum: ${currentPairWeightedSum.toFixed(4)}`);
                        }
                    }
                }

                pairData.push({
                    idA: qubitIdA,
                    idB: qubitIdB,
                    rawSum: currentPairWeightedSum,
                    posA,
                    posB,
                });
            }
        }

        const maxObservedRawPairSum = Math.max(
            ...pairData.map((p) => p.rawSum),
            0,
        );

        // Debug logging for "All" slices mode - show sample calculations
        if (maxSlicesForHeatmap === -1 && pairData.length > 0) {
            console.log(`Connection intensity calculations (All slices):
                Total pairs: ${pairData.length}
                Max observed raw sum: ${maxObservedRawPairSum}
                Sample pair calculations:`);

            // Show first 3 pairs with non-zero sums
            const nonZeroPairs = pairData
                .filter((p) => p.rawSum > 0)
                .slice(0, 3);
            nonZeroPairs.forEach((pair, index) => {
                console.log(
                    `  Pair ${index + 1} (${pair.idA}-${pair.idB}): rawSum=${pair.rawSum.toFixed(4)}, normalized=${(pair.rawSum / maxObservedRawPairSum).toFixed(4)}`,
                );
            });

            if (nonZeroPairs.length === 0) {
                console.log("  No pairs with non-zero interaction sums found!");
            }
        }

        // Render connections
        let instanceCount = 0;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const direction = new THREE.Vector3();

        if (!this.intensityAttribute) return;

        for (const data of pairData) {
            if (!data.posA || !data.posB) continue;

            const distance = data.posA.distanceTo(data.posB);
            if (distance === 0) continue;

            let calculatedNormalizedIntensity = 0;
            if (maxObservedRawPairSum > 0) {
                calculatedNormalizedIntensity =
                    data.rawSum / maxObservedRawPairSum;
            } else if (maxSlicesForHeatmap === 0 && data.rawSum === 1.0) {
                calculatedNormalizedIntensity = 1.0;
            }

            let finalConnectionIntensity = calculatedNormalizedIntensity;
            if (data.rawSum > 0.0001) {
                finalConnectionIntensity = Math.max(
                    calculatedNormalizedIntensity,
                    0.002,
                );
            } else {
                finalConnectionIntensity = 0;
            }

            position.copy(data.posA).add(data.posB).multiplyScalar(0.5);
            direction.subVectors(data.posB, data.posA).normalize();
            quaternion.setFromUnitVectors(yAxis, direction);
            scale.set(
                this.renderParams.connectionThickness,
                distance,
                this.renderParams.connectionThickness,
            );
            matrix.compose(position, quaternion, scale);
            this.instancedConnectionMesh.setMatrixAt(instanceCount, matrix);

            this.intensityAttribute.setX(
                instanceCount,
                finalConnectionIntensity,
            );
            instanceCount++;
        }

        // Update shader uniforms
        (
            this.instancedConnectionMesh.material as THREE.ShaderMaterial
        ).uniforms.uInactiveAlpha.value =
            this.renderParams.inactiveElementAlpha;

        this.instancedConnectionMesh.count = instanceCount;
        this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
        this.intensityAttribute.needsUpdate = true;
    }

    /**
     * Update qubit opacities based on interaction intensity
     */
    updateQubitOpacities(
        lastCalculatedSlicesChangeIDs: Array<Set<number>>,
        maxSlicesForHeatmap: number,
    ): void {
        this.qubitInstances.forEach((qubit, qubitId) => {
            if (qubit.blochSphere) {
                const intensity = this.getQubitInteractionIntensity(
                    qubitId,
                    lastCalculatedSlicesChangeIDs,
                    maxSlicesForHeatmap,
                );
                if (intensity <= 0.001) {
                    qubit.blochSphere.setOpacity(
                        this.renderParams.inactiveElementAlpha,
                    );
                } else {
                    qubit.blochSphere.setOpacity(1.0);
                }
            }
        });
    }

    /**
     * Calculate qubit interaction intensity
     */
    private getQubitInteractionIntensity(
        qubitId: number,
        slicesChangeData: Array<Set<number>>,
        maxSlicesForHeatmap: number,
    ): number {
        let interactionCount = 0;
        if (!slicesChangeData || !Array.isArray(slicesChangeData)) return 0;

        const slicesToConsider = slicesChangeData.slice(0, maxSlicesForHeatmap);
        slicesToConsider.forEach((sliceInteractionSet) => {
            if (
                sliceInteractionSet instanceof Set &&
                sliceInteractionSet.has(qubitId)
            ) {
                interactionCount++;
            }
        });

        if (
            slicesToConsider.length === 0 &&
            this.qubitInstances.has(qubitId) &&
            maxSlicesForHeatmap > 0
        ) {
            return 0;
        }
        if (slicesToConsider.length === 0 && maxSlicesForHeatmap === 0)
            return 0;
        if (slicesToConsider.length === 0) return 0;

        return interactionCount / slicesToConsider.length;
    }

    /**
     * Update qubit states based on slice data
     */
    updateQubitStates(interactingQubits: Set<number>): void {
        this.qubitInstances.forEach((qubit, id) => {
            const targetState = interactingQubits.has(id)
                ? State.ONE
                : State.ZERO;
            qubit.state = targetState;
            if (qubit.blochSphere) {
                qubit.blochSphere.blochSphere.userData.qubitState = targetState;
            }
        });
    }

    /**
     * Update qubit positions
     */
    updateQubitPositions(qubitPositions: Map<number, THREE.Vector3>): void {
        this.qubitInstances.forEach((qubit, id) => {
            const position = qubitPositions.get(id);
            if (position && qubit.blochSphere) {
                qubit.blochSphere.blochSphere.position.set(
                    position.x,
                    position.y,
                    position.z,
                );
            }
        });
    }

    /**
     * Set qubit scale
     */
    setQubitScale(scale: number): void {
        this.renderParams.qubitScale = scale;
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere) {
                qubit.blochSphere.setScale(scale);
            }
        });
    }

    /**
     * Set connection thickness
     */
    setConnectionThickness(thickness: number): void {
        this.renderParams.connectionThickness = thickness;
    }

    /**
     * Set inactive element alpha
     */
    setInactiveElementAlpha(alpha: number): void {
        this.renderParams.inactiveElementAlpha = alpha;
    }

    /**
     * Set BlochSphere visibility
     */
    setBlochSpheresVisible(
        visible: boolean,
        qubitPositions: Map<number, THREE.Vector3>,
    ): void {
        this._areBlochSpheresVisible = visible;

        if (visible) {
            // Lazy-create Bloch spheres if they don't exist
            this.qubitInstances.forEach((qubit) => {
                if (!qubit.blochSphere) {
                    const pos =
                        qubitPositions.get(qubit.id) || new THREE.Vector3();
                    this.createBlochSphereForQubit(qubit, pos);
                }
                if (qubit.blochSphere) {
                    qubit.blochSphere.blochSphere.visible = true;
                }
            });
        } else {
            // Just hide them if they exist
            this.qubitInstances.forEach((qubit) => {
                if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                    qubit.blochSphere.blochSphere.visible = false;
                }
            });
        }
    }

    /**
     * Set connection lines visibility
     */
    setConnectionLinesVisible(visible: boolean): void {
        this._areConnectionLinesVisible = visible;
        if (this.instancedConnectionMesh) {
            this.instancedConnectionMesh.visible = visible;
        }
        if (this.logicalConnectionMesh) {
            this.logicalConnectionMesh.visible = visible;
        }
    }

    /**
     * Update Level of Detail based on camera distance
     */
    updateLOD(cameraDistance: number, layoutAreaSide: number): void {
        if (layoutAreaSide === 0) return;

        let level: "high" | "medium" | "low";
        if (cameraDistance > layoutAreaSide * 5) {
            level = "low";
        } else if (cameraDistance > layoutAreaSide * 3) {
            level = "medium";
        } else {
            level = "high";
        }

        if (level !== this.currentLOD) {
            this.setLOD(level);
        }
    }

    /**
     * Set Level of Detail
     */
    private setLOD(level: "high" | "medium" | "low"): void {
        if (this.currentLOD === level) return;
        this.currentLOD = level;

        this.qubitInstances.forEach((qubit) => {
            qubit.setLOD(level);
        });
    }

    /**
     * Get qubit instance
     */
    getQubit(qubitId: number): Qubit | undefined {
        return this.qubitInstances.get(qubitId);
    }

    /**
     * Check if qubit exists
     */
    hasQubit(qubitId: number): boolean {
        return this.qubitInstances.has(qubitId);
    }

    /**
     * Get all qubit IDs
     */
    getQubitIds(): number[] {
        return Array.from(this.qubitInstances.keys());
    }

    /**
     * Dispose of all rendering resources
     */
    dispose(): void {
        console.log("RenderManager dispose called");

        // Dispose qubits
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere && qubit.blochSphere.blochSphere) {
                this.scene.remove(qubit.blochSphere.blochSphere);
            }
            qubit.dispose();
        });
        this.qubitInstances.clear();

        // Dispose connection meshes
        this.clearInstancedConnections();
        if (this.logicalConnectionMesh) {
            this.scene.remove(this.logicalConnectionMesh);
            this.logicalConnectionMesh.geometry.dispose();
            (this.logicalConnectionMesh.material as THREE.Material).dispose();
            this.logicalConnectionMesh = null;
        }

        console.log("RenderManager resources cleaned up");
    }
}
