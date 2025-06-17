import * as THREE from "three";

export class BlochSphere {
    blochSphere: THREE.Group;
    private readonly maxMainSphereOpacity: number = 0.25;

    constructor(x: number, y: number, z: number) {
        this.blochSphere = new THREE.Group();
        this.blochSphere.position.set(x, y, z);

        // Main sphere (transparent)
        const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: this.maxMainSphereOpacity,
            side: THREE.DoubleSide,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.name = "mainBlochSphere";
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
        zAxis.name = "zAxis";
        this.blochSphere.add(zAxis);

        // X-axis (horizontal)
        const xAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 }),
        );
        xAxis.name = "xAxis";
        xAxis.rotation.z = Math.PI / 2;
        this.blochSphere.add(xAxis);

        // Y-axis
        const yAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({ color: 0x888888 }),
        );
        yAxis.name = "yAxis";
        yAxis.rotation.x = Math.PI / 2;
        this.blochSphere.add(yAxis);

        // Equatorial circle
        const equatorGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const equatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
        });
        const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
        equator.name = "equator";
        equator.rotation.x = Math.PI / 2;
        this.blochSphere.add(equator);

        // Meridian circle
        const meridianGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const meridianMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
        });
        const meridian = new THREE.Mesh(meridianGeometry, meridianMaterial);
        meridian.name = "meridian";
        this.blochSphere.add(meridian);
    }

    public setLOD(level: "high" | "medium" | "low"): void {
        const highDetail = level === "high";
        const mediumDetail = level === "medium";

        this.blochSphere.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const name = object.name;
                if (name === "equator" || name === "meridian") {
                    object.visible = highDetail;
                } else if (name.endsWith("Axis")) {
                    object.visible = highDetail || mediumDetail;
                }
            }
        });
    }

    public setOpacity(opacity: number): void {
        this.blochSphere.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const material = object.material as
                    | THREE.Material
                    | THREE.Material[];

                const applyOpacity = (mat: THREE.Material) => {
                    mat.transparent = true;
                    if (object.name === "mainBlochSphere") {
                        mat.opacity = this.maxMainSphereOpacity * opacity;
                    } else {
                        mat.opacity = opacity;
                    }
                    mat.needsUpdate = true;
                };

                if (Array.isArray(material)) {
                    material.forEach(applyOpacity);
                } else {
                    applyOpacity(material);
                }
            }
        });
    }

    public setScale(scale: number): void {
        if (this.blochSphere) {
            this.blochSphere.scale.set(scale, scale, scale);
        }
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
