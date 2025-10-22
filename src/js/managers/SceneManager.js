import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler.js';
import { GameObject } from '../gameObjects/GameObject.js';
import { SonarMachine } from '../gameObjects/SonarMachine.js';
import { PlayerMovementController } from './PlayerMovementController.js';
import { World } from '../gameObjects/World.js';

export class SceneManager extends Resizable {
    constructor() {
        super();

        // Singleton pattern
        if (!SceneManager.instance) {
            SceneManager.instance = this;
        }

        return SceneManager.instance;
    }

    Setup(targetAspectRatio) {
        this.events = new EventTarget();

        this.targetAspectRatio = targetAspectRatio;

        this.scene = new THREE.Scene();
        this.sonarScene = new THREE.Scene();
        //this.scene.background = new THREE.Color(0x151729);

        this.camera = new THREE.OrthographicCamera(-this.targetAspectRatio, this.targetAspectRatio, 1, - 1, 0.1, 10);
        this.camera.position.z = 2;
        //this.camera.position.y = -0.1;
        //this.camera.lookAt(new THREE.Vector3(0,0,0));
        this.Resize(this.width, this.height, this.aspectRatio);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.scene.add(this.directionalLight);
        this.directionalLight.position.set(3, 5, 10);
    }

    CreateWorld() {
        this.world = GameObject.Instantiate(World, this.scene, "World");
    }

    StartGame() {
        this.CreateWorld();
        this.CreateSonarView();

        this.handleMovementStateChange = event => this.OnMovementStateChange(event.detail.previousState, event.detail.newState);
        PlayerMovementController.instance.addEventListener("onEnterState", this.handleMovementStateChange);

        this.world.StartGame();
    }

    CreateSonarView() {
        this.sonarMachine = GameObject.Instantiate(SonarMachine, this.scene, "Sonar Machine");
        this.sonarMachine.SetActive(false);
        this.sonarMachine.SetWorld(this.world);
    }

    ActivateSonarView(active) {
        this.sonarMachine.SetActive(active);
    }

    OnMovementStateChange(previousState, newState) {
        if (newState == PlayerMovementController.instance.states.UsingSonar) {
            this.sonarMachine.SetActive(true);
        } else if (previousState == PlayerMovementController.instance.states.UsingSonar) {
            this.sonarMachine.SetActive(false);

        }
    }

    Update(deltaTime) {

    }

    Resize(width, height, aspectRatio) {

        this.camera.left = -this.targetAspectRatio;
        this.camera.right = this.targetAspectRatio;
        this.camera.top = 1;
        this.camera.bottom = -1;

        this.camera.updateProjectionMatrix();
    }


    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}