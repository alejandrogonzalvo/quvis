import * as THREE from "three";

class OctreeNode {
    box: THREE.Box3;
    centerOfMass: THREE.Vector3 = new THREE.Vector3();
    mass: number = 0;
    qubitId: number | null = null;
    children: (OctreeNode | null)[] = [];

    constructor(box: THREE.Box3) {
        this.box = box;
    }

    insert(
        qubitId: number,
        position: THREE.Vector3,
        qubitPositions: Map<number, THREE.Vector3>,
    ): void {
        if (!this.box.containsPoint(position)) {
            return;
        }

        if (this.mass === 0) {
            this.qubitId = qubitId;
            this.centerOfMass.copy(position);
            this.mass = 1;
            return;
        }

        if (this.isLeaf()) {
            this.subdivide();
            // Re-insert existing qubit into the correct child
            const existingQubitPos = qubitPositions.get(this.qubitId!);
            if (existingQubitPos) {
                const existingQubitIndex = this.getOctant(existingQubitPos);
                this.children[existingQubitIndex]!.insert(
                    this.qubitId!,
                    existingQubitPos,
                    qubitPositions,
                );
            }
        }

        // Insert new qubit into the correct child
        const newQubitIndex = this.getOctant(position);
        this.children[newQubitIndex]!.insert(qubitId, position, qubitPositions);

        // Update center of mass
        this.centerOfMass
            .multiplyScalar(this.mass)
            .add(position)
            .divideScalar(this.mass + 1);
        this.mass++;
        this.qubitId = null; // Internal node
    }

    isLeaf(): boolean {
        return this.children.length === 0;
    }

    private getOctant(point: THREE.Vector3): number {
        const center = this.box.getCenter(new THREE.Vector3());
        let index = 0;
        if (point.x > center.x) index |= 1;
        if (point.y > center.y) index |= 2;
        if (point.z > center.z) index |= 4;
        return index;
    }

    private subdivide(): void {
        const size = this.box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        for (let i = 0; i < 8; i++) {
            const min = new THREE.Vector3(
                this.box.min.x + (i & 1 ? size.x : 0),
                this.box.min.y + (i & 2 ? size.y : 0),
                this.box.min.z + (i & 4 ? size.z : 0),
            );
            const max = new THREE.Vector3().addVectors(min, size);
            this.children[i] = new OctreeNode(new THREE.Box3(min, max));
        }
    }
}

function calculateRepulsiveForce(
    node: OctreeNode,
    qubitPos: THREE.Vector3,
    qubitId: number,
    force: THREE.Vector3,
    kRepel: number,
    barnesHutTheta: number,
) {
    if (node.mass === 0 || node.qubitId === qubitId) {
        return;
    }

    const distance = qubitPos.distanceTo(node.centerOfMass);

    if (node.isLeaf()) {
        if (node.qubitId !== null) {
            const delta = new THREE.Vector3().subVectors(
                qubitPos,
                node.centerOfMass,
            );
            const dist = Math.max(delta.length(), 0.1);
            const forceMag = (kRepel * kRepel) / dist;
            force.add(delta.normalize().multiplyScalar(forceMag));
        }
    } else {
        const size = node.box.getSize(new THREE.Vector3()).x; // Assuming cube-like nodes
        if (size / distance < barnesHutTheta) {
            const delta = new THREE.Vector3().subVectors(
                qubitPos,
                node.centerOfMass,
            );
            const dist = Math.max(delta.length(), 0.1);
            const forceMag = ((kRepel * kRepel) / dist) * node.mass;
            force.add(delta.normalize().multiplyScalar(forceMag));
        } else {
            for (const child of node.children) {
                if (child) {
                    calculateRepulsiveForce(
                        child,
                        qubitPos,
                        qubitId,
                        force,
                        kRepel,
                        barnesHutTheta,
                    );
                }
            }
        }
    }
}

self.onmessage = (event) => {
    const {
        numDeviceQubits,
        couplingMap,
        areaWidth,
        areaHeight,
        areaDepth,
        iterations,
        coolingFactor,
        kRepel,
        idealDist,
        kAttract,
        barnesHutTheta,
    } = event.data;

    const qubitPositions = new Map<number, THREE.Vector3>();

    if (numDeviceQubits === 0) {
        postMessage({ qubitPositions: [] });
        return;
    }

    if (!couplingMap || numDeviceQubits <= 1) {
        const cols = Math.ceil(Math.sqrt(numDeviceQubits));
        const rows = Math.ceil(numDeviceQubits / cols);
        const spacing = idealDist;
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetY = ((rows - 1) * spacing) / 2;
        let count = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (count < numDeviceQubits) {
                    qubitPositions.set(
                        count,
                        new THREE.Vector3(
                            j * spacing - offsetX,
                            i * spacing - offsetY,
                            0,
                        ),
                    );
                    count++;
                }
            }
        }
        if (numDeviceQubits <= 1 || !couplingMap) {
            postMessage({
                qubitPositions: Array.from(qubitPositions.entries()),
            });
            return;
        }
    }

    for (let i = 0; i < numDeviceQubits; i++) {
        if (!qubitPositions.has(i)) {
            qubitPositions.set(
                i,
                new THREE.Vector3(
                    (Math.random() - 0.5) * areaWidth * 0.1,
                    (Math.random() - 0.5) * areaHeight * 0.1,
                    (Math.random() - 0.5) * areaDepth * 0.1,
                ),
            );
        }
    }

    let temperature = Math.max(areaWidth, areaHeight, areaDepth) / 10;
    for (let iter = 0; iter < iterations; iter++) {
        const forces = new Map<number, THREE.Vector3>();
        for (let i = 0; i < numDeviceQubits; i++)
            forces.set(i, new THREE.Vector3(0, 0, 0));

        const boundingBox = new THREE.Box3();
        qubitPositions.forEach((pos) => boundingBox.expandByPoint(pos));
        const octree = new OctreeNode(boundingBox);
        qubitPositions.forEach((pos, id) =>
            octree.insert(id, pos, qubitPositions),
        );

        for (let i = 0; i < numDeviceQubits; i++) {
            const posI = qubitPositions.get(i)!;
            const force = new THREE.Vector3();
            calculateRepulsiveForce(
                octree,
                posI,
                i,
                force,
                kRepel,
                barnesHutTheta,
            );
            forces.get(i)!.add(force);
        }

        if (couplingMap) {
            couplingMap.forEach((pair: number[]) => {
                if (pair.length === 2) {
                    const u = pair[0];
                    const v = pair[1];
                    const posU = qubitPositions.get(u)!;
                    const posV = qubitPositions.get(v)!;
                    if (posU && posV) {
                        const delta = new THREE.Vector3().subVectors(
                            posV,
                            posU,
                        );
                        const dist = delta.length() || 1e-6;
                        const forceMag = kAttract * (dist - idealDist);
                        const forceVec = delta
                            .normalize()
                            .multiplyScalar(forceMag);
                        forces.get(u)!.add(forceVec);
                        forces.get(v)!.sub(forceVec);
                    }
                }
            });
        }

        for (let i = 0; i < numDeviceQubits; i++) {
            const pos = qubitPositions.get(i)!;
            const force = forces.get(i)!;
            const displacement = force
                .clone()
                .normalize()
                .multiplyScalar(Math.min(force.length(), temperature));
            pos.add(displacement);
        }
        temperature *= coolingFactor;
    }

    let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;
    qubitPositions.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        minZ = Math.min(minZ, pos.z);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
        maxZ = Math.max(maxZ, pos.z);
    });
    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;
    const currentDepth = maxZ - minZ;
    const scale =
        Math.min(
            areaWidth / (currentWidth || 1),
            areaHeight / (currentHeight || 1),
            areaDepth / (currentDepth || 1),
        ) * 0.8;
    qubitPositions.forEach((pos) => {
        pos.x = (pos.x - (minX + currentWidth / 2)) * scale;
        pos.y = (pos.y - (minY + currentHeight / 2)) * scale;
        pos.z = (pos.z - (minZ + currentDepth / 2)) * scale;
    });

    postMessage({ qubitPositions: Array.from(qubitPositions.entries()) });
};
