import * as THREE from 'three';
import { GameObject } from './GameObject';

export class SonarTargetVisual extends GameObject {
    Awake() {
        // Meshes
        this.geometry = new THREE.CircleGeometry(1, 16);
        this.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.1, 0.8, 0.8),
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        //this.mesh.layers.set(5);
        this.AddComponent(this.mesh);
        this.positionOffset = new THREE.Vector3();
        this.scaleFactor = 1;
    }

    SetSonarViewerProperties(offsetPosition, scaleFactor) {
        this.positionOffset.set(offsetPosition.x, offsetPosition.y, offsetPosition.z);
        this.scaleFactor = scaleFactor;
    }

    Link(sonarTarget) {
        this.sonarTarget = sonarTarget;
        this.radius = sonarTarget.radius;
        this.transform.scale.set(this.radius * this.scaleFactor, this.radius * this.scaleFactor, this.radius * this.scaleFactor);

        this.sonarTarget.addEventListener("overlapPercentageUpdated", this.OnOverlapPercentageUpdated);
    }

    Update(deltaTime) {
        if (this.sonarTarget != null) {
            this.transform.position.set(
                this.sonarTarget.transform.position.x * this.scaleFactor + this.positionOffset.x,
                this.sonarTarget.transform.position.y * this.scaleFactor + this.positionOffset.y,
                this.sonarTarget.transform.position.z * this.scaleFactor + this.positionOffset.z
            )
        }
    }

    OnOverlapPercentageUpdated = (event) => {
        const overlapping = event.detail.overlapping;
        const wasOverlappingPreviously = event.detail.wasOverlappingPreviously;
        const percentage = event.detail.percentage;

        if (overlapping) {
            this.material.color.r = percentage;
            this.material.color.g = 0;
            this.material.color.b = 0;
            this.material.opacity = 0.4 + percentage * 0.5;
        } else {
            if (wasOverlappingPreviously) {
                this.material.color.r = 0;
                this.material.color.g = 0;
                this.material.color.b = 0;
                this.material.opacity = 0.4;
            }
        }
    }

    SetVisible(visible) {
        this.mesh.visible = visible;
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}