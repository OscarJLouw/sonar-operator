import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Utils } from '../../utils/Utils';
import { MeshManager } from '../../managers/MeshManager';

export class SonarTargetVisual extends GameObject {
    Awake() {
        this.isHint = false;

        // Meshes
        this.geometry = MeshManager.instance.passiveSonarTargetGeometry;
        this.material = MeshManager.instance.passiveSonarTargetMaterial.clone();
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.visible = false;

        //this.mesh.layers.set(5);
        this.AddComponent(this.mesh);
        this.positionOffset = new THREE.Vector3();
        this.scaleFactor = 1;
        this.SetVisible(false);

        this.visibilityPercentage = 0;
    }

    CreateFromConfig(targetConfig) {
        if (targetConfig.visibleOnActiveSonar) {
            this.activeSonarModelKey = targetConfig.activeSonarModelKey;
        }
    }

    SetSonarViewerProperties(offsetPosition, scaleFactor) {
        this.positionOffset.set(offsetPosition.x, offsetPosition.y, offsetPosition.z);
        this.scaleFactor = scaleFactor;
    }

    Link(sonarTarget) {
        this.CreateFromConfig(sonarTarget.targetConfig);

        this.sonarTarget = sonarTarget;
        this.radius = sonarTarget.radius;
        this.transform.scale.set(this.radius * this.scaleFactor, this.radius * this.scaleFactor, this.radius * this.scaleFactor);

        this.sonarTarget.addEventListener("overlapPercentageUpdated", this.OnOverlapPercentageUpdated);
        this.sonarTarget.addEventListener("discoveredTarget", this.OnDiscovered);
        this.sonarTarget.addEventListener("onRemoved", this.OnRemoved);
        if (!this.isHint) {
            this.mesh.visible = false;
            this.material.opacity = 0;
        }
    }

    Update(deltaTime) {
        if (this.sonarTarget != null) {
            if (!this.discovered && !this.isHint) {
                this.mesh.visible = false;
            }

            this.transform.position.set(
                this.sonarTarget.transform.position.x * this.scaleFactor + this.positionOffset.x,
                this.sonarTarget.transform.position.y * this.scaleFactor + this.positionOffset.y,
                this.sonarTarget.transform.position.z * this.scaleFactor + this.positionOffset.z
            )
        }
    }

    OnOverlapPercentageUpdated = (event) => {
        if (this.discovered)
            return;

        const overlapping = event.detail.overlapping;
        const wasOverlappingPreviously = event.detail.wasOverlappingPreviously;
        const percentage = event.detail.percentage;
        const overlappedArea = event.detail.overlapArea;
        const viewerArea = event.detail.sonarAnnularSegmentArea;
        const percentageOfViewerOccupied = overlappedArea / viewerArea;

        this.overlapping = overlapping;
        this.overlapPercentage = percentage;
        this.overlappedArea = overlappedArea;
        this.viewerArea = viewerArea;
        this.visibilityPercentage = percentageOfViewerOccupied;

        if (!this.discovered && !this.isHint) {
            this.mesh.visible = false;
        }

        if (!overlapping || percentageOfViewerOccupied < 0.2 || percentageOfViewerOccupied > 1.6) {
            // Not close enough!

            if (this.isHint) {
                this.material.color = new THREE.Color(0x782B24);
                this.material.opacity = 0.5;
            } else {
                this.material.color.r = 0;
                this.material.color.g = 0;
                this.material.color.b = 0;

                this.material.opacity = 0; //Utils.instance.Clamp(0.4, 0, 1);
            }
            return;
        }

        if (overlapping) {
            var percentageCorrect = percentageOfViewerOccupied;
            if (percentageOfViewerOccupied > 1) {
                percentageCorrect = 1 - (percentageOfViewerOccupied - 1);
            }


            percentageCorrect = Utils.instance.Clamp(percentageCorrect, 0, 1);

            if (this.isHint) {
                this.material.color = new THREE.Color(0x782B24);
                this.material.opacity = 0.5;
            } else {
                this.material.color.r = 0; //1 - percentageCorrect;
                this.material.color.g = percentageCorrect * 0.1;
                this.material.color.b = 0;
                this.material.opacity = percentageCorrect * 0.1;
            }

        } /*else {
            if (wasOverlappingPreviously) {
                this.material.color.r = 0;
                this.material.color.g = 0;
                this.material.color.b = 0;
                this.material.opacity = 0.4;
            }
        }*/
    }

    OnDiscovered = (event) => {
        this.discovered = true;
        this.mesh.visible = true;
        this.material.color = new THREE.Color(0x4f7754);
        //this.material.color.r = 0; //1 - percentageCorrect;
        //this.material.color.g = 1;
        //this.material.color.b = 0;
        this.material.opacity = 0.5;
    }

    OnRemoved = (event) => {
        this.sonarTarget = null;
        this.Destroy();
    }

    OnDestroy() {
        if (this.geometry) this.geometry.dispose();

        if (this.material) {
            this.material.dispose();
        }

        if (this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;

        //this.sonarTarget.removeEventListener("overlapPercentageUpdated", this.OnOverlapPercentageUpdated);
        //this.sonarTarget.removeEventListener("onRemoved", this.OnRemoved);
    }

    SetVisible(visible) {
        this.mesh.visible = this.discovered && visible;
    }

    ShowAsHint() {
        if (this.discovered) {
            return;
        }

        this.isHint = true;
        console.log("Showing visual " + this.name + " as hint");

        this.mesh.visible = true;
        this.material.color = new THREE.Color(0x782B24);
        this.material.opacity = 0.5;
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}