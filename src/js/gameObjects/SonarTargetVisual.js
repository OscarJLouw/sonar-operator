import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';

export class SonarTargetVisual extends GameObject {
    Awake() {
        // Meshes
        this.geometry = new THREE.CircleGeometry(1, 16);
        this.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0, 0, 0),
            transparent: true,
            opacity: 0
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        //this.mesh.layers.set(5);
        this.AddComponent(this.mesh);
        this.positionOffset = new THREE.Vector3();
        this.scaleFactor = 1;
        this.SetVisible(false);
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
        this.sonarTarget.addEventListener("onRemoved", this.OnRemoved);
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
        const overlappedArea = event.detail.overlapArea;
        const viewerArea = event.detail.sonarAnnularSegmentArea;
        const percentageOfViewerOccupied = overlappedArea/viewerArea;

        console.log(overlappedArea + " / " + viewerArea + " = " + percentageOfViewerOccupied);
        
        if(!overlapping || percentageOfViewerOccupied < 0.2 || percentageOfViewerOccupied > 1.6)
        {
            // Not close enough!
            this.material.color.r = 0;
            this.material.color.g = 0;
            this.material.color.b = 0;
            this.material.opacity = 0; //Utils.instance.Clamp(0.4, 0, 1);
            return;
        }

        if (overlapping) {
            var percentageCorrect = percentageOfViewerOccupied;
            if(percentageOfViewerOccupied > 1)
            {
                percentageCorrect = 1-(percentageOfViewerOccupied-1);
            }

            percentageCorrect = Utils.instance.Clamp(percentageCorrect, 0, 1);
            
            this.material.color.r = 1-percentageCorrect;
            this.material.color.g = percentageCorrect;
            this.material.color.b = 0;
            this.material.opacity = percentageCorrect;
  
        } /*else {
            if (wasOverlappingPreviously) {
                this.material.color.r = 0;
                this.material.color.g = 0;
                this.material.color.b = 0;
                this.material.opacity = 0.4;
            }
        }*/
    }

    OnRemoved = (event) =>
    {
        this.sonarTarget = null;
        this.Destroy();
    }

    OnDestroy()
    {
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
        this.mesh.visible = visible;
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}