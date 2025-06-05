import * as THREE from "three";
import { Qubit } from "./Qubit.js";
import { Slice } from "./Slice.js";

export class Heatmap {
    mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    positions: Float32Array;
    intensities: Float32Array;
    qubitPositions: THREE.Vector3[] = [];
    camera: THREE.PerspectiveCamera;
    maxSlices: number;

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
    }

    public clearPositionsCache() {
        this.qubitPositions = []; // Reset the internal cache
    }

    updatePoints(
        qubits: Map<number, Qubit>,
        currentSliceIndex: number,
        allSlicesData: Array<Slice>,
    ): { maxObservedRawWeightedSum: number; numSlicesEffectivelyUsed: number } {
        let posIndex = 0;

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

        const relevantSlicesData = allSlicesData.slice(
            windowStartSlice,
            windowEndSlice,
        );

        const rawInteractionCounts: number[] = [];
        let maxObservedRawInteractionCount = 0;

        for (
            let heatmapQubitId = 0;
            heatmapQubitId < this.positions.length / 3;
            heatmapQubitId++
        ) {
            const qubitInfo = qubits.get(heatmapQubitId);

            if (!this.qubitPositions[heatmapQubitId] && qubitInfo) {
                const posVec = new THREE.Vector3();
                qubitInfo.blochSphere.blochSphere.getWorldPosition(posVec);
                this.qubitPositions[heatmapQubitId] = posVec;
            }
            const pos = this.qubitPositions[heatmapQubitId];

            if (pos) {
                this.positions[posIndex++] = pos.x;
                this.positions[posIndex++] = pos.y;
                this.positions[posIndex++] = pos.z;
            } else {
                this.positions[posIndex++] = 0;
                this.positions[posIndex++] = 0;
                this.positions[posIndex++] = 0;
            }

            let interactionCount = 0;
            if (
                numSlicesInWindow > 0 &&
                relevantSlicesData.length === numSlicesInWindow
            ) {
                for (let i = 0; i < numSlicesInWindow; i++) {
                    const sliceDataForWindow = relevantSlicesData[i];
                    if (
                        sliceDataForWindow.interacting_qubits.has(
                            heatmapQubitId,
                        )
                    ) {
                        interactionCount++;
                    }
                }
            }
            rawInteractionCounts.push(interactionCount);
            if (interactionCount > maxObservedRawInteractionCount) {
                maxObservedRawInteractionCount = interactionCount;
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

        const positionAttr = this.mesh.geometry.attributes
            .position as THREE.BufferAttribute;
        positionAttr.needsUpdate = true;
        const intensityAttr = this.mesh.geometry.attributes
            .intensity as THREE.BufferAttribute;
        intensityAttr.needsUpdate = true;

        return {
            maxObservedRawWeightedSum: maxObservedRawInteractionCount, // Return the max raw count
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
        // this.mesh is removed from the scene by QubitGrid
        console.log("Heatmap disposed");
    }
}
