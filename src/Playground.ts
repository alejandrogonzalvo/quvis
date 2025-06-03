import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { QubitGrid } from "./QubitGrid.js";

export class Playground {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraRig: THREE.Group<THREE.Object3DEventMap>;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    lightRig: THREE.Group<THREE.Object3DEventMap>;
    grid: QubitGrid;
    mouse: THREE.Vector2;
    raycaster: THREE.Raycaster;
    heatmapSlicesSlider: HTMLInputElement;
    heatmapSlicesValueDisplay: HTMLSpanElement;
    maxHeatmapSlices: number;
    legendRedValue: HTMLSpanElement;
    legendYellowValue: HTMLSpanElement;
    legendGreenValue: HTMLSpanElement;

    constructor() {
        this.scene = new THREE.Scene();
        this.mouse = new THREE.Vector2();
        this.scene.background = new THREE.Color(0x121212);

        this.heatmapSlicesSlider = document.getElementById(
            "heatmap-slices",
        ) as HTMLInputElement;
        this.heatmapSlicesValueDisplay = document.getElementById(
            "heatmap-slices-value",
        ) as HTMLSpanElement;
        this.maxHeatmapSlices = parseInt(this.heatmapSlicesSlider.value);
        if (this.heatmapSlicesValueDisplay) {
            this.heatmapSlicesValueDisplay.textContent =
                this.heatmapSlicesSlider.value;
        }

        this.legendRedValue = document.getElementById(
            "legend-red-value",
        ) as HTMLSpanElement;
        this.legendYellowValue = document.getElementById(
            "legend-yellow-value",
        ) as HTMLSpanElement;
        this.legendGreenValue = document.getElementById(
            "legend-green-value",
        ) as HTMLSpanElement;
        this.updateLegend();

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 0, 20);

        this.cameraRig = new THREE.Group();
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupLights();

        this.raycaster = new THREE.Raycaster();

        window.addEventListener("resize", () => this.onWindowResize());
        window.addEventListener("mousemove", (event) =>
            this.onMouseMove(event),
        );
        window.addEventListener("mouseleave", this.onMouseLeave.bind(this));

        this.grid = new QubitGrid(
            this.scene,
            this.mouse,
            this.camera,
            this.maxHeatmapSlices,
        );

        if (this.grid.heatmap) {
            this.grid.heatmap.material.uniforms.aspect.value =
                window.innerWidth / window.innerHeight;
            window.addEventListener("resize", () => {
                if (this.grid.heatmap) {
                    this.grid.heatmap.material.uniforms.aspect.value =
                        window.innerWidth / window.innerHeight;
                }
            });
        } else {
            console.warn(
                "Heatmap not immediately available after QubitGrid construction.",
            );
        }

        this.heatmapSlicesSlider.addEventListener("input", (event) => {
            const target = event.currentTarget as HTMLInputElement;
            this.maxHeatmapSlices = parseInt(target.value);
            this.heatmapSlicesValueDisplay.textContent = target.value;
            this.updateLegend();

            if (this.grid) {
                this.grid.maxSlicesForHeatmap = this.maxHeatmapSlices;
                if (this.grid.heatmap) {
                    this.grid.heatmap.maxSlices = this.maxHeatmapSlices;
                }
                if (this.grid.current_slice) {
                    this.grid.onCurrentSliceChange();
                }
            }
        });

        const instructionText = document.createElement("div");
        instructionText.textContent = "Press Space to generate new slices.";
        instructionText.style.position = "absolute";
        instructionText.style.top = "20px";
        instructionText.style.left = "20px";
        instructionText.style.color = "white";
        instructionText.style.fontFamily = "Arial, sans-serif";
        instructionText.style.fontSize = "16px";
        instructionText.style.backgroundColor = "rgba(0,0,0,0.5)";
        instructionText.style.padding = "5px 10px";
        instructionText.style.borderRadius = "5px";
        document.body.appendChild(instructionText);
        instructionText.remove();
    }

    updateLegend() {
        if (
            this.legendRedValue &&
            this.legendYellowValue &&
            this.legendGreenValue
        ) {
            this.legendRedValue.textContent = `${this.maxHeatmapSlices}`;
            this.legendYellowValue.textContent = `${Math.ceil(
                this.maxHeatmapSlices * 0.5,
            )}`;
            this.legendGreenValue.textContent = `0`;
        }
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        this.lightRig = new THREE.Group();

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.lightRig.add(mainLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 2, 2);
        this.lightRig.add(pointLight);

        this.camera.add(this.lightRig);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
        this.scene.add(hemiLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children,
            true,
        );

        const tooltip = document.getElementById("qubit-tooltip");

        if (intersects.length > 0) {
            let qubit = intersects[0].object;
            while (qubit.parent && !qubit.userData.id) {
                qubit = qubit.parent;
            }

            if (qubit.userData.state) {
                tooltip.style.display = "block";
                tooltip.style.left = event.clientX + 10 + "px";
                tooltip.style.top = event.clientY + 10 + "px";
                tooltip.textContent = `Qubit ${qubit.userData.id}: State |${qubit.userData.state}⟩`;
            } else {
                tooltip.style.display = "none";
            }
        } else {
            tooltip.style.display = "none";
        }
    }

    onMouseLeave() {
        const tooltip = document.getElementById("qubit-tooltip");
        tooltip.style.display = "none";
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.grid && this.grid.heatmap && this.grid.heatmap.mesh) {
            this.grid.heatmap.mesh.renderOrder = -1;
        }

        this.controls.update();
        this.lightRig.quaternion.copy(this.camera.quaternion);
        this.renderer.render(this.scene, this.camera);
    }
}
