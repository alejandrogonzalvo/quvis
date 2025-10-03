import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class SmartCameraAlignment {
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;

    constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
        this.camera = camera;
        this.controls = controls;
    }

    /**
     * Automatically align camera based on force layout using 3-point plane detection
     * Takes first, middle, and last qubits to define the layout plane
     */
    public alignToForceLayout(qubitPositions: Map<number, THREE.Vector3>): void {
        if (qubitPositions.size < 3) {
            console.warn("Not enough qubits for 3-point plane alignment");
            return;
        }

        // Get qubit positions as array
        const positions = Array.from(qubitPositions.entries()).sort((a, b) => a[0] - b[0]);

        // Select 3 representative points: first, middle, last
        const firstPoint = positions[0][1];
        const middleIndex = Math.floor(positions.length / 2);
        const middlePoint = positions[middleIndex][1];
        const lastPoint = positions[positions.length - 1][1];


        // Calculate the plane normal using cross product
        const planeNormal = this.calculatePlaneNormal(firstPoint, middlePoint, lastPoint);

        // Calculate centroid for camera target
        const centroid = this.calculateCentroid(Array.from(qubitPositions.values()));

        // Position camera perpendicular to the plane
        this.positionCameraPerpendicularToPlane(planeNormal, centroid, qubitPositions);
    }

    /**
     * Calculate the normal vector of a plane defined by 3 points
     */
    private calculatePlaneNormal(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
        // Create two vectors in the plane
        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const v2 = new THREE.Vector3().subVectors(p3, p1);

        // Cross product gives us the normal
        const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

        // Ensure the normal points "outward" (positive Z component preferred)
        if (normal.z < 0) {
            normal.negate();
        }

        return normal;
    }

    /**
     * Calculate centroid of all qubit positions
     */
    private calculateCentroid(positions: THREE.Vector3[]): THREE.Vector3 {
        const centroid = new THREE.Vector3(0, 0, 0);
        for (const pos of positions) {
            centroid.add(pos);
        }
        return centroid.divideScalar(positions.length);
    }

    /**
     * Position camera perpendicular to the detected plane
     */
    private positionCameraPerpendicularToPlane(
        planeNormal: THREE.Vector3,
        centroid: THREE.Vector3,
        qubitPositions: Map<number, THREE.Vector3>
    ): void {
        // Calculate bounding box to determine viewing distance
        const boundingBox = this.calculateBoundingBox(Array.from(qubitPositions.values()));
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Calculate viewing distance based on FOV and layout size
        const fov = this.camera.fov * Math.PI / 180;
        const distance = (maxDimension / (2 * Math.tan(fov / 2))) * 1.8; // 1.8 for padding

        // Position camera along the normal vector
        const cameraPosition = centroid.clone().add(
            planeNormal.clone().multiplyScalar(distance)
        );

        // Smoothly animate to new position
        this.animateCameraToPosition(cameraPosition, centroid);
    }

    /**
     * Calculate bounding box of positions
     */
    private calculateBoundingBox(positions: THREE.Vector3[]): THREE.Box3 {
        const box = new THREE.Box3();
        for (const pos of positions) {
            box.expandByPoint(pos);
        }
        return box;
    }

    /**
     * Smoothly animate camera to new position
     */
    private animateCameraToPosition(targetPosition: THREE.Vector3, targetLookAt: THREE.Vector3): void {
        // For now, do instant positioning - could add smooth animation later
        this.camera.position.copy(targetPosition);
        this.controls.target.copy(targetLookAt);
        this.camera.lookAt(targetLookAt);
        this.controls.update();

    }

    /**
     * Get the current plane normal for use by keyboard controls
     * This allows WASD to rotate relative to the current viewing plane
     */
    public getCurrentPlaneNormal(): THREE.Vector3 {
        // Calculate viewing direction from current camera position
        const viewDirection = new THREE.Vector3();
        this.camera.getWorldDirection(viewDirection);
        return viewDirection.normalize();
    }

    /**
     * Get camera-relative axes for improved keyboard navigation
     * Returns right, up, and forward vectors relative to current camera orientation
     */
    public getCameraRelativeAxes(): {
        right: THREE.Vector3;
        up: THREE.Vector3;
        forward: THREE.Vector3;
    } {
        const cameraMatrix = this.camera.matrixWorld;

        const right = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 0).normalize();
        const up = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 1).normalize();
        const forward = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 2).negate().normalize();

        return { right, up, forward };
    }

    /**
     * Alternative alignment method: Find the plane with minimum Z variance
     * This is more robust for layouts that might not have clear first/middle/last structure
     */
    public alignToMinimalVariancePlane(qubitPositions: Map<number, THREE.Vector3>): void {
        if (qubitPositions.size < 3) return;

        const positions = Array.from(qubitPositions.values());
        const centroid = this.calculateCentroid(positions);

        // Try different plane orientations and find the one with minimal point-to-plane distance variance
        const testNormals = [
            new THREE.Vector3(1, 0, 0),    // YZ plane
            new THREE.Vector3(0, 1, 0),    // XZ plane
            new THREE.Vector3(0, 0, 1),    // XY plane
            new THREE.Vector3(1, 1, 0).normalize(),    // Diagonal
            new THREE.Vector3(1, 0, 1).normalize(),    // Diagonal
            new THREE.Vector3(0, 1, 1).normalize(),    // Diagonal
            new THREE.Vector3(1, 1, 1).normalize(),    // Diagonal
        ];

        let bestNormal = testNormals[0];
        let minVariance = Infinity;

        for (const normal of testNormals) {
            const variance = this.calculatePlaneVariance(positions, centroid, normal);
            if (variance < minVariance) {
                minVariance = variance;
                bestNormal = normal;
            }
        }

        this.positionCameraPerpendicularToPlane(bestNormal, centroid, qubitPositions);
    }

    /**
     * Calculate variance of points from a plane defined by a point and normal
     */
    private calculatePlaneVariance(
        positions: THREE.Vector3[],
        planePoint: THREE.Vector3,
        planeNormal: THREE.Vector3
    ): number {
        const distances = positions.map(pos => {
            const pointToPlane = new THREE.Vector3().subVectors(pos, planePoint);
            return Math.abs(pointToPlane.dot(planeNormal));
        });

        const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;

        return variance;
    }
}