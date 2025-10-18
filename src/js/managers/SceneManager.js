import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler.js';
import { GameObject } from '../gameObjects/GameObject.js';
import { SonarMachine } from '../gameObjects/SonarMachine.js';

export class SceneManager extends Resizable {
    constructor() {
        super();

        // Singleton pattern
        if (!SceneManager.instance) {
            SceneManager.instance = this;
        }

        return SceneManager.instance;
    }

    Setup(targetAspectRatio)
    {
        this.targetAspectRatio = targetAspectRatio;

        this.scene = new THREE.Scene();
        //this.scene.background = new THREE.Color(0x151729);

        this.camera = new THREE.OrthographicCamera(-this.targetAspectRatio, this.targetAspectRatio, 1, - 1, 0.1, 10);
        this.camera.position.z = 2;
        this.Resize(this.width, this.height, this.aspectRatio);
        this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    }

    CreateSonarView() {
        this.sonarMachine = GameObject.Instantiate(SonarMachine, this.scene, "Sonar Machine");
    }

    ActivateSonarView(active)
    {
        active ? this.sonarMachine.Show() : this.sonarMachine.Hide();
    }

    Update(deltaTime) {

    }

    Resize(width, height, aspectRatio)
    {

        this.camera.left = -this.targetAspectRatio;
        this.camera.right = this.targetAspectRatio;
        this.camera.top = 1;
        this.camera.bottom = -1;

            /*
        if(width > height)
        {
            this.camera.left = -this.targetAspectRatio;
            this.camera.right = this.targetAspectRatio;
            this.camera.top = 1;
            this.camera.bottom = -1;
        } else {
            this.camera.left = -1;
            this.camera.right = 1;
            this.camera.top = this.targetAspectRatio;
            this.camera.bottom = -this.targetAspectRatio;
        }
        */

        /*
        this.camera.left = -aspectRatio;
        this.camera.right = aspectRatio;
        this.camera.top = 1;
        this.camera.bottom = -1;
        */

        this.camera.updateProjectionMatrix();
    }
}