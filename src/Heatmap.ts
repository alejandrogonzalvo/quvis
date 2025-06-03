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
                baseSize: { value: 1000.0 },
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
                float distanceFromCenter = length(coord);
                
                float finalAlpha;
                vec3 colorValue;

                if (vIntensity <= 0.001) { // Check against a small epsilon for floating point
                    finalAlpha = 0.0; // Make transparent for zero or very low intensity
                    colorValue = vec3(0.0, 0.0, 0.0); // Color doesn't matter when alpha is 0
                } else {
                    // For active points, calculate alpha based on distance from center (for soft edges)
                    finalAlpha = smoothstep(radius, radius * 0.1, distanceFromCenter);
                    
                    // Determine color based on intensity
                    float yellow_threshold = 0.3; // Highlights start becoming "redder" (from yellow) above this intensity
                    float effective_vIntensity = clamp(vIntensity, 0.0, 1.0); // Ensure intensity is within [0,1]

                    if (effective_vIntensity <= yellow_threshold) {
                        // Intensity > 0.001 up to yellow_threshold: Greenish to Yellow
                        // Normalize effective_vIntensity from 0 to yellow_threshold for this range
                        float normalized_intensity_for_green_yellow;
                        if (yellow_threshold > 0.001) { // Avoid division by zero or near-zero if threshold is tiny
                           normalized_intensity_for_green_yellow = effective_vIntensity / yellow_threshold;
                        } else {
                           normalized_intensity_for_green_yellow = 1.0; // Effectively yellow if threshold is tiny and intensity is above it
                        }
                        colorValue = vec3(normalized_intensity_for_green_yellow, 1.0, 0.0); // Green (0,1,0) to Yellow (1,1,0)
                    } else {
                        // Intensity > yellow_threshold up to 1.0: Yellow to Red
                        // Normalize effective_vIntensity from yellow_threshold to 1.0 for this range
                        float normalized_intensity_for_yellow_red;
                        if ((1.0 - yellow_threshold) > 0.001) { // Avoid division by zero or near-zero
                            normalized_intensity_for_yellow_red = (effective_vIntensity - yellow_threshold) / (1.0 - yellow_threshold);
                        } else {
                            normalized_intensity_for_yellow_red = 1.0; // Effectively red if threshold is near 1.0 and intensity is above it
                        }
                        colorValue = vec3(1.0, 1.0 - normalized_intensity_for_yellow_red, 0.0); // Yellow (1,1,0) to Red (1,0,0)
                    }
                }
                
                gl_FragColor = vec4(colorValue, finalAlpha);
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
        allInteractionPairsPerSlice: Array<Array<{ q1: number; q2: number }>>,
        currentSliceIndex: number,
        allSlicesData: Array<Slice>,
    ) {
        let posIndex = 0;
        let intIndex = 0;

        // Determine the window of slices to consider for heatmap intensity
        const windowEndSlice = currentSliceIndex + 1;
        const windowStartSlice = Math.max(0, windowEndSlice - this.maxSlices);

        // Get the interaction pairs and slice data for the current window
        const relevantSliceInteractionPairs = allInteractionPairsPerSlice.slice(
            windowStartSlice,
            windowEndSlice,
        );
        const relevantSlicesData = allSlicesData.slice(
            windowStartSlice,
            windowEndSlice,
        );
        const numSlicesInWindow = relevantSliceInteractionPairs.length;

        // Calculate the maximum possible weighted sum for normalization
        // Weights are exponential, increasing for more recent slices.
        const weight_base = 1.5; // Base for exponential weighting
        let maxPossibleWeightedSum = 0;
        if (numSlicesInWindow > 0) {
            for (let i = 0; i < numSlicesInWindow; i++) {
                maxPossibleWeightedSum += Math.pow(weight_base, i); // Weight for slice i (0=oldest, numSlicesInWindow-1=newest)
            }
        }

        // Iterate over qubit IDs for which we have position data pre-calculated or can calculate
        // Assuming this.positions and this.intensities are ordered by qubit ID from 0 to N-1
        for (
            let heatmapQubitId = 0;
            heatmapQubitId < this.positions.length / 3;
            heatmapQubitId++
        ) {
            const qubitInfo = qubits.get(heatmapQubitId); // Get the qubit object for its Bloch sphere position

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

            let currentQubitWeightedSum = 0;
            if (
                numSlicesInWindow > 0 &&
                relevantSlicesData.length === numSlicesInWindow
            ) {
                for (let i = 0; i < numSlicesInWindow; i++) {
                    // i = 0 is oldest, i = numSlicesInWindow - 1 is newest
                    const sliceInteractionPairs =
                        relevantSliceInteractionPairs[i];
                    const sliceDataForWindow = relevantSlicesData[i];

                    // Check if the current heatmapQubit was "active" in this specific historical slice
                    const qubitWasActiveInWindowSlice =
                        sliceDataForWindow.interacting_qubits.has(
                            heatmapQubitId,
                        );

                    if (qubitWasActiveInWindowSlice) {
                        // Now check if it was part of any 2-qubit interaction in that same slice
                        for (const pair of sliceInteractionPairs) {
                            if (
                                pair.q1 === heatmapQubitId ||
                                pair.q2 === heatmapQubitId
                            ) {
                                const weight = Math.pow(weight_base, i); // More recent slices (larger i) get higher exponential weight
                                currentQubitWeightedSum += weight;
                                break; // Count this slice with its weight and move to the next slice in the window
                            }
                        }
                    }
                }
            }

            let intensity = 0;
            if (maxPossibleWeightedSum > 0) {
                // Use maxPossibleWeightedSum for normalization
                intensity = currentQubitWeightedSum / maxPossibleWeightedSum;
            }
            this.intensities[intIndex++] = intensity;
        }

        // Ensure buffers are marked for update
        const positionAttr = this.mesh.geometry.attributes
            .position as THREE.BufferAttribute;
        positionAttr.needsUpdate = true;
        const intensityAttr = this.mesh.geometry.attributes
            .intensity as THREE.BufferAttribute;
        intensityAttr.needsUpdate = true;

        // Uniforms like cameraPosition and scaleFactor are updated in Playground's animate loop directly
        // this.material.uniformsNeedUpdate = true; // This might not be needed if individual uniforms are updated
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
