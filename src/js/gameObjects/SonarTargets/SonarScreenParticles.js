import * as THREE from 'three';
import { GameObject } from '../GameObject';

export class SonarScreenParticles extends GameObject {
    Awake() {
        this.positionCount = 100;
        this.positions = new Float32Array(this.positionCount * 3);

        for (let i = 0; i < this.positionCount; i++) {
            const i3 = i * 3;
            this.positions[i3 + 0] = Math.random() - 0.5;
            this.positions[i3 + 1] = Math.random() - 0.5;
            this.positions[i3 + 2] = 0;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(this.positions, 3)
        );
        this.pointsMaterial = new THREE.PointsMaterial(
            {
                size: 5
            });

        this.points = new THREE.Points(this.geometry, this.material);

        this.AddComponent(this.points);
    }

    Update(deltaTime) {
        const positions = this.points.geometry.attributes.position.array;
        const spawnRadius = 1;
        const TAU = Math.PI*2;

        for (let i = 0; i < positions.length; i++) {
            const i3 = i * 3;
            positions[i3 + 0] = Math.sin(Math.random() * TAU) * Math.random() * spawnRadius;
            positions[i3 + 1] = Math.cos(Math.random() * TAU) * Math.random() * spawnRadius;
            positions[i3 + 2] = 0;
        }

        this.points.geometry.attributes.position.needsUpdate = true;


    }
}