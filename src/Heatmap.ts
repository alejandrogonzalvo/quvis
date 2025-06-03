import * as THREE from "three";
import { Qubit } from "./Qubit.js";

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
                    if (vIntensity <= 0.5) {
                        // Intensity > 0.001 up to 0.5: Greenish to Yellow
                        colorValue = vec3(vIntensity * 2.0, 1.0, 0.0);
                    } else {
                        // Intensity > 0.5 up to 1.0: Yellow to Red
                        colorValue = vec3(1.0, 1.0 - (vIntensity - 0.5) * 2.0, 0.0);
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
        changedIdSlices: Array<Set<number>>,
    ) {
        let posIndex = 0;
        let intIndex = 0;

        this.material.uniforms.cameraPosition.value.copy(this.camera.position);
        this.material.uniforms.scaleFactor.value = this.camera.zoom;
        this.material.uniformsNeedUpdate = true;

        qubits.forEach((qubit, id) => {
            if (!this.qubitPositions[id]) {
                const pos = new THREE.Vector3();
                qubit.blochSphere.blochSphere.getWorldPosition(pos);
                this.qubitPositions[id] = pos;
            }

            const pos = this.qubitPositions[id];
            this.positions[posIndex++] = pos.x;
            this.positions[posIndex++] = pos.y;
            this.positions[posIndex++] = pos.z;

            let interactionCount = 0;
            const slicesToConsider = changedIdSlices.slice(0, this.maxSlices);

            slicesToConsider.forEach((slice) => {
                if (slice.has(id)) {
                    interactionCount++;
                }
            });

            let intensity = 0;
            if (slicesToConsider.length > 0) {
                intensity = interactionCount / slicesToConsider.length;
            }

            this.intensities[intIndex++] = intensity;
        });

        const positionAttr = this.mesh.geometry.attributes
            .position as THREE.BufferAttribute;
        positionAttr.needsUpdate = true;

        const intensityAttr = this.mesh.geometry.attributes
            .intensity as THREE.BufferAttribute;
        intensityAttr.needsUpdate = true;
    }
}
