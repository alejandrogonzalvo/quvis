import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class KeyboardCameraController {
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;
    private isEnabled: boolean = true;
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private rotationStep: number = Math.PI / 72; // 2.5 degrees
    private panStep: number = 1.0;
    private zoomStep: number = 2.0;
    private onHelpToggle?: () => void;

    constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
        this.camera = camera;
        this.controls = controls;
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    public initialize(): void {
        document.addEventListener("keydown", this.boundHandleKeyDown);
    }

    public dispose(): void {
        document.removeEventListener("keydown", this.boundHandleKeyDown);
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    public setHelpToggleCallback(callback: () => void): void {
        this.onHelpToggle = callback;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.isEnabled) return;

        // Only handle keys when no input element is focused
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true'
        )) {
            return;
        }

        let handled = false;

        switch (event.key.toLowerCase()) {
            // Rotation around Y-axis (horizontal)
            case 'arrowleft':
            case 'a':
                this.rotateAroundTarget('y', this.rotationStep);
                handled = true;
                break;
            case 'arrowright':
            case 'd':
                this.rotateAroundTarget('y', -this.rotationStep);
                handled = true;
                break;

            // Rotation around X-axis (vertical)
            case 'arrowup':
            case 'w':
                this.rotateAroundTarget('x', this.rotationStep);
                handled = true;
                break;
            case 'arrowdown':
            case 's':
                this.rotateAroundTarget('x', -this.rotationStep);
                handled = true;
                break;


            // Zoom in/out
            case '+':
            case '=':
                this.zoomCamera(-this.zoomStep);
                handled = true;
                break;
            case '-':
            case '_':
                this.zoomCamera(this.zoomStep);
                handled = true;
                break;

            // Pan camera
            case 'p': // Pan left (remapped from 'h')
                this.panCamera(-this.panStep, 0);
                handled = true;
                break;
            case 'l': // Pan right
                this.panCamera(this.panStep, 0);
                handled = true;
                break;
            case 'j': // Pan down
                this.panCamera(0, -this.panStep);
                handled = true;
                break;
            case 'k': // Pan up
                this.panCamera(0, this.panStep);
                handled = true;
                break;

            // Reset camera to default position
            case 'r':
                this.resetCamera();
                handled = true;
                break;

            // Toggle between perspective views
            case '1':
                this.setViewAngle('front');
                handled = true;
                break;
            case '2':
                this.setViewAngle('right');
                handled = true;
                break;
            case '3':
                this.setViewAngle('top');
                handled = true;
                break;
            case '4':
                this.setViewAngle('isometric');
                handled = true;
                break;

            // Toggle help
            case 'h':
                if (this.onHelpToggle) {
                    this.onHelpToggle();
                }
                handled = true;
                break;
        }

        if (handled) {
            event.preventDefault();
            this.controls.update();
        }
    }

    private rotateAroundTarget(axis: 'x' | 'y' | 'z', angle: number): void {
        const target = this.controls.target.clone();
        const position = this.camera.position.clone();

        // Translate to origin (target becomes 0,0,0)
        position.sub(target);

        // Create rotation matrix based on camera's local axes
        let rotationMatrix: THREE.Matrix4;
        switch (axis) {
            case 'x': // Pitch (up/down rotation around camera's right axis)
                const right = new THREE.Vector3();
                this.camera.getWorldDirection(new THREE.Vector3()); // Update camera matrix
                right.setFromMatrixColumn(this.camera.matrixWorld, 0);
                rotationMatrix = new THREE.Matrix4().makeRotationAxis(right.normalize(), angle);
                break;
            case 'y': // Yaw (left/right rotation around world Y axis for predictable horizontal rotation)
                rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
                break;
            case 'z': // Roll (rotation around camera's view direction)
                const viewDirection = new THREE.Vector3();
                this.camera.getWorldDirection(viewDirection);
                rotationMatrix = new THREE.Matrix4().makeRotationAxis(viewDirection.normalize(), -angle); // Negative for intuitive direction
                break;
        }

        // Apply rotation
        position.applyMatrix4(rotationMatrix);

        // Translate back
        position.add(target);

        // Update camera position
        this.camera.position.copy(position);
        this.camera.lookAt(target);
    }

    private zoomCamera(deltaDistance: number): void {
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target).normalize();

        const newPosition = this.camera.position.clone().add(
            direction.multiplyScalar(deltaDistance)
        );

        // Prevent zooming too close or too far
        const distance = newPosition.distanceTo(this.controls.target);
        if (distance > 1 && distance < 1000) {
            this.camera.position.copy(newPosition);
        }
    }

    private panCamera(deltaX: number, deltaY: number): void {
        const camera = this.camera;
        const target = this.controls.target;

        // Get camera's right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();

        right.setFromMatrixColumn(camera.matrix, 0); // Right vector
        up.setFromMatrixColumn(camera.matrix, 1);    // Up vector

        // Calculate pan vectors
        const panOffset = new THREE.Vector3();
        panOffset.add(right.multiplyScalar(deltaX));
        panOffset.add(up.multiplyScalar(deltaY));

        // Apply pan to both camera and target
        camera.position.add(panOffset);
        target.add(panOffset);
    }

    private resetCamera(): void {
        this.camera.position.set(0, 0, 20);
        this.controls.target.set(0, 0, 0);
        this.camera.lookAt(this.controls.target);
    }

    private setViewAngle(view: 'front' | 'right' | 'top' | 'isometric'): void {
        const distance = this.camera.position.distanceTo(this.controls.target);
        const target = this.controls.target.clone();

        let newPosition: THREE.Vector3;

        switch (view) {
            case 'front':
                newPosition = new THREE.Vector3(0, 0, distance);
                break;
            case 'right':
                newPosition = new THREE.Vector3(distance, 0, 0);
                break;
            case 'top':
                newPosition = new THREE.Vector3(0, distance, 0);
                break;
            case 'isometric':
                newPosition = new THREE.Vector3(distance * 0.7, distance * 0.7, distance * 0.7);
                break;
        }

        newPosition.add(target);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(target);
    }

    // Getters for current settings
    public getRotationStep(): number {
        return this.rotationStep;
    }

    public getPanStep(): number {
        return this.panStep;
    }

    public getZoomStep(): number {
        return this.zoomStep;
    }

    // Setters for fine-tuning
    public setRotationStep(step: number): void {
        this.rotationStep = Math.max(0.001, step);
    }

    public setPanStep(step: number): void {
        this.panStep = Math.max(0.1, step);
    }

    public setZoomStep(step: number): void {
        this.zoomStep = Math.max(0.1, step);
    }
}