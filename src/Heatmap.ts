// Heatmap.ts
import * as THREE from "three";
import { Qubit } from "./Qubit.js";

export class Heatmap {
    mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    positions: Float32Array;
    intensities: Float32Array;
    qubitPositions: THREE.Vector3[] = [];
    camera: THREE.PerspectiveCamera;

    constructor(camera: THREE.PerspectiveCamera, qubit_number: number) {
        this.camera = camera;
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
                baseSize: { value: 50.0 },
                color1: { value: new THREE.Color(0xff0000) },
                color2: { value: new THREE.Color(0x000000) },
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
                    gl_PointSize = baseSize * scaleFactor; // Combined base size with zoom scaling
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float radius;
                varying vec3 vPosition;
                varying float vIntensity;
                
                void main() {
                    vec2 coord = gl_PointCoord * 2.0 - vec2(1.0);
                    float distance = length(coord);
                    float alpha = smoothstep(radius, radius * 0.5, distance) * vIntensity;
                    vec3 color = mix(color2, color1, vIntensity);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
        });

        this.mesh = new THREE.Points(geometry, this.material);
    }

    updatePoints(qubits: Map<number, Qubit>, changedIds: Set<number>) {
        let posIndex = 0;
        let intIndex = 0;

        // Update camera-dependent uniforms
        this.material.uniforms.cameraPosition.value.copy(this.camera.position);
        this.material.uniforms.scaleFactor.value = this.camera.zoom;
        this.material.uniformsNeedUpdate = true;
        qubits.forEach((qubit, id) => {
            // Get world position once during initialization
            if (!this.qubitPositions[id]) {
                const pos = new THREE.Vector3();
                qubit.blochSphere.blochSphere.getWorldPosition(pos);
                this.qubitPositions[id] = pos;
            }

            // Update positions array
            const pos = this.qubitPositions[id];
            this.positions[posIndex++] = pos.x;
            this.positions[posIndex++] = pos.y;
            this.positions[posIndex++] = pos.z;

            // Update intensities
            this.intensities[intIndex++] = changedIds.has(id) ? 1.0 : 0.0;
        });

        const positionAttr = this.mesh.geometry.attributes
            .position as THREE.BufferAttribute;
        positionAttr.needsUpdate = true;

        const intensityAttr = this.mesh.geometry.attributes
            .intensity as THREE.BufferAttribute;
        intensityAttr.needsUpdate = true;
    }
}
