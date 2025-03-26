// Heatmap.ts
import * as THREE from "three";
import { Qubit } from "./Qubit.js";

export class Heatmap {
    camera: THREE.PerspectiveCamera;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    points: { position: THREE.Vector3; intensity: number }[] = [];
    qubit_number: number;

    constructor(camera: THREE.PerspectiveCamera, qubit_number: number) {
        this.camera = camera;
        this.qubit_number = qubit_number;
        const geometry = new THREE.PlaneGeometry(qubit_number, qubit_number);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                points: { value: new Float32Array(qubit_number * 3) },
                radius: { value: 0.05 },
                color1: { value: new THREE.Color(0xff0000) },
                color2: { value: new THREE.Color(0x000000) },
                worldToLocal: { value: new THREE.Matrix4() },
                aspect: { value: window.innerWidth / window.innerHeight },
            },
            vertexShader: `
                varying vec2 vUv;
                uniform mat4 worldToLocal;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 points[${this.qubit_number}];
                uniform float radius;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;

                void main() {
                    float intensity = 0.0;
                    for (int i = 0; i < ${this.qubit_number}; i++) {
                        vec2 pointPos = points[i].xy;
                        float dist = distance(vUv, pointPos);
                        intensity += points[i].z * max(0.0, 1.0 - dist / radius);
                    }
                    gl_FragColor = vec4(mix(color2, color1, intensity), 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(0, 0, -1); // Position behind qubits
    }

    updatePoints(qubits: Map<number, Qubit>, changedIds: Set<number>) {
        const pointData = new Float32Array(this.qubit_number * 3);
        let index = 0;

        qubits.forEach((qubit) => {
            const worldPos = new THREE.Vector3();
            qubit.blochSphere.blochSphere.getWorldPosition(worldPos);
            const temp = worldPos.clone().project(this.camera);
            const uvX = (temp.x + 1) / 2;
            const uvY = (temp.y + 1) / 2;

            // Highlight only changed qubits
            const intensity = changedIds.has(qubit.id) ? 1.0 : 0.0;

            pointData[index++] = uvX;
            pointData[index++] = uvY;
            pointData[index++] = intensity;
        });

        while (index < this.qubit_number * 3) {
            pointData[index++] = 0;
        }

        this.material.uniforms.points.value = pointData;
        this.material.uniformsNeedUpdate = true;
    }
}
