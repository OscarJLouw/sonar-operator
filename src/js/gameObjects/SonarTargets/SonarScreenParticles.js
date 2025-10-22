import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Utils } from '../../utils/Utils';

export class SonarScreenParticles extends GameObject {
    Awake() {
        this.positionCount = 500;
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
        this.updating = true;
    }

    Update(deltaTime) {
        if (this.sonarViewController == null || !this.updating) {
            return;
        }

        const targetVisualsList = this.sonarViewController.targetVisualsList;
        const particlesPerTarget = Math.floor((this.positionCount - 20) / targetVisualsList.length);

        const remainingParticles = this.positionCount - particlesPerTarget;

        const positions = this.points.geometry.attributes.position.array;
        var spawnRadius = 1;
        var visibilityPercentage = 0;
        const TAU = Math.PI * 2;
        var offsetX = 0;
        var offsetY = 0;

        var currentPoint = 0;
        const maxRadius = 0.2;
        var minRadius = 0;

        var targetVisual;
        for (let i = 0; i < targetVisualsList.length; i++) {
            targetVisual = targetVisualsList[i];
            visibilityPercentage = targetVisual.visibilityPercentage;
            /*
            if (visibilityPercentage > 1) {
                visibilityPercentage = 1 - (visibilityPercentage - 1);
            }
            */

            minRadius = targetVisual.radius;
            visibilityPercentage = Utils.instance.Clamp(visibilityPercentage, 0, 1);
            spawnRadius = Utils.instance.Lerp(maxRadius, minRadius, Math.log(visibilityPercentage));
            offsetX = targetVisual.sonarTarget.transform.position.x;
            offsetY = targetVisual.sonarTarget.transform.position.y;

            for (let j = 0; j < particlesPerTarget; j++) {
                const i3 = currentPoint * 3;
                positions[i3 + 0] = offsetX + Math.sin(Math.random() * TAU) * Math.random() * spawnRadius;
                positions[i3 + 1] = offsetY + Math.cos(Math.random() * TAU) * Math.random() * spawnRadius;
                positions[i3 + 2] = 0;
                currentPoint++;
            }
        }

        spawnRadius = 1;

        // Randomly scatter remaining particles
        for (let i = 0; i < remainingParticles; i++) {
            const i3 = currentPoint * 3;
            positions[i3 + 0] = Math.sin(Math.random() * TAU) * Math.random() * spawnRadius;
            positions[i3 + 1] = Math.cos(Math.random() * TAU) * Math.random() * spawnRadius;
            positions[i3 + 2] = 0;
            currentPoint++;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    OnEnable()
    {
        this.updating = true;
        this.points.visible = true;
    }

    OnDisable()
    {
        this.updating = false;
        this.points.visible = false;
    }

    SetSonarViewController(sonarViewController) {
        this.sonarViewController = sonarViewController;
    }
}