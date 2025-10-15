import * as THREE from 'three';
import { GameObject } from './GameObject';

export class SonarViewController extends GameObject {

    Awake()
    {
        this.geometry = new THREE.RingGeometry(0, 1, 32, 1, 0, Math.PI*0.2);
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(0.1, 0.8, 0.2)});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, -0.1);

        this.AddComponent(this.mesh);
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