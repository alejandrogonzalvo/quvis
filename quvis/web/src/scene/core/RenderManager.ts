import * as THREE from 'three';
import { Qubit } from '../../data/models/Qubit.js';
import { State } from '../../data/models/State.js';
import { BlochSphere } from '../objects/BlochSphere.js';
import { CircuitDataManager } from '../../data/managers/CircuitDataManager.js';

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
    private currentLOD: 'high' | 'medium' | 'low' = 'high';

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
        private isLightBackground: () => boolean = () => false
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
            maxConnections
        );
        this.instancedConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage
        );
        this.intensityAttribute = new THREE.InstancedBufferAttribute(
            new Float32Array(maxConnections),
            1
        );
        this.instancedConnectionMesh.geometry.setAttribute(
            'instanceIntensity',
            this.intensityAttribute
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
        // Choose color based on background mode - dark color for light background, light color for dark background
        const color = this.isLightBackground() ? 0x0066cc : 0x00ffff; // Dark blue for light mode, cyan for dark mode
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.75,
        });

        this.logicalConnectionMesh = new THREE.InstancedMesh(
            cylinderGeo,
            material,
            maxConnections
        );
        this.logicalConnectionMesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage
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
        qubitPositions: Map<number, THREE.Vector3>
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
        this._isQubitRenderEnabled = numQubitsToCreate <= 2000;
        if (!this._isQubitRenderEnabled) {
            console.warn(
                `Device has ${numQubitsToCreate} qubits. Not rendering qubit spheres to maintain performance.`
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
        position: THREE.Vector3
    ): void {
        if (!qubit.blochSphere) {
            const blochSphere = new BlochSphere(
                position.x,
                position.y,
                position.z,
                this.isLightBackground
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
        visualizationMode: 'compiled' | 'logical',
        qubitPositions: Map<number, THREE.Vector3>,
        couplingMap: number[][] | null,
        currentSliceInteractionPairs: Array<{ q1: number; q2: number }>,
        dataManager: CircuitDataManager,
        currentSliceIndex: number,
        maxSlicesForHeatmap: number
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

        if (visualizationMode === 'logical') {
            this.drawLogicalConnections(
                currentSliceInteractionPairs,
                qubitPositions,
                yAxis
            );
            if (this.instancedConnectionMesh) {
                this.instancedConnectionMesh.count = 0;
                this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
            }
        } else {
            this.drawCompiledConnections(
                couplingMap,
                qubitPositions,
                dataManager,
                currentSliceIndex,
                maxSlicesForHeatmap,
                yAxis
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
        yAxis: THREE.Vector3
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
                        this.renderParams.connectionThickness * 0.8
                    );
                    matrix.compose(position, quaternion, scale);
                    this.logicalConnectionMesh.setMatrixAt(
                        instanceCount,
                        matrix
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
        dataManager: CircuitDataManager,
        currentSliceIndex: number,
        maxSlicesForHeatmap: number,
        yAxis: THREE.Vector3
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

        const lastLoadedSlice = dataManager.processedSlicesCount - 1;
        const effectiveSliceIndex = Math.min(
            currentSliceIndex,
            lastLoadedSlice
        );

        // Debug logging for "All" slices mode
        if (maxSlicesForHeatmap === -1) {
            console.log(`Connection heatmap debug - All slices mode:
                currentSliceIndex: ${currentSliceIndex}
                processedSlicesCount: ${dataManager.processedSlicesCount}
                lastLoadedSlice: ${lastLoadedSlice}
                effectiveSliceIndex: ${effectiveSliceIndex}
                cumulativeData available pairs: ${dataManager.cumulativeWeightedPairInteractionData.size}`);
        }

        const weight_base = this.heatmapWeightBase;

        let maxInteractionCountInWindow = 0;
        const interactionCounts = new Map<string, number>();

        for (const pair of couplingMap) {
            const q1 = Math.min(pair[0], pair[1]);
            const q2 = Math.max(pair[0], pair[1]);
            const key = `${q1}-${q2}`;

            const { interactionsInWindow } =
                dataManager.getInteractionCountForPair(
                    key,
                    effectiveSliceIndex,
                    maxSlicesForHeatmap
                );

            interactionCounts.set(key, interactionsInWindow);
            if (interactionsInWindow > maxInteractionCountInWindow) {
                maxInteractionCountInWindow = interactionsInWindow;
            }
        }

        const denominator =
            maxInteractionCountInWindow > 0 ? maxInteractionCountInWindow : 1;
        let visibleConnectionCount = 0;
        const matrix = new THREE.Matrix4();
        const position1 = new THREE.Vector3();
        const position2 = new THREE.Vector3();

        for (const pair of couplingMap) {
            const q1 = pair[0];
            const q2 = pair[1];

            const pos1 = qubitPositions.get(q1);
            const pos2 = qubitPositions.get(q2);

            if (pos1 && pos2) {
                position1.set(pos1.x, pos1.y, pos1.z);
                position2.set(pos2.x, pos2.y, pos2.z);

                const key = `${Math.min(q1, q2)}-${Math.max(q1, q2)}`;
                const interactionCount = interactionCounts.get(key) || 0;
                const normalizedIntensity = interactionCount / denominator;

                this.setConnectionTransform(
                    position1,
                    position2,
                    yAxis,
                    matrix
                );
                this.instancedConnectionMesh.setMatrixAt(
                    visibleConnectionCount,
                    matrix
                );
                this.intensityAttribute?.setX(
                    visibleConnectionCount,
                    normalizedIntensity
                );

                visibleConnectionCount++;
            }
        }

        this.instancedConnectionMesh.count = visibleConnectionCount;
        this.instancedConnectionMesh.instanceMatrix.needsUpdate = true;
        if (this.intensityAttribute) {
            this.intensityAttribute.needsUpdate = true;
        }
    }

    private setConnectionTransform(
        position1: THREE.Vector3,
        position2: THREE.Vector3,
        yAxis: THREE.Vector3,
        matrix: THREE.Matrix4
    ): void {
        const direction = new THREE.Vector3().subVectors(position2, position1);
        const distance = direction.length();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
            yAxis,
            direction.normalize()
        );
        const scale = new THREE.Vector3(
            this.renderParams.connectionThickness,
            distance,
            this.renderParams.connectionThickness
        );
        const position = new THREE.Vector3()
            .addVectors(position1, position2)
            .multiplyScalar(0.5);

        matrix.compose(position, quaternion, scale);
    }

    /**
     * Update qubit opacities based on interaction intensity
     */
    updateQubitOpacities(
        lastCalculatedSlicesChangeIDs: Array<Set<number>>,
        maxSlicesForHeatmap: number
    ): void {
        this.qubitInstances.forEach((qubit, qubitId) => {
            if (qubit.blochSphere) {
                const intensity = this.getQubitInteractionIntensity(
                    qubitId,
                    lastCalculatedSlicesChangeIDs,
                    maxSlicesForHeatmap
                );
                if (intensity <= 0.001) {
                    qubit.blochSphere.setOpacity(
                        this.renderParams.inactiveElementAlpha
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
        maxSlicesForHeatmap: number
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
                    position.z
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
        qubitPositions: Map<number, THREE.Vector3>
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
     * Update connection colors and sphere colors based on background mode
     */
    updateConnectionColors(): void {
        if (this.logicalConnectionMesh && this.logicalConnectionMesh.material instanceof THREE.MeshBasicMaterial) {
            // Choose color based on background mode - dark color for light background, light color for dark background
            const color = this.isLightBackground() ? 0x0044bb : 0x00ffff; // Dark blue for light mode, cyan for dark mode
            this.logicalConnectionMesh.material.color.setHex(color);
        }
        
        // Update all qubit sphere colors
        this.qubitInstances.forEach((qubit) => {
            if (qubit.blochSphere) {
                qubit.blochSphere.updateColors();
            }
        });
    }

    /**
     * Update Level of Detail based on camera distance
     */
    updateLOD(cameraDistance: number, layoutAreaSide: number): void {
        if (layoutAreaSide === 0) return;

        let level: 'high' | 'medium' | 'low';
        if (cameraDistance > layoutAreaSide * 5) {
            level = 'low';
        } else if (cameraDistance > layoutAreaSide * 3) {
            level = 'medium';
        } else {
            level = 'high';
        }

        if (level !== this.currentLOD) {
            this.setLOD(level);
        }
    }

    /**
     * Set Level of Detail
     */
    private setLOD(level: 'high' | 'medium' | 'low'): void {
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
        console.log('RenderManager dispose called');

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

        console.log('RenderManager resources cleaned up');
    }
}
