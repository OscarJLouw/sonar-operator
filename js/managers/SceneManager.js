import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler.js';
import { SonarMachine } from '../gameObjects/SonarMachine.js';
import { GameObject } from '../gameObjects/GameObject.js';

export class SceneManager extends Resizable {
    constructor() {
        super();

        // Singleton pattern
        if (!SceneManager.instance) {
            SceneManager.instance = this;
            this.Setup();

        }

        return SceneManager.instance;
    }

    Setup()
    {
        this.scene = new THREE.Scene();
        //this.scene.background = new THREE.Color(0x151729);

        this.camera = new THREE.OrthographicCamera(-this.aspectRatio, this.aspectRatio, 1, - 1, 0.1, 10);
        this.camera.position.z = 2;
        this.Resize(this.width, this.height, this.aspectRatio);

        // create an AudioListener and add it to the camera
        this.listener = new THREE.AudioListener();
        this.camera.add( this.listener );

        // load a sound and set it as the Audio object's buffer
        this.audioLoader = new THREE.AudioLoader();
    }

    Start() {
        // Add components to the scene
        //let sphere = new Sphere(this.scene);

        this.scene.add(new THREE.AmbientLight(0xffffff, 1));

        let sonarMachine = GameObject.Instantiate(SonarMachine, this.scene, "Sonar Machine");
    }

    Update(deltaTime) {
    }

    Resize(width, height, aspectRatio)
    {
        this.camera.left = -aspectRatio;
        this.camera.right = aspectRatio;
        this.camera.top = 1;
        this.camera.bottom = -1;
        this.camera.updateProjectionMatrix();
    }
}