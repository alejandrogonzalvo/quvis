import * as THREE from "three";
import { colors, colorHelpers } from "../../ui/theme/colors.js";

export class BlochSphere {
    blochSphere: THREE.Group;
    private readonly maxMainSphereOpacity: number = 0.25;

    constructor(x: number, y: number, z: number) {
        this.blochSphere = new THREE.Group();
        this.blochSphere.position.set(x, y, z);

        // Main sphere (transparent)
        const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: colorHelpers.cssColorToHex(colors.text.primary),
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

        // Z-axis (vertical) - use theme's border color
        const zAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({
                color: colorHelpers.cssColorToHex(colors.border.main),
            }),
        );
        zAxis.name = "zAxis";
        this.blochSphere.add(zAxis);

        // X-axis (horizontal) - use theme's border color
        const xAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({
                color: colorHelpers.cssColorToHex(colors.border.main),
            }),
        );
        xAxis.name = "xAxis";
        xAxis.rotation.z = Math.PI / 2;
        this.blochSphere.add(xAxis);

        // Y-axis - use theme's border color
        const yAxis = new THREE.Mesh(
            axisGeometry,
            new THREE.MeshBasicMaterial({
                color: colorHelpers.cssColorToHex(colors.border.main),
            }),
        );
        yAxis.name = "yAxis";
        yAxis.rotation.x = Math.PI / 2;
        this.blochSphere.add(yAxis);

        // Equatorial circle
        const equatorGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const equatorMaterial = new THREE.MeshBasicMaterial({
            color: colorHelpers.cssColorToHex(colors.text.muted),
        });
        const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
        equator.name = "equator";
        equator.rotation.x = Math.PI / 2;
        this.blochSphere.add(equator);

        // Meridian circle
        const meridianGeometry = new THREE.TorusGeometry(0.4, 0.005, 16, 100);
        const meridianMaterial = new THREE.MeshBasicMaterial({
            color: colorHelpers.cssColorToHex(colors.text.muted),
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
            if (!(object instanceof THREE.Mesh)) {
                return;
            }

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
        });
    }

    public setScale(scale: number): void {
        if (this.blochSphere) {
            this.blochSphere.scale.set(scale, scale, scale);
        }
    }

    dispose() {
        this.blochSphere.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) {
                return;
            }

            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}
