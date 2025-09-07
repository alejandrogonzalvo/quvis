import * as THREE from "three";

export class Heatmap {
    mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    positions: Float32Array;
    intensities: Float32Array;
    qubitPositions: THREE.Vector3[] = [];
    camera: THREE.PerspectiveCamera;
    maxSlices: number;
    
    // Two-pass rendering system
    private renderTarget: THREE.WebGLRenderTarget;
    private intensityScene: THREE.Scene;
    private colorMappingScene: THREE.Scene;
    private colorMappingMaterial: THREE.ShaderMaterial;
    private colorMappingMesh: THREE.Mesh;

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
        
        // Create render target for intensity accumulation
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
            }
        );
        
        // Create scenes for two-pass rendering
        this.intensityScene = new THREE.Scene();
        this.colorMappingScene = new THREE.Scene();
        
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

        // First pass: intensity accumulation shader
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
                varying float vIntensity;
                
                void main() {
                    vec2 coord = gl_PointCoord * 2.0 - vec2(1.0);
                    float distance = length(coord);
                    
                    // Alpha for particle shape (soft edges)
                    float particleAlpha = smoothstep(radius, radius * 0.1, distance);
                    if (particleAlpha < 0.001) discard;
                    
                    // Clamp vIntensity to [0,1]
                    float clampedIntensity = clamp(vIntensity, 0.0, 1.0);
                    
                    // Threshold for zero interactions
                    const float zeroThreshold = 0.001;
                    if (clampedIntensity < zeroThreshold) {
                        discard;
                    }
                    
                    // Output white intensity that will be accumulated
                    float outputIntensity = clampedIntensity * particleAlpha;
                    gl_FragColor = vec4(outputIntensity, outputIntensity, outputIntensity, outputIntensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
        });

        this.mesh = new THREE.Points(geometry, this.material);
        this.mesh.visible = true;
        this.intensityScene.add(this.mesh);
        
        // Second pass: color mapping shader
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        this.colorMappingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tIntensity: { value: this.renderTarget.texture },
                maxIntensity: { value: 1.0 },
                // Color transition thresholds
                fadeThreshold: { value: 0.1 }, // New fade threshold
                greenThreshold: { value: 0.3 },
                yellowThreshold: { value: 0.7 },
                // Power curve for smoothIntensity
                intensityPower: { value: 0.3 },
                // Min intensity threshold for discarding pixels
                minIntensity: { value: 0.01 },
                // Border width for black contour
                borderWidth: { value: 0.0 },
                // Light background mode for border color
                isLightBackground: { value: false },
                // Fixed colors
                greenColor: { value: new THREE.Vector3(0.0, 1.0, 0.0) },
                yellowColor: { value: new THREE.Vector3(1.0, 1.0, 0.0) },
                redColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
            },
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tIntensity;
                uniform float maxIntensity;
                uniform float minIntensity;
                uniform float fadeThreshold;
                uniform float greenThreshold;
                uniform float yellowThreshold;
                uniform float intensityPower;
                uniform float borderWidth;
                uniform bool isLightBackground;
                uniform vec3 greenColor;
                uniform vec3 yellowColor;
                uniform vec3 redColor;
                varying vec2 vUv;
                
                void main() {
                    vec2 uv = gl_FragCoord.xy / vec2(textureSize(tIntensity, 0));
                    vec4 intensityData = texture2D(tIntensity, uv);
                    float intensity = intensityData.r; // Use red channel for intensity
                    
                    // Normalize intensity based on expected max
                    float normalizedIntensity = clamp(intensity / maxIntensity, 0.0, 1.0);
                    
                    // Discard pixels below minimum intensity threshold
                    if (normalizedIntensity < minIntensity) {
                        discard;
                    }
                    
                    // Configurable color mapping
                    vec3 colorValue;
                    
                    // Use configurable power curve
                    float smoothIntensity = pow(normalizedIntensity, intensityPower);
                    
                    // Calculate alpha based on fadeThreshold for green zones
                    float alpha = 1.0;
                    
                    // Normal color mapping with border zone (offset by minIntensity)
                    float effectiveBorderThreshold = minIntensity + borderWidth;
                    if (borderWidth > 0.0 && smoothIntensity >= minIntensity && smoothIntensity <= effectiveBorderThreshold) {
                        // Border zone: solid border color for low intensities (ignores fade threshold)
                        colorValue = isLightBackground ? vec3(0.0, 0.0, 0.0) : vec3(1.0, 1.0, 1.0);
                        alpha = 1.0;
                    } else if (smoothIntensity <= greenThreshold) {
                        // Pure green for low values (borderWidth - greenThreshold)
                        colorValue = greenColor;
                        
                        // Apply fade effect: 0% opacity at fadeThreshold, 100% opacity at greenThreshold
                        // But only if we're not in the border zone
                        if (borderWidth > 0.0 && smoothIntensity <= borderWidth) {
                            // Skip fade logic for border zone
                            alpha = 1.0;
                        } else if (smoothIntensity <= fadeThreshold) {
                            alpha = 0.0;
                        } else if (smoothIntensity < greenThreshold) {
                            float fadeRange = greenThreshold - fadeThreshold;
                            if (fadeRange > 0.0001) {
                                alpha = (smoothIntensity - fadeThreshold) / fadeRange;
                            } else {
                                alpha = 1.0;
                            }
                        }
                    } else if (smoothIntensity <= yellowThreshold) {
                        // Green to Yellow transition (greenThreshold - yellowThreshold)
                        float range = yellowThreshold - greenThreshold;
                        float t = range > 0.0001 ? (smoothIntensity - greenThreshold) / range : 0.0;
                        colorValue = mix(greenColor, yellowColor, t);
                        // Full opacity for yellow and above
                        alpha = 1.0;
                    } else {
                        // Yellow to Red transition (yellowThreshold - 1.0)
                        float range = 1.0 - yellowThreshold;
                        float t = range > 0.0001 ? (smoothIntensity - yellowThreshold) / range : 0.0;
                        colorValue = mix(yellowColor, redColor, t);
                        // Full opacity for red
                        alpha = 1.0;
                    }
                    
                    gl_FragColor = vec4(colorValue, alpha);
                }
            `,
            transparent: true,
            depthTest: false,
        });
        
        this.colorMappingMesh = new THREE.Mesh(quadGeometry, this.colorMappingMaterial);
        this.colorMappingScene.add(this.colorMappingMesh);
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
        let windowStartSlice: number;
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
                    heatmapQubitId < cumulativeInteractions.length &&
                    cumulativeInteractions[heatmapQubitId] && 
                    cumulativeInteractions[heatmapQubitId].length > 0
                ) {
                    // Check if we have enough data for the requested window
                    const qubitCumulativeData = cumulativeInteractions[heatmapQubitId];
                    const maxAvailableSlice = qubitCumulativeData.length - 1;
                    
                    if (maxAvailableSlice >= 0) {
                        // Use the available data, clamping indices to what we have
                        const effectiveEndSlice = Math.min(windowEndSlice - 1, maxAvailableSlice);
                        const effectiveStartSlice = Math.max(0, Math.min(windowStartSlice - 1, maxAvailableSlice));
                        
                        if (effectiveEndSlice >= 0) {
                            const cumulativeAtEnd = qubitCumulativeData[effectiveEndSlice];
                            const cumulativeAtStart = windowStartSlice > 0 && effectiveStartSlice >= 0
                                ? qubitCumulativeData[effectiveStartSlice]
                                : 0;
                            interactionCount = Math.max(0, cumulativeAtEnd - cumulativeAtStart);
                        }
                    }
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

    public render(renderer: THREE.WebGLRenderer, targetScene?: THREE.Scene): void {
        // Update max intensity for proper normalization
        let maxIntensity = 0;
        for (let i = 0; i < this.intensities.length; i++) {
            if (this.intensities[i] > maxIntensity) {
                maxIntensity = this.intensities[i];
            }
        }
        this.colorMappingMaterial.uniforms.maxIntensity.value = Math.max(maxIntensity, 0.1);
        
        // First pass: Render intensity accumulation to render target
        renderer.setRenderTarget(this.renderTarget);
        renderer.clear();
        renderer.render(this.intensityScene, this.camera);
        
        // Second pass: Render color-mapped result to final target
        renderer.setRenderTarget(null);
        if (targetScene) {
            // If we have a target scene, add our color mapping mesh temporarily
            targetScene.add(this.colorMappingMesh);
            renderer.render(targetScene, this.camera);
            targetScene.remove(this.colorMappingMesh);
        } else {
            // Direct render of color mapping
            renderer.render(this.colorMappingScene, this.camera);
        }
    }

    public resize(width: number, height: number): void {
        this.renderTarget.setSize(width, height);
        this.material.uniforms.aspect.value = width / height;
    }

    public updateColorParameters(params: {
        fadeThreshold?: number;
        greenThreshold?: number;
        yellowThreshold?: number;
        intensityPower?: number;
        minIntensity?: number;
        borderWidth?: number;
    }): void {
        if (!this.colorMappingMaterial || !this.colorMappingMaterial.uniforms) return;

        if (params.fadeThreshold !== undefined) {
            this.colorMappingMaterial.uniforms.fadeThreshold.value = params.fadeThreshold;
        }
        if (params.greenThreshold !== undefined) {
            this.colorMappingMaterial.uniforms.greenThreshold.value = params.greenThreshold;
        }
        if (params.yellowThreshold !== undefined) {
            this.colorMappingMaterial.uniforms.yellowThreshold.value = params.yellowThreshold;
        }
        if (params.intensityPower !== undefined) {
            this.colorMappingMaterial.uniforms.intensityPower.value = params.intensityPower;
        }
        if (params.minIntensity !== undefined) {
            this.colorMappingMaterial.uniforms.minIntensity.value = params.minIntensity;
        }
        if (params.borderWidth !== undefined) {
            this.colorMappingMaterial.uniforms.borderWidth.value = params.borderWidth;
        }
    }

    public updateLightBackground(isLight: boolean): void {
        if (this.colorMappingMaterial && this.colorMappingMaterial.uniforms) {
            this.colorMappingMaterial.uniforms.isLightBackground.value = isLight;
        }
    }


    public getColorParameters(): {
        fadeThreshold: number;
        greenThreshold: number;
        yellowThreshold: number;
        intensityPower: number;
        minIntensity: number;
        borderWidth: number;
    } {
        if (!this.colorMappingMaterial || !this.colorMappingMaterial.uniforms) {
            return {
                fadeThreshold: 0.1,
                greenThreshold: 0.3,
                yellowThreshold: 0.7,
                intensityPower: 0.3,
                minIntensity: 0.01,
                borderWidth: 0.0,
            };
        }

        const uniforms = this.colorMappingMaterial.uniforms;
        return {
            fadeThreshold: uniforms.fadeThreshold.value,
            greenThreshold: uniforms.greenThreshold.value,
            yellowThreshold: uniforms.yellowThreshold.value,
            intensityPower: uniforms.intensityPower.value,
            minIntensity: uniforms.minIntensity.value,
            borderWidth: uniforms.borderWidth.value,
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
        
        // Clean up two-pass rendering resources
        if (this.renderTarget) {
            this.renderTarget.dispose();
        }
        if (this.colorMappingMaterial) {
            this.colorMappingMaterial.dispose();
        }
        if (this.colorMappingMesh && this.colorMappingMesh.geometry) {
            this.colorMappingMesh.geometry.dispose();
        }
        
        // this.mesh is removed from the scene by QubitGrid
        console.log("Heatmap disposed");
    }
}
