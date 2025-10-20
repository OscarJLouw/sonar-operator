import * as THREE from 'three';
import { RenderManager } from './RenderManager.js';
import { SceneManager } from './SceneManager.js';
import { AudioManager } from './AudioManager.js';
import { MouseHandler } from '../utils/MouseHandler.js';
import { PortalsController } from './PortalsController.js';
import { MainMenu } from '../gameObjects/UI/MainMenu.js';
import { GameObject } from '../gameObjects/GameObject.js';
import { MeshManager } from './MeshManager.js';
import { PlayerMovementController } from './PlayerMovementController.js';
import { PlayerControls } from '../gameObjects/UI/PlayerControls.js';

export class GameManager {
    constructor() {
        // Singleton pattern
        if (!GameManager.instance) {
            GameManager.instance = this;
        }

        return GameManager.instance;
    }

    async Setup() {
        this.gameObjects = new Map();
        this.gameObjectsToDestroy = [];
        this.gameState = "Initialising";

        this.CreateGlobalComponents();
        await this.CreateManagers();
        this.InitialiseGame();
        this.MainMenu();
        //this.StartGame();
    }

    CreateGlobalComponents() {
        this.loader = new THREE.TextureLoader();
        this.clock = new THREE.Clock();
        this.clock.getDelta();
    }

    async CreateManagers() {
        this.sceneManager = new SceneManager();
        this.sceneManager.Setup(1.3333333);

        this.meshManager = new MeshManager();
        await this.meshManager.Setup();

        this.audioManager = new AudioManager();
        await this.audioManager.Setup(this.sceneManager.camera);

        this.renderManager = new RenderManager();
        this.renderManager.Setup(this.sceneManager, false);

        this.mouseHandler = new MouseHandler();
        this.mouseHandler.Setup(this.sceneManager.camera);

        this.portalsController = new PortalsController();
        this.portalsController.Setup();

        this.playerMovementController = new PlayerMovementController();
        this.playerMovementController.Setup();

        this.playerControls = GameObject.Instantiate(PlayerControls, this.sceneManager.scene, "Player Controls UI");
        this.playerControls.Setup(this.playerMovementController);

        this.mainMenu = GameObject.Instantiate(MainMenu, this.sceneManager.scene, "Main Menu");
        this.mainMenu.Setup(this);


        window.addEventListener('pointerdown', () => {
            const ctx = this.audioManager.listener.context;
            if (ctx.state === 'suspended') ctx.resume();
        }, { once: true });
    }

    InitialiseGame() {
        this.renderManager.SetAnimationLoop(() => this.Update());
    }

    MainMenu() {
        this.gameState = "Main Menu";
        this.mainMenu.Show();
        //this.StartGame();
    }

    StartGame() {

        this.gameState = "Starting";
        //this.renderManager.SetPixellation(6);

        this.portalsController.StartGame();

        this.audioManager.Start();
        this.audioManager.FadeInAmbience(0.2, 3);

        this.playerMovementController.EnterState(this.playerMovementController.states.Entry);

        this.sceneManager.CreateSonarView();
        // this.sceneManager.ActivateSonarView(false); // TODO: Hide sonar machine

        // 

    }

    Update() {
        const deltaTime = this.clock.getDelta();

        this.sceneManager.Update(deltaTime);

        this.gameObjects.forEach(gameObject => {
            if (gameObject.enabled) {
                gameObject.Update(deltaTime);
            }
        });

        this.renderManager.Render(deltaTime);

        if (this.gameObjectsToDestroy.length > 0) {
            // clean up destroyed gameObjects
            this.gameObjectsToDestroy.forEach(gameObject => {
                this.gameObjects.delete(gameObject.id);
                gameObject.OnDestroy();
            });
            this.gameObjectsToDestroy.length = 0;
        }
    }

    RegisterGameObject(gameObject) {
        console.log("Registered GameObject " + gameObject.name + " with id " + gameObject.id);
        this.gameObjects.set(gameObject.id, gameObject);
    }

    DestroyGameObject(gameObject) {
        this.gameObjectsToDestroy.push(gameObject);
        gameObject.SetActive(false);
    }
}

export const gameManager = new GameManager();
