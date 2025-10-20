import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarViewController } from './SonarViewController';
import { Knob } from './Knob';
import { SonarTarget } from './SonarTarget';

export class SonarMachine extends GameObject {

    CreateSonarView()
    {
        
    }

    Awake() {
        this.sonarViewerScale = 0.6;

        // Outer ring
        this.geometry = new THREE.RingGeometry(0.95 * this.sonarViewerScale, this.sonarViewerScale);
        this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.1, 0.1) });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 0);


        this.AddComponent(this.mesh);

        // Sonar viewer
        this.sonarViewController = GameObject.Instantiate(SonarViewController, this.transform, "Sonar ViewCone");
        this.sonarViewController.transform.scale.set(this.sonarViewerScale, this.sonarViewerScale, 1);

        // Knobs
        this.angleKnob = GameObject.Instantiate(Knob, this.transform, "Angle Knob");
        this.angleKnob.transform.position.set(Math.sin(3.5 * Math.PI / 2), Math.cos(3.5 * Math.PI / 2), 0) * 0.9;
        this.angleKnob.transform.scale.set(0.15, 0.15, 1);

        this.angleRangeKnob = GameObject.Instantiate(Knob, this.transform, "Angle Range Knob");
        this.angleRangeKnob.transform.position.set(Math.sin(3.25 * Math.PI / 2), Math.cos(3.25 * Math.PI / 2), 0) * 0.9;
        this.angleRangeKnob.transform.scale.set(0.15, 0.15, 1);
        this.angleRangeKnob.SetClampRotation(true, 0, Math.PI);
        this.angleRangeKnob.SetRelativeRotationControl(false);

        this.distanceKnob = GameObject.Instantiate(Knob, this.transform, "Distance Knob");
        this.distanceKnob.transform.position.set(Math.sin(Math.PI * 0.25), Math.cos(Math.PI * 0.25), 0) * 0.9;
        this.distanceKnob.transform.scale.set(0.15, 0.15, 1);
        this.distanceKnob.SetClampRotation(true, 0, Math.PI);
        this.distanceKnob.SetRelativeRotationControl(false);

        this.distanceRangeKnob = GameObject.Instantiate(Knob, this.transform, "Distance Range Knob");
        this.distanceRangeKnob.transform.position.set(Math.sin(Math.PI * 0.375), Math.cos(Math.PI * 0.375), 0) * 0.9;
        this.distanceRangeKnob.transform.scale.set(0.15, 0.15, 1);
        this.distanceRangeKnob.SetClampRotation(true, 0, Math.PI);
        this.distanceRangeKnob.SetRelativeRotationControl(false);
    }

    Start() {
        this.angleKnob.SetAngle(-Math.PI / 2);
        this.angleRangeKnob.SetPercentage(0.2);

        this.soundSources = [];
        const numSources = 10;
        const anglePerSource = Math.PI*2 / numSources;

        this.soundSourceGroup = new THREE.Group();
        this.transform.add(this.soundSourceGroup);
        var soundSource;

        for (let i = 0; i < numSources; i++) {
            soundSource = GameObject.Instantiate(SonarTarget,  this.soundSourceGroup, "Sound Source " + i);
            //const angle = anglePerSource * i;
            //soundSource.transform.position.x = Math.cos(angle) * 0.5;
            //soundSource.transform.position.y = Math.sin(angle) * 0.5;
            
            this.soundSources.push(soundSource);
        }

        this.soundSourceGroup.scale.set(this.sonarViewerScale, this.sonarViewerScale, 1.0);

        this.testDelay = 0.1;
        this.testCountdown = this.testDelay;

    }

    Update(deltaTime) {

        this.testCountdown -= deltaTime;
        if(this.testCountdown<= 0)
        {

            const arcParameters = this.sonarViewController.GetArcParameters();

            this.soundSources.forEach(soundSource => {
                soundSource.SetArcParameters(arcParameters.innerRadius, arcParameters.outerRadius, arcParameters.thetaMin, arcParameters.thetaMax);
            });

            this.testCountdown = this.testDelay;

        }
    }


    OnEnable() {
        this.mesh.visible = true;
        this.angleKnob.addEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.addEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnDisable() {
        this.mesh.visible = false;
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