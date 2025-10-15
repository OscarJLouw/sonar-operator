import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameManager } from '../managers/GameManager';
import { SonarViewController } from './SonarViewController';
import { Knob } from './Knob';

export class SonarMachine extends GameObject {

    Awake()
    {
        this.geometry = new THREE.RingGeometry(0.5, 0.6);

        // Testing texture loading
        /*
        const texChecker = pixelTexture(GameManager.instance.loader.load('../../textures/checker.png'));
        texChecker.repeat.set(3, 3);
        function pixelTexture(texture) {
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        }
        */

        this.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.1, 0.1, 0.1)
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 0);

        this.AddComponent(this.mesh);

        this.sonarViewController = GameObject.Instantiate(SonarViewController, this.transform, "Sonar ViewCone");
        this.sonarViewController.transform.scale.set(0.6, 0.6, 1);

        this.angleKnob = GameObject.Instantiate(Knob, this.transform, "Angle Knob");
        this.angleKnob.transform.position.set(Math.sin(3.5*Math.PI/2), Math.cos(3.5*Math.PI/2), 0) * 0.9;
        this.angleKnob.transform.scale.set(0.15, 0.15, 1);

        this.angleRangeKnob = GameObject.Instantiate(Knob, this.transform, "Angle Range Knob");
        this.angleRangeKnob.transform.position.set(Math.sin(3.25*Math.PI/2), Math.cos(3.25*Math.PI/2), 0) * 0.9;
        this.angleRangeKnob.transform.scale.set(0.15, 0.15, 1);
        this.angleRangeKnob.SetClampRotation(true, 0, Math.PI);
        this.angleRangeKnob.SetRelativeRotationControl(false);

        this.distanceKnob = GameObject.Instantiate(Knob, this.transform, "Distance Knob");
        this.distanceKnob.transform.position.set(Math.sin(Math.PI*0.25), Math.cos(Math.PI*0.25), 0) * 0.9;
        this.distanceKnob.transform.scale.set(0.15, 0.15, 1);
        this.distanceKnob.SetClampRotation(true, 0, Math.PI);
        this.distanceKnob.SetRelativeRotationControl(false);

        this.distanceRangeKnob = GameObject.Instantiate(Knob, this.transform, "Distance Range Knob");
        this.distanceRangeKnob.transform.position.set(Math.sin(Math.PI * 0.375), Math.cos(Math.PI * 0.375), 0) * 0.9;
        this.distanceRangeKnob.transform.scale.set(0.15, 0.15, 1);
        this.distanceRangeKnob.SetClampRotation(true, 0, Math.PI);
        this.distanceRangeKnob.SetRelativeRotationControl(false);
    }

    Start()
    {
        this.angleKnob.SetAngle(-Math.PI/2);
        this.angleRangeKnob.SetPercentage(0.2);
    }

    Update(deltaTime)
    {
        
    }



    OnEnable()
    {
        this.mesh.visible = true;
        this.angleKnob.addEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.addEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnDisable()
    {
        this.mesh.visible = false;
        this.angleKnob.removeEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.removeEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnAngleChanged = (e) =>
    {
        this.sonarViewController.SetAngle(e.detail.angle);
    }

    OnAngleRangeChanged = (e) =>
    {
        this.sonarViewController.SetAngleRange(1 - e.detail.percentage);
    }

    OnDistanceChanged = (e) =>
    {
        this.sonarViewController.SetDistance(1 - e.detail.percentage);
    }

    OnDistanceRangeChanged = (e) =>
    {
        this.sonarViewController.SetDistanceRange(1 - e.detail.percentage);
    }

    OnDestroy()
    {
        if(this.geometry) this.geometry.dispose();

        if(this.material){
            if(this.material.map)
            {
                this.material.map.dispose();
            }

            this.material.dispose();
        }
        
        if(this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;

        if(this.angleKnob)
        {
            this.angleKnob.Destroy();
        }
    }
}