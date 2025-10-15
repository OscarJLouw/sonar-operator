import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameManager } from '../managers/GameManager';
import { Draggable } from '../utils/MouseHandler';
import { SceneManager } from '../managers/SceneManager';
import { Knob } from './Knob';

export class SonarViewController extends GameObject {

    Awake()
    {
        this.geometry = new THREE.RingGeometry(0, 0.85, 32, 1, 0, Math.PI*0.2);
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(0.1, 0.8, 0.2)});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, -0.1);

        this.AddComponent(this.mesh);

        this.knob1 = new Knob(this.transform);
        this.knob1.transform.position.set(Math.sin(3.5*Math.PI/2), Math.cos(3.5*Math.PI/2), 0);
        this.knob1.transform.scale.set(0.15, 0.15, 1);
    }

    Start()
    {
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
        if(this.knob1)
        {
            this.knob1.Destroy();
        }

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
    }
}