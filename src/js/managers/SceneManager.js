import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler.js';
import { GameObject } from '../gameObjects/GameObject.js';
import { SonarMachine } from '../gameObjects/SonarMachine.js';
import { PlayerMovementController } from './PlayerMovementController.js';
import { World } from '../gameObjects/World.js';
import { RenderManager } from './RenderManager.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

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

        this.camera = new THREE.OrthographicCamera(-this.targetAspectRatio, this.targetAspectRatio, 1, - 1, 0.1, 50);
        this.camera.position.z = 10;
        //this.camera = new THREE.PerspectiveCamera(15, this.targetAspectRatio, 0.01, 500);
        //this.camera.position.z = 20;
        //this.camera.position.y = -0.1;
        //this.camera.lookAt(new THREE.Vector3(0,0,0));
        this.Resize(this.width, this.height, this.aspectRatio);

        this.ambientLight = new THREE.AmbientLight(0xf6e7d2, 1);
        this.scene.add(this.ambientLight);

        this.pointLight = new THREE.PointLight(0xffd88d, 2);
        this.scene.add(this.pointLight);
        this.pointLight.position.set(0, 1, 1.5);
        this.pointLight.castShadows = true;
        //this.pointLight.distance = 5;

        this.directionalLight = new THREE.DirectionalLight(0xffec8b, 1);
        this.directionalLight.castShadows = true;
        this.scene.add(this.directionalLight);
        this.directionalLight.position.set(-0.85, -0.75, 1.5);
        this.directionalLight.lookAt(0, 0, 0);
    }

    CreateControls(targetObject) {
        this.transformControls = new TransformControls(this.camera, RenderManager.instance.renderer.domElement);
        this.transformControls.attach(targetObject);

        const gizmo = this.transformControls.getHelper();
        SceneManager.instance.scene.add(gizmo);

        this.transformControls.addEventListener('change', (e) => {
            console.log(`Pos: x: ${targetObject.position.x} | y: ${targetObject.position.y} | z: ${targetObject.position.z}`);
            console.log(`Scale: x: ${targetObject.scale.x} | y: ${targetObject.scale.y} | z: ${targetObject.scale.z}`);
        });

        window.addEventListener('keydown', (event) => {

            switch (event.key) {
                case 'Shift':
                    this.transformControls.setS
                    this.transformControls.setTranslationSnap(0.01);
                    this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
                    this.transformControls.setScaleSnap(0.01);
                    break;
                case 'w':
                    this.transformControls.setMode('translate');
                    break;

                case 'e':
                    this.transformControls.setMode('rotate');
                    break;

                case 'r':
                    this.transformControls.setMode('scale');
                    break;

                case 'x':
                    this.transformControls.showX = !this.transformControls.showX;
                    break;

                case 'y':
                    this.transformControls.showY = !this.transformControls.showY;
                    break;

                case 'z':
                    this.transformControls.showZ = !this.transformControls.showZ;
                    break;
                default:
                    break;
            }
        });
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