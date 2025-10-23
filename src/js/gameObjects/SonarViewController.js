import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';
import { SonarScreenParticles } from './SonarTargets/SonarScreenParticles';

export class SonarViewController extends GameObject {

    // Life cycle
    Awake() {
        this.geometry = new THREE.RingGeometry(0, 1, 32, 1, 0, Math.PI * 0.2);
        this.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xd1cb95),
            transparent: true,
            opacity: 0.1
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, -0.1);
        this.AddComponent(this.mesh);

        this.targetGeometry = new THREE.RingGeometry(0, 1, 32, 1, 0, Math.PI * 0.2);
        this.targetMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x04373b),
            transparent: true,
            opacity: 0.25
        });
        this.targetMesh = new THREE.Mesh(this.targetGeometry, this.targetMaterial);
        this.targetMesh.position.set(0, 0, -0.1);
        this.AddComponent(this.targetMesh);

        this.angle = 0;
        this.targetAngle = 0;
        this.angleRange = 0.2;
        this.targetAngleRange = 0.2;
        this.distance = 0;
        this.targetDistance = 0;
        this.distanceRange = 1;
        this.targetDistanceRange = 1;

        this.minPossibleAngleRange = Math.PI * 0.05;
        this.maxPossibleAngleRange = Math.PI;
        this.minPossibleDistanceRange = 0.05;

        this.angularSize = this.angleRange * Math.PI * 2;

        this.geometryDirty = true;
        this.targetGeometryDirty = true;

        this.arcParameters = {
            innerRadius: 0,
            outerRadius: 1,
            thetaMin: 0,
            thetaMax: 0,
            arcArea: 0
        };

        this.arcParametersPrevious = {
            innerRadius: 99,
            outerRadius: 99,
            thetaMin: 99,
            thetaMax: 99,
            arcArea: 0
        };

        this.targetVisualsList = [];

        this.arcArea = this.CalculateArcArea();

        this.particlesController = GameObject.Instantiate(SonarScreenParticles, this.transform, "Sonar Screen Particles");
        this.particlesController.SetSonarViewController(this);
    }

    Ping()
    {
        this.particlesController.Ping();
    }

    AddSonarTargetVisuals(sonarTargetVisual)
    {
        this.targetVisualsList.push(sonarTargetVisual);
    }

    RemoveSonarTargetVisuals(sonarTargetVisual)
    {
        const targetIndex = this.targetVisualsList.indexOf(sonarTargetVisual);
        if (targetIndex > -1) {
            this.targetVisualsList.splice(targetIndex, 1);
        }
    }

    Start() {
    }

    OnEnable() {
        this.mesh.visible = true;
        this.mesh.layers.set(0);
        this.targetMesh.visible = true;
        this.targetMesh.layers.set(0);
        this.particlesController.SetActive(true);
    }

    OnDisable() {
        this.mesh.visible = false;
        this.mesh.layers.set(1);
        this.targetMesh.visible = false;
        this.targetMesh.layers.set(1);
        this.particlesController.SetActive(false);
    }

    OnDestroy() {
        if (this.geometry) this.geometry.dispose();

        if (this.material) {
            if (this.material.map) {
                this.material.map.dispose();
            }

            this.material.dispose();
        }

        if (this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;
    }


    Update(deltaTime) {
        this.AnimateToTarget(deltaTime);
        this.UpdateArcParameters();

        if (this.geometryDirty) {
            this.UpdateGeometry();
        }

        if (this.targetGeometryDirty) {
            this.UpdateTargetGeometry();
        }
    }

    AnimateToTarget(deltaTime) {
        // Smoothly rotate
        const maxAngleChangeSpeed = 3 * deltaTime;
        const maxAngleRangeChangeSpeed = 1 * deltaTime;
        const maxDistanceChangeSpeed = 1 * deltaTime;
        const maxDistanceRangeChangeSpeed = 1 * deltaTime;

        var angleDifference = Utils.instance.GetSignedAngleDifference(this.angle, this.targetAngle);
        var angleDelta = Utils.instance.Clamp(angleDifference, -maxAngleChangeSpeed, maxAngleChangeSpeed);

        if (Math.abs(angleDelta) > 0) {
            this.SetAngle(this.angle + angleDelta);
        }

        var angleRangeDelta = Utils.instance.Clamp(this.targetAngleRange - this.angleRange, -maxAngleRangeChangeSpeed, maxAngleRangeChangeSpeed);
        if (Math.abs(angleRangeDelta) > 0) {
            this.SetAngleRange(this.angleRange + angleRangeDelta);
        }

        var distanceDelta = Utils.instance.Clamp(this.targetDistance - this.distance, -maxDistanceChangeSpeed, maxDistanceChangeSpeed);
        if (Math.abs(distanceDelta) > 0) {
            this.SetDistance(this.distance + distanceDelta);
        }

        var distanceRangeDelta = Utils.instance.Clamp(this.targetDistanceRange - this.distanceRange, -maxDistanceRangeChangeSpeed, maxDistanceRangeChangeSpeed);
        if (Math.abs(distanceRangeDelta) > 0) {
            this.SetDistanceRange(this.distanceRange + distanceRangeDelta);
        }
    }

    // Updating the mesh
    UpdateGeometry() {
        this.mesh.geometry.dispose();
        this.angularSize = this.angleRange * (this.maxPossibleAngleRange - this.minPossibleAngleRange) + this.minPossibleAngleRange;

        const scaledDistanceRange = this.distanceRange * (1 - this.minPossibleDistanceRange) + this.minPossibleDistanceRange;

        const halfDistanceRange = scaledDistanceRange * 0.5;
        let effectiveDistance = Utils.instance.Lerp(halfDistanceRange, 1 - halfDistanceRange, this.distance);

        let startPoint = Math.max(effectiveDistance - halfDistanceRange, 0);
        let endPoint = Math.min(effectiveDistance + halfDistanceRange, 1);

        const degreesPerSegment = 10;
        const segments = Math.ceil(this.angularSize / (degreesPerSegment * Math.PI / 180));

        this.mesh.geometry = new THREE.RingGeometry(startPoint, endPoint, segments, 1, 0, this.angularSize);

        this.UpdateRotation();

        this.geometryDirty = false;
    }

    UpdateRotation() {
        this.mesh.setRotationFromAxisAngle(Utils.forward, this.angle - this.angularSize * 0.5);
    }

    // Updating the target mesh
    UpdateTargetGeometry() {
        this.targetMesh.geometry.dispose();
        this.targetAngularSize = this.targetAngleRange * (this.maxPossibleAngleRange - this.minPossibleAngleRange) + this.minPossibleAngleRange;

        const scaledDistanceRange = this.targetDistanceRange * (1 - this.minPossibleDistanceRange) + this.minPossibleDistanceRange;

        const halfDistanceRange = scaledDistanceRange * 0.5;
        let effectiveDistance = Utils.instance.Lerp(halfDistanceRange, 1 - halfDistanceRange, this.targetDistance);

        let startPoint = Math.max(effectiveDistance - halfDistanceRange, 0);
        let endPoint = Math.min(effectiveDistance + halfDistanceRange, 1);

        const degreesPerSegment = 10;
        const segments = Math.ceil(this.targetAngularSize / (degreesPerSegment * Math.PI / 180));

        this.targetMesh.geometry = new THREE.RingGeometry(startPoint, endPoint, segments, 1, 0, this.targetAngularSize);

        this.UpdateTargetRotation();

        this.targetGeometryDirty = false;
    }

    UpdateTargetRotation() {
        this.targetMesh.setRotationFromAxisAngle(Utils.forward, this.targetAngle - this.targetAngularSize * 0.5);
    }

    // Global parameter setters
    SetAngle(angle) {
        if (this.angle != angle) {
            this.angle = angle;
            this.UpdateRotation();
        }
    }

    SetTargetAngle(angle) {
        if (this.targetAngle != angle) {
            this.targetAngle = angle;
            this.UpdateTargetRotation();
        }
    }

    SetAngleRange(angleRange) {
        if (this.angleRange != angleRange) {
            this.angleRange = angleRange;
            this.geometryDirty = true;
        }
    }

    SetTargetAngleRange(angleRange) {
        if (this.targetAngleRange != angleRange) {
            this.targetAngleRange = angleRange;
            this.targetGeometryDirty = true;
        }
    }

    SetDistance(distance) {
        if (this.distance != distance) {
            this.distance = distance;
            this.geometryDirty = true;
        }
    }

    SetTargetDistance(distance) {
        if (this.targetDistance != distance) {
            this.targetDistance = distance;
            this.targetGeometryDirty = true;
        }
    }

    SetDistanceRange(distanceRange) {
        if (this.distanceRange != distanceRange) {
            this.distanceRange = distanceRange;
            this.geometryDirty = true;
        }
    }

    SetTargetDistanceRange(distanceRange) {
        if (this.targetDistanceRange != distanceRange) {
            this.targetDistanceRange = distanceRange;
            this.targetGeometryDirty = true;
        }
    }

    GetArcParameters() {
        this.UpdateArcParameters();

        return this.arcParameters;
    }

    UpdateArcParameters() {
        const scaledDistanceRange = this.distanceRange * (1 - this.minPossibleDistanceRange) + this.minPossibleDistanceRange;

        const halfDistanceRange = scaledDistanceRange * 0.5;
        let effectiveDistance = Utils.instance.Lerp(halfDistanceRange, 1 - halfDistanceRange, this.distance);

        this.arcParameters.innerRadius = Math.max(effectiveDistance - halfDistanceRange, 0);
        this.arcParameters.outerRadius = Math.min(effectiveDistance + halfDistanceRange, 1);
        this.arcParameters.thetaMin = this.angle - this.angularSize * 0.5;
        this.arcParameters.thetaMax = this.angle + this.angularSize * 0.5;
        this.arcParameters.arcArea = this.CalculateArcArea(
            this.arcParameters.outerRadius,
            this.arcParameters.innerRadius,
            this.arcParameters.thetaMin,
            this.arcParameters.thetaMax
        );
    }

    HasArcChangedSinceLastChecked() {
        var changed = !this.IsArcTheSameAs(this.arcParametersPrevious);

        this.arcParametersPrevious.innerRadius = this.arcParameters.innerRadius;
        this.arcParametersPrevious.outerRadius = this.arcParameters.outerRadius;
        this.arcParametersPrevious.thetaMin = this.arcParameters.thetaMin;
        this.arcParametersPrevious.thetaMax = this.arcParameters.thetaMax;

        return changed;
    }

    IsArcTheSameAs(previousArc) {
        if (this.arcParameters.innerRadius != previousArc.innerRadius ||
            this.arcParameters.outerRadius != previousArc.outerRadius ||
            this.arcParameters.thetaMin != previousArc.thetaMin ||
            this.arcParameters.thetaMax != previousArc.thetaMax) {
            return false;
        }
        return true;
    }

    CalculateArcArea(outerRadius, innerRadius, thetaMin, thetaMax)
    {
        // area = pi(R^2 - r^2) * theta / (PI*2)
        const area = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) * (Math.abs(Utils.instance.GetSignedAngleDifference(thetaMin, thetaMax)) / (Math.PI*2));
        return area;
    }
}