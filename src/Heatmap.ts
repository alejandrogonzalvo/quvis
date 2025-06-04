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
            varying float vIntensity;
            
            void main() {
                vec2 coord = gl_PointCoord * 2.0 - vec2(1.0);
                float distance = length(coord);
                
                float alpha = smoothstep(radius, radius * 0.1, distance);
                
                vec3 colorValue;
                // Clamp vIntensity to [0,1] just in case, though it should be already.
                float clampedIntensity = clamp(vIntensity, 0.0, 1.0);

                if (clampedIntensity <= 0.5) {
                    // Transition from Green (0,1,0) at intensity 0 to Yellow (1,1,0) at intensity 0.5
                    colorValue = vec3(clampedIntensity * 2.0, 1.0, 0.0);
                } else {
                    // Transition from Yellow (1,1,0) at intensity 0.5 to Red (1,0,0) at intensity 1.0
                    colorValue = vec3(1.0, 1.0 - (clampedIntensity - 0.5) * 2.0, 0.0);
                }
                
                gl_FragColor = vec4(colorValue, alpha);
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

        let denominatorForPointNormalization: number;
        if (this.maxSlices === -1) {
            // "All slices" mode
            denominatorForPointNormalization = 10.0; // Fixed typical window size for normalization
        } else {
            // Fixed window size mode
            denominatorForPointNormalization = Math.max(
                1.0,
                parseFloat(this.maxSlices.toString()),
            ); // Use configured maxSlices, ensure at least 1
        }

        for (let i = 0; i < rawInteractionCounts.length; i++) {
            const currentRawCount = rawInteractionCounts[i];
            let normalizedIntensity = 0;
            if (denominatorForPointNormalization > 0) {
                normalizedIntensity =
                    currentRawCount / denominatorForPointNormalization;
            }

            // Clamp normalizedIntensity to [0,1] before applying floor
            normalizedIntensity = Math.max(
                0.0,
                Math.min(1.0, normalizedIntensity),
            );

            if (currentRawCount > 0.0001) {
                this.intensities[i] = Math.max(normalizedIntensity, 0.002); // Apply floor
            } else {
                this.intensities[i] = 0;
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
