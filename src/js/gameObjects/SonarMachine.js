import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarViewController } from './SonarViewController';
import { Knob } from './Knob';
import { SonarTarget } from './SonarTarget';
import { MeshManager } from '../managers/MeshManager';

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

        // Knob angle indicator base plate meshes
        this.basePlateMesh = MeshManager.instance.models.basePlateFull.scene;
        this.halfBasePlateMesh = MeshManager.instance.models.basePlateHalf.scene;
        this.basePlates = [];

        ////// Knobs

        // Angle knob
        this.angleKnob = GameObject.Instantiate(Knob, this.transform, "Angle Knob", false, true, false);
        this.angleKnob.transform.position.set(Math.sin(3.5 * Math.PI / 2), Math.cos(3.5 * Math.PI / 2), 0) * 0.9;
        this.angleKnob.transform.scale.set(0.15, 0.15, 0.15);
        this.CreateBasePlate(this.angleKnob, false);

        // Angle range knob
        this.angleRangeKnob = GameObject.Instantiate(Knob, this.transform, "Angle Range Knob", true, true, true);
        this.angleRangeKnob.transform.position.set(Math.sin(3.25 * Math.PI / 2), Math.cos(3.25 * Math.PI / 2), 0) * 0.9;
        this.angleRangeKnob.transform.scale.set(0.15, 0.15, 0.15);
        this.angleRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.angleRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.angleRangeKnob, true);

        // Distance knob
        this.distanceKnob = GameObject.Instantiate(Knob, this.transform, "Distance Knob", true, true, true);
        this.distanceKnob.transform.position.set(Math.sin(Math.PI * 0.25), Math.cos(Math.PI * 0.25), 0) * 0.9;
        this.distanceKnob.transform.scale.set(0.15, 0.15, 0.15);
        this.distanceKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceKnob, true);

        // Distance range knob
        this.distanceRangeKnob = GameObject.Instantiate(Knob, this.transform, "Distance Range Knob", true, true, true);
        this.distanceRangeKnob.transform.position.set(Math.sin(Math.PI * 0.375), Math.cos(Math.PI * 0.375), 0) * 0.9;
        this.distanceRangeKnob.transform.scale.set(0.15, 0.15, 0.15);
        this.distanceRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceRangeKnob, true);

        // Sound sources
        this.soundSources = [];

    }

    CreateBasePlate(knob,halfBasePlate)
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
        basePlate.scale.set(knob.transform.scale.x, knob.transform.scale.y, knob.transform.scale.z);
        this.AddComponent(basePlate);
        this.basePlates.push(basePlate);
    }

    Start() {
        this.angleKnob.SetAngle(-Math.PI / 2);
        this.angleRangeKnob.SetPercentage(0.2);

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

            this.soundSources.forEach(soundSource => {
                soundSource.SetArcParameters(arcParameters.innerRadius, arcParameters.outerRadius, arcParameters.thetaMin, arcParameters.thetaMax);
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

        this.soundSources.forEach(soundSource => {
            soundSource.SetVisible(visible);
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