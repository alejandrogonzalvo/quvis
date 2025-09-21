import * as THREE from "three";
import { colors, colorHelpers } from "../../ui/theme/colors.js";

export class BlochSphere {
    blochSphere: THREE.Group;
    private readonly maxMainSphereOpacity: number = 0.25;
    private isLightBackground: () => boolean;
    private sphereMaterial: THREE.MeshBasicMaterial;

    constructor(x: number, y: number, z: number, isLightBackground: () => boolean = () => false) {
        this.isLightBackground = isLightBackground;
        this.blochSphere = new THREE.Group();
        this.blochSphere.position.set(x, y, z);

        const sphereGeometry = new THREE.SphereGeometry(0.4, 8, 6);
        const sphereColor = this.isLightBackground() ? 0x333333 : colorHelpers.cssColorToHex(colors.text.primary);
        this.sphereMaterial = new THREE.MeshBasicMaterial({
            color: sphereColor,
            transparent: true,
            opacity: this.maxMainSphereOpacity,
        });
        const sphere = new THREE.Mesh(sphereGeometry, this.sphereMaterial);
        sphere.name = "mainBlochSphere";
        this.blochSphere.add(sphere);
    }

    public setLOD(_level: "high" | "medium" | "low"): void {
        // LOD not implemented for simplified geometry
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

    public updateColors(): void {
        // Update main sphere color based on background mode
        const sphereColor = this.isLightBackground() ? 0x333333 : colorHelpers.cssColorToHex(colors.text.primary);
        this.sphereMaterial.color.setHex(sphereColor);
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
