import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameManager } from '../managers/GameManager';
import { SonarViewController } from './SonarViewController';

export class SonarMachine extends GameObject {

    Awake()
    {
        this.geometry = new THREE.RingGeometry(0.5, 0.6);

        // Testing texture loading
        const texChecker = pixelTexture(GameManager.instance.loader.load('../../textures/checker.png'));
        texChecker.repeat.set(3, 3);
        this.material = new THREE.MeshStandardMaterial({map: texChecker});

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 0);

        this.AddComponent(this.mesh);

        function pixelTexture(texture) {
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        }
    }

    Start()
    {
        this.mesh.material.color = new THREE.Color(1,0,0);
        this.mesh.material.needsUpdate = true;

        var sonarViewController = new SonarViewController(this.transform);
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