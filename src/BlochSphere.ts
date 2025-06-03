import * as THREE from "three";
import { State } from "./State.js";
import { gsap } from "gsap";

export class BlochSphere {
    blochSphere: THREE.Group;

    constructor(x: number, y: number) {
        this.blochSphere = new THREE.Group();
        this.blochSphere.position.set(x, y, 0);

        // Main sphere (transparent)
        const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.blochSphere.add(sphere);

        // Axes
        const axisLength = 0.5;
        const axisGeometry = new THREE.CylinderGeometry(
            0.01,
            0.01,
            axisLength * 2,
        );

        // Z-axis (vertical)
        const zAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 }),
        );
        this.blochSphere.add(zAxis);

        // X-axis (horizontal)
        const xAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 }),
        );
        xAxis.rotation.z = Math.PI / 2;
        this.blochSphere.add(xAxis);

        // Y-axis
        const yAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 }),
        );
        yAxis.rotation.x = Math.PI / 2;
        this.blochSphere.add(yAxis);

        // Equatorial circle
        const equatorGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const equatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
        });
        const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
        equator.rotation.x = Math.PI / 2;
        this.blochSphere.add(equator);

        // Meridian circle
        const meridianGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const meridianMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
        });
        const meridian = new THREE.Mesh(meridianGeometry, meridianMaterial);
        this.blochSphere.add(meridian);

        // Then replace the ArrowHelper creation with:
        const stateVector = this.createArrow(new THREE.Vector3(1, 0, 0));
        this.blochSphere.add(stateVector);
    }

    createArrow(direction) {
        const arrowGroup = new THREE.Group();
        const color = "0xffffff";

        // Create the shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const shaftMaterial = new THREE.MeshBasicMaterial({ color: color });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.y = 0.175; // Half of the shaft length

        // Create the arrow head (cone)
        const headGeometry = new THREE.ConeGeometry(0.05, 0.1);
        const headMaterial = new THREE.MeshBasicMaterial({ color: color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.35; // Position at the end of the shaft

        arrowGroup.add(shaft);
        arrowGroup.add(head);

        // Orient the arrow in the specified direction
        arrowGroup.lookAt(direction.multiplyScalar(0.4));

        return arrowGroup;
    }

    animateStateVector(state: State) {
        const stateVector = this.blochSphere.children.find(
            (child) => child instanceof THREE.Group,
        );

        // Calculate target rotation based on state
        const targetRotation = new THREE.Euler();
        switch (State[state]) {
            case State.ZERO:
                targetRotation.set(0, 0, 0); // Point up
                break;
            case State.ONE:
                targetRotation.set(Math.PI, 0, 0); // Point down
                break;
            case State.PLUS:
                targetRotation.set(Math.PI / 2, 0, -Math.PI / 2); // Point right
                break;
            case State.MINUS:
                targetRotation.set(Math.PI / 2, 0, Math.PI / 2); // Point left
                break;
            default:
                targetRotation.set(0, 0, 0);
        }

        // Animate rotation
        gsap.to(stateVector.rotation, {
            x: targetRotation.x,
            y: targetRotation.y,
            z: targetRotation.z,
            duration: 1,
            ease: "power1.inOut",
        });
    }

    dispose() {
        // Dispose of all geometries and materials in the blochSphere group
        this.blochSphere.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) =>
                            material.dispose(),
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        // Children are removed when the group is removed from the scene, or manually if needed
    }
}
