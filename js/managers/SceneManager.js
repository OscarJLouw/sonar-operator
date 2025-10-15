import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler.js';
import { Sphere } from '../components/Sphere.js';
import { SonarMachine } from '../gameObjects/SonarMachine.js';

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
    }

    Start() {
        // Add components to the scene
        //let sphere = new Sphere(this.scene);

        this.scene.add(new THREE.AmbientLight(0xffffff, 1));

        let radar = new SonarMachine(this.scene);
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