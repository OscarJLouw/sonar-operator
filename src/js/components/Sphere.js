import * as THREE from 'three';
import { GameObject } from '../gameObjects/GameObject';

export class Sphere extends GameObject {
    constructor(scene) {
        super(scene);

        this.geometry = new THREE.SphereGeometry(1);
        this.material = new THREE.MeshNormalMaterial();
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 0);

        this.AddComponent(this.mesh);
    }
}