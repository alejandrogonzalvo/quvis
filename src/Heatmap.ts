import * as THREE from "three";

export class Heatmap {
    mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    positions: Float32Array;
    intensities: Float32Array;
    qubitPositions: THREE.Vector3[] = [];
    camera: THREE.PerspectiveCamera;
    maxSlices: number;

    clusteredMesh: THREE.Points<
        THREE.BufferGeometry,
        THREE.ShaderMaterial
    > | null = null;
    private clusters: { position: THREE.Vector3; qubitIds: number[] }[] = [];
    private clusteredIntensities: Float32Array | null = null;

    constructor(
        camera: THREE.PerspectiveCamera,
        qubit_number: number,
        maxSlices: number,
    ) {
        this.camera = camera;
        this.maxSlices = maxSlices;
        const geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(qubit_number * 3);
        this.intensities = new Float32Array(qubit_number);

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(this.positions, 3),
        );
        geometry.setAttribute(
            "intensity",
            new THREE.BufferAttribute(this.intensities, 1),
        );

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                aspect: { value: window.innerWidth / window.innerHeight },
                radius: { value: 1.0 },
                baseSize: { value: 500.0 },
                cameraPosition: { value: new THREE.Vector3() },
                scaleFactor: { value: 1.0 },
            },
            vertexShader: `
                uniform float scaleFactor;
                uniform float baseSize;
                attribute float intensity;
                varying vec3 vPosition;
                varying float vIntensity;
                
                void main() {
                    vPosition = position;
                    vIntensity = intensity;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    float w = gl_Position.w;
                    if (w <= 0.0) w = 0.00001;
                    gl_PointSize = (baseSize * scaleFactor) / w;
                }
            `,
            fragmentShader: `
            uniform float radius;
            varying vec3 vPosition;
            varying float vIntensity; // This is now correctly normalized: 0 to 1 based on max_in_window
            
            void main() {
                vec2 coord = gl_PointCoord * 2.0 - vec2(1.0); // For circular points
                float distance = length(coord);
                
                // Alpha for particle shape (soft edges)
                float particleAlpha = smoothstep(radius, radius * 0.1, distance);
                if (particleAlpha < 0.001) discard; // Optimization: discard fully transparent fragments

                // Clamp vIntensity to [0,1] as good practice, though it should be already.
                float clampedIntensity = clamp(vIntensity, 0.0, 1.0);

                float intensityBasedAlpha;
                vec3 colorValue;

                // Threshold for an interaction to be considered \\"zero\\" for display
                const float zeroThreshold = 0.001; 
                // Threshold below which alpha ramps up (e.g., 10% of max interactions)
                // This means intensities from 0 to 0.1 of max will ramp up their alpha.
                const float alphaRampUpThreshold = 0.1; 

                if (clampedIntensity < zeroThreshold) {
                    intensityBasedAlpha = 0.0; // Fully transparent for zero interactions
                    // colorValue is irrelevant if alpha is 0, but set it to avoid undefined behavior
                    colorValue = vec3(0.0, 1.0, 0.0); // Default to Green
                } else {
                    // Ramp up alpha for low intensities, then solid alpha for higher intensities
                    intensityBasedAlpha = smoothstep(0.0, alphaRampUpThreshold, clampedIntensity);
                    
                    // Color transitions: Green -> Yellow -> Red based on clampedIntensity
                    if (clampedIntensity <= 0.5) {
                        // Transition from Green (0,1,0) towards Yellow (1,1,0) as intensity goes from 0 to 0.5
                        // At intensity 0 (or very near it), color is (0,1,0) -> Green
                        // At intensity 0.5, color is (1,1,0) -> Yellow
                        colorValue = vec3(clampedIntensity * 2.0, 1.0, 0.0);
                    } else {
                        // Transition from Yellow (1,1,0) towards Red (1,0,0) as intensity goes from 0.5 to 1.0
                        // At intensity 0.5, color is (1,1,0) -> Yellow
                        // At intensity 1.0, color is (1,0,0) -> Red
                        colorValue = vec3(1.0, 1.0 - (clampedIntensity - 0.5) * 2.0, 0.0);
                    }
                }
                
                gl_FragColor = vec4(colorValue, particleAlpha * intensityBasedAlpha);
            }
        `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
        });

        this.mesh = new THREE.Points(geometry, this.material);
        this.mesh.visible = true;
    }

    public generateClusters(
        qubitPositions: Map<number, THREE.Vector3>,
        numDeviceQubits: number,
    ) {
        if (this.clusteredMesh) {
            this.mesh.parent?.remove(this.clusteredMesh);
            this.clusteredMesh.geometry.dispose();
            this.clusteredMesh.material.dispose();
            this.clusteredMesh = null;
        }

        const bbox = new THREE.Box3();
        for (const pos of qubitPositions.values()) {
            bbox.expandByPoint(pos);
        }
        if (bbox.isEmpty() || numDeviceQubits === 0) {
            this.clusters = [];
            return;
        }

        const numClustersTarget = Math.ceil(numDeviceQubits / 4);
        const gridDivisions = Math.ceil(Math.pow(numClustersTarget, 1 / 3));

        const gridSize = new THREE.Vector3();
        bbox.getSize(gridSize);
        const cellSize = new THREE.Vector3(
            gridSize.x / gridDivisions,
            gridSize.y / gridDivisions,
            gridSize.z / gridDivisions,
        );
        if (cellSize.x === 0) cellSize.x = 1;
        if (cellSize.y === 0) cellSize.y = 1;
        if (cellSize.z === 0) cellSize.z = 1;

        const grid: Map<
            string,
            { positionSum: THREE.Vector3; qubitIds: number[] }
        > = new Map();

        for (const [id, pos] of qubitPositions.entries()) {
            const gridIndexX = Math.floor((pos.x - bbox.min.x) / cellSize.x);
            const gridIndexY = Math.floor((pos.y - bbox.min.y) / cellSize.y);
            const gridIndexZ = Math.floor((pos.z - bbox.min.z) / cellSize.z);
            const key = `${gridIndexX},${gridIndexY},${gridIndexZ}`;

            if (!grid.has(key)) {
                grid.set(key, {
                    positionSum: new THREE.Vector3(),
                    qubitIds: [],
                });
            }
            const cell = grid.get(key)!;
            cell.positionSum.add(pos);
            cell.qubitIds.push(id);
        }

        this.clusters = [];
        for (const cell of grid.values()) {
            if (cell.qubitIds.length > 0) {
                const avgPos = cell.positionSum.divideScalar(
                    cell.qubitIds.length,
                );
                this.clusters.push({
                    position: avgPos,
                    qubitIds: cell.qubitIds,
                });
            }
        }

        if (this.clusters.length === 0) return;

        const numClusters = this.clusters.length;
        const clusteredPositions = new Float32Array(numClusters * 3);
        this.clusteredIntensities = new Float32Array(numClusters);

        for (let i = 0; i < numClusters; i++) {
            clusteredPositions[i * 3] = this.clusters[i].position.x;
            clusteredPositions[i * 3 + 1] = this.clusters[i].position.y;
            clusteredPositions[i * 3 + 2] = this.clusters[i].position.z;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(clusteredPositions, 3),
        );
        geometry.setAttribute(
            "intensity",
            new THREE.BufferAttribute(this.clusteredIntensities, 1),
        );

        const clusteredMaterial = this.material.clone();
        clusteredMaterial.uniforms.baseSize.value =
            this.material.uniforms.baseSize.value * 4.0;

        this.clusteredMesh = new THREE.Points(geometry, clusteredMaterial);
        this.clusteredMesh.visible = false;
        this.mesh.parent?.add(this.clusteredMesh);
    }

    public updateBaseSize(newSize: number) {
        this.material.uniforms.baseSize.value = newSize;
        if (this.clusteredMesh) {
            this.clusteredMesh.material.uniforms.baseSize.value = newSize * 4;
        }
    }

    public setLOD(level: "high" | "low") {
        if (level === "low" && this.clusteredMesh) {
            this.mesh.visible = false;
            this.clusteredMesh.visible = true;
        } else {
            this.mesh.visible = true;
            if (this.clusteredMesh) {
                this.clusteredMesh.visible = false;
            }
        }
    }

    public clearPositionsCache() {
        this.qubitPositions = []; // Reset the internal cache
    }

    updatePoints(
        qubitPositions: Map<number, THREE.Vector3>,
        currentSliceIndex: number,
        cumulativeInteractions: number[][],
    ): { maxObservedRawWeightedSum: number; numSlicesEffectivelyUsed: number } {
        if (qubitPositions.size === 0) {
            this.intensities.fill(0);
            this.mesh.geometry.attributes.intensity.needsUpdate = true;
            if (this.clusteredIntensities) {
                this.clusteredIntensities.fill(0);
                this.clusteredMesh!.geometry.attributes.intensity.needsUpdate =
                    true;
            }
            return {
                maxObservedRawWeightedSum: 0,
                numSlicesEffectivelyUsed: 0,
            };
        }

        // The positions are now managed by QubitGrid and passed directly
        // We just need to update our internal buffer if the size mismatches
        if (this.positions.length !== qubitPositions.size * 3) {
            this.positions = new Float32Array(qubitPositions.size * 3);
            this.intensities = new Float32Array(qubitPositions.size);
            this.mesh.geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(this.positions, 3),
            );
            this.mesh.geometry.setAttribute(
                "intensity",
                new THREE.BufferAttribute(this.intensities, 1),
            );
        }

        qubitPositions.forEach((pos, id) => {
            this.positions[id * 3] = pos.x;
            this.positions[id * 3 + 1] = pos.y;
            this.positions[id * 3 + 2] = pos.z;
        });
        this.mesh.geometry.attributes.position.needsUpdate = true;

        let maxObservedRawWeightedSum = 0;
        const windowEndSlice = currentSliceIndex + 1;
        let windowStartSlice;
        if (this.maxSlices === -1) {
            // "All slices" mode
            windowStartSlice = 0;
        } else {
            // Fixed window size mode
            windowStartSlice = Math.max(0, windowEndSlice - this.maxSlices);
        }
        const numSlicesInWindow = windowEndSlice - windowStartSlice;

        const rawInteractionCounts: number[] = [];
        let maxObservedRawInteractionCount = 0;

        const numHeatmapPoints = this.positions.length / 3;

        if (
            cumulativeInteractions.length === 0 ||
            (cumulativeInteractions[0] &&
                cumulativeInteractions[0].length === 0) ||
            currentSliceIndex < 0
        ) {
            // Handle case with no data
            for (let i = 0; i < numHeatmapPoints; i++) {
                this.intensities[i] = 0;
                const pos = this.positions.slice(i * 3, i * 3 + 3);
                if (!this.qubitPositions[i] && pos.every(Number.isFinite)) {
                    this.qubitPositions[i] = new THREE.Vector3(
                        pos[0],
                        pos[1],
                        pos[2],
                    );
                }
                const posVec = this.qubitPositions[i];
                if (posVec) {
                    this.positions[i * 3] = posVec.x;
                    this.positions[i * 3 + 1] = posVec.y;
                    this.positions[i * 3 + 2] = posVec.z;
                } else {
                    this.positions[i * 3] = 0;
                    this.positions[i * 3 + 1] = 0;
                    this.positions[i * 3 + 2] = 0;
                }
            }
        } else {
            for (
                let heatmapQubitId = 0;
                heatmapQubitId < numHeatmapPoints;
                heatmapQubitId++
            ) {
                const pos = this.positions.slice(
                    heatmapQubitId * 3,
                    heatmapQubitId * 3 + 3,
                );
                if (
                    !this.qubitPositions[heatmapQubitId] &&
                    pos.every(Number.isFinite)
                ) {
                    this.qubitPositions[heatmapQubitId] = new THREE.Vector3(
                        pos[0],
                        pos[1],
                        pos[2],
                    );
                }
                const posVec = this.qubitPositions[heatmapQubitId];

                if (posVec) {
                    this.positions[heatmapQubitId * 3] = posVec.x;
                    this.positions[heatmapQubitId * 3 + 1] = posVec.y;
                    this.positions[heatmapQubitId * 3 + 2] = posVec.z;
                } else {
                    this.positions[heatmapQubitId * 3] = 0;
                    this.positions[heatmapQubitId * 3 + 1] = 0;
                    this.positions[heatmapQubitId * 3 + 2] = 0;
                }

                let interactionCount = 0;
                if (
                    numSlicesInWindow > 0 &&
                    heatmapQubitId < cumulativeInteractions.length
                ) {
                    const cumulativeAtEnd =
                        cumulativeInteractions[heatmapQubitId][
                            windowEndSlice - 1
                        ];
                    const cumulativeAtStart =
                        windowStartSlice > 0
                            ? cumulativeInteractions[heatmapQubitId][
                                  windowStartSlice - 1
                              ]
                            : 0;
                    interactionCount = cumulativeAtEnd - cumulativeAtStart;
                }

                rawInteractionCounts.push(interactionCount);
                if (interactionCount > maxObservedRawInteractionCount) {
                    maxObservedRawInteractionCount = interactionCount;
                }
            }
        }

        // Normalize intensities based on the maximum observed interaction count in the current window.
        const denominator =
            maxObservedRawInteractionCount > 0
                ? maxObservedRawInteractionCount
                : 1.0;

        for (let i = 0; i < rawInteractionCounts.length; i++) {
            const currentRawCount = rawInteractionCounts[i];
            if (maxObservedRawInteractionCount === 0) {
                // If no interactions anywhere, all intensities are 0
                this.intensities[i] = 0.0;
            } else {
                // Normalize intensity based on the max observed in the current set of slices.
                const normalizedIntensity = currentRawCount / denominator;
                // Ensure intensity is strictly within [0,1]
                this.intensities[i] = Math.max(
                    0.0,
                    Math.min(1.0, normalizedIntensity),
                );
            }
        }

        this.mesh.geometry.attributes.intensity.needsUpdate = true;

        if (
            this.clusteredMesh &&
            this.clusteredIntensities &&
            this.clusters.length > 0
        ) {
            const perQubitNormalizedIntensities = this.intensities;

            for (let i = 0; i < this.clusters.length; i++) {
                const cluster = this.clusters[i];
                let totalIntensity = 0;
                for (const qubitId of cluster.qubitIds) {
                    if (qubitId < perQubitNormalizedIntensities.length) {
                        totalIntensity +=
                            perQubitNormalizedIntensities[qubitId];
                    }
                }
                const avgIntensity =
                    cluster.qubitIds.length > 0
                        ? totalIntensity / cluster.qubitIds.length
                        : 0;
                this.clusteredIntensities[i] = avgIntensity;
            }

            (
                this.clusteredMesh.geometry.attributes
                    .intensity as THREE.BufferAttribute
            ).needsUpdate = true;
        }

        maxObservedRawWeightedSum = maxObservedRawInteractionCount;

        return {
            maxObservedRawWeightedSum,
            numSlicesEffectivelyUsed: numSlicesInWindow,
        };
    }

    public dispose(): void {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }

        if (this.clusteredMesh) {
            this.mesh.parent?.remove(this.clusteredMesh);
            this.clusteredMesh.geometry.dispose();
            this.clusteredMesh.material.dispose();
            this.clusteredMesh = null;
        }
        // this.mesh is removed from the scene by QubitGrid
        console.log("Heatmap disposed");
    }
}
