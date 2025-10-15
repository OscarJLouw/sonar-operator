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
    }

    Start()
    {
        this.sonarViewController = new SonarViewController(this.transform, "Sonar ViewCone");
        this.sonarViewController.transform.scale.set(0.6, 0.6, 1);

        this.angleKnob = new Knob(this.transform, "Angle Knob");
        this.angleKnob.transform.position.set(Math.sin(3.5*Math.PI/2), Math.cos(3.5*Math.PI/2), 0) * 0.9;
        this.angleKnob.transform.scale.set(0.15, 0.15, 1);

        this.angleWidthKnob = new Knob(this.transform, "Angle Width Knob");
        this.angleWidthKnob.transform.position.set(Math.sin(3.25*Math.PI/2), Math.cos(3.25*Math.PI/2), 0) * 0.9;
        this.angleWidthKnob.transform.scale.set(0.15, 0.15, 1);
        this.angleWidthKnob.SetClampRotation(true, 0, Math.PI);
        this.angleWidthKnob.SetRelativeRotationControl(false);
    }

    OnEnable()
    {
        this.mesh.visible = true;
    }

    Update(deltaTime)
    {
    }

    OnDisable()
    {
        this.mesh.visible = false;
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