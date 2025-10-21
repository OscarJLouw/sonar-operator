import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarViewController } from './SonarViewController';
import { Knob } from './Knob';
import { SonarTarget } from './SonarTarget';
import { MeshManager } from '../managers/MeshManager';
import { SonarTargetVisual } from './SonarTargetVisual';

export class SonarMachine extends GameObject {

    CreateSonarView()
    {
        
    }

    Awake() {
        this.sonarViewerScale = 0.8;
        this.sonarViewerPositionOffset = new THREE.Vector3(0.4, 0.1);

        // Outer ring
        this.geometry = new THREE.RingGeometry(0.95 * this.sonarViewerScale, this.sonarViewerScale);
        this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.1, 0.1) });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(this.sonarViewerPositionOffset.x, this.sonarViewerPositionOffset.y, this.sonarViewerPositionOffset.z);

        this.AddComponent(this.mesh);

        // Sonar viewer
        this.sonarViewController = GameObject.Instantiate(SonarViewController, this.transform, "Sonar ViewCone");
        this.sonarViewController.transform.scale.set(this.sonarViewerScale, this.sonarViewerScale, 1);
        this.sonarViewController.transform.position.set(this.sonarViewerPositionOffset.x, this.sonarViewerPositionOffset.y, this.sonarViewerPositionOffset.z);
        
        // Knob angle indicator base plate meshes
        this.basePlateMesh = MeshManager.instance.models.basePlateFull.scene;
        this.halfBasePlateMesh = MeshManager.instance.models.basePlateHalf.scene;
        this.basePlates = [];

        ////// Knobs
        const fullCircle = Math.PI*2;

        const knobScale = 0.1;
        const basePlatesScale = 1;

        const angleKnobAngle = 0.83;
        const angleKnobOffset = 1.1;

        const distanceKnobAngle = 0.78;
        const distanceKnobOffset = 1.4;

        const angleRangeKnobAngle = 0.66;
        const angleRangeKnobOffset = 1.1;

        const distanceRangeKnobAngle = 0.71;
        const distanceRangeKnobOffset = 1.4;

        // Angle knob
        this.angleKnob = GameObject.Instantiate(Knob, this.transform, "Angle Knob", false, true, false);
        var distance = angleKnobOffset;
        var offsetAngle = angleKnobAngle * fullCircle;
        this.angleKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, 0);
        this.angleKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.CreateBasePlate(this.angleKnob, false, basePlatesScale);

        // Angle range knob
        this.angleRangeKnob = GameObject.Instantiate(Knob, this.transform, "Angle Range Knob", true, true, true);
        var distance = angleRangeKnobOffset;
        offsetAngle = angleRangeKnobAngle * fullCircle;
        this.angleRangeKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, 0);
        this.angleRangeKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.angleRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.angleRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.angleRangeKnob, true, basePlatesScale);

        // Distance knob
        this.distanceKnob = GameObject.Instantiate(Knob, this.transform, "Distance Knob", true, true, true);
        distance = distanceKnobOffset;
        offsetAngle = distanceKnobAngle * fullCircle;
        this.distanceKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, 0);
        this.distanceKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.distanceKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceKnob, true, basePlatesScale);

        // Distance range knob
        this.distanceRangeKnob = GameObject.Instantiate(Knob, this.transform, "Distance Range Knob", true, true, true);
        var distance = distanceRangeKnobOffset;
        offsetAngle = distanceRangeKnobAngle * fullCircle;
        this.distanceRangeKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, 0);
        this.distanceRangeKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.distanceRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceRangeKnob, true, basePlatesScale);

        // Sound sources
        this.sonarTargets = [];
        this.sonarTargetVisuals = [];

    }

    CreateBasePlate(knob,halfBasePlate, scaleMultiplier = 1)
    {
        var basePlate;
        if(halfBasePlate)
        {
            basePlate = this.halfBasePlateMesh.clone();
        } else {
            basePlate = this.basePlateMesh.clone();
        }

        basePlate.rotation.x = Math.PI*0.5;
        basePlate.position.set(knob.transform.position.x, knob.transform.position.y, knob.transform.position.z);
        basePlate.scale.set(knob.transform.scale.x * scaleMultiplier, knob.transform.scale.y * scaleMultiplier, knob.transform.scale.z * scaleMultiplier);

        this.AddComponent(basePlate);
        this.basePlates.push(basePlate);
    }

    Start() {
        this.angleKnob.SetAngle(-Math.PI / 2);
        this.angleRangeKnob.SetPercentage(0.2);
        this.distanceKnob.SetPercentage(0.4);
        this.distanceRangeKnob.SetPercentage(0.4);

        const numSources = 10;

        this.sonarTargetsGroup = new THREE.Group();
        this.AddComponent(this.sonarTargetsGroup);

        this.sonarVisualsGroup = new THREE.Group();
        this.AddComponent(this.sonarVisualsGroup);

        var sonarTarget;
        var sonarTargetVisual;

        for (let i = 0; i < numSources; i++) {
            sonarTarget = GameObject.Instantiate(SonarTarget,  this.sonarTargetsGroup, "SonarTarget " + i);
            this.sonarTargets.push(sonarTarget);

            sonarTargetVisual = GameObject.Instantiate(SonarTargetVisual, this.sonarVisualsGroup, "SonarTargetVisual " + i)
            sonarTargetVisual.SetSonarViewerProperties(this.sonarViewerPositionOffset, this.sonarViewerScale);
            sonarTargetVisual.Link(sonarTarget);
            this.sonarTargetVisuals.push(sonarTargetVisual);
        }

        //this.sonarTargetsGroup.scale.set(this.sonarViewerScale, this.sonarViewerScale, 1.0);

        this.testDelay = 0.05;
        this.testCountdown = this.testDelay;

    }

    Update(deltaTime) 
    {
        this.testCountdown -= deltaTime;
        if(this.testCountdown<= 0)
        {
            this.testCountdown = this.testDelay;

            if(!this.sonarViewController.HasArcChangedSinceLastChecked())
            {
                // hasn't changed, don't bother updating sound sources
                return;
            }

            const arcParameters = this.sonarViewController.GetArcParameters();

            this.sonarTargets.forEach(sonarTarget => {
                sonarTarget.SetArcParameters(arcParameters.innerRadius, arcParameters.outerRadius, arcParameters.thetaMin, arcParameters.thetaMax);
            });
        }
    }

    SetVisible(visible)
    {
        this.mesh.visible = visible;
        this.mesh.layers.set(visible ? 0 : 1);

        this.angleKnob.SetActive(visible);
        this.angleRangeKnob.SetActive(visible);
        this.distanceKnob.SetActive(visible);
        this.distanceRangeKnob.SetActive(visible);
        this.sonarViewController.SetActive(visible);

        this.sonarTargets.forEach(sonarTarget => {
            sonarTarget.SetVisible(visible);
        });

        this.sonarTargetVisuals.forEach(sonarTargetVisual => {
            sonarTargetVisual.SetVisible(visible);
        });
    }

    OnEnable() {
        this.SetVisible(true);
        this.angleKnob.addEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.addEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnDisable() {
        this.SetVisible(false);
        this.angleKnob.removeEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.removeEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnAngleChanged = (e) => {
        this.sonarViewController.SetAngle(e.detail.angle);
    }

    OnAngleRangeChanged = (e) => {
        this.sonarViewController.SetAngleRange(1 - e.detail.percentage);
    }

    OnDistanceChanged = (e) => {
        this.sonarViewController.SetDistance(1 - e.detail.percentage);
    }

    OnDistanceRangeChanged = (e) => {
        this.sonarViewController.SetDistanceRange(1 - e.detail.percentage);
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

        if (this.angleKnob) {
            this.angleKnob.Destroy();
        }
    }



    
}