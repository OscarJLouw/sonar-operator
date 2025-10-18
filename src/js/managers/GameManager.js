import * as THREE from 'three';
import { RenderManager } from './RenderManager.js';
import { SceneManager } from './SceneManager.js';
import { AudioManager } from './AudioManager.js';
import { MouseHandler } from '../utils/MouseHandler.js';
import { PortalsController } from './PortalsController.js';
        
export class GameManager {
    constructor() {
        // Singleton pattern
        if (!GameManager.instance) {
            GameManager.instance = this;
        }

        return GameManager.instance;
    }

    Setup() {
        this.gameObjects = new Map();
        this.gameObjectsToDestroy = [];
        this.gameState = "Initialising";

        this.CreateGlobalComponents();
        this.CreateManagers();
        this.MainMenu();
        this.StartGame();
    }

    CreateGlobalComponents()
    {
        this.loader = new THREE.TextureLoader();
        this.clock = new THREE.Clock();
        this.clock.getDelta();
    }

    CreateManagers()
    {
        this.sceneManager = new SceneManager();
        this.sceneManager.Setup(1.3333333);
        this.audioManager = new AudioManager();
        this.audioManager.Setup(this.sceneManager.camera);
        this.renderManager = new RenderManager();
        this.renderManager.Setup(this.sceneManager, false);
        this.mouseHandler = new MouseHandler();
        this.mouseHandler.Setup(this.sceneManager.camera);
        this.portalsController = new PortalsController();

        window.addEventListener('pointerdown', () => {
            const ctx = this.audioManager.listener.context;
            if (ctx.state === 'suspended') ctx.resume();
        }, { once: true });
    }

    MainMenu()
    {
        this.StartGame();

    }

    StartGame()
    {
        this.gameState = "MainMenu";

        //this.renderManager.SetPixellation(6);
        this.renderManager.SetAnimationLoop(() => this.Update());

        this.audioManager.Start();
        this.audioManager.FadeInAmbience(0.2, 3);

        this.sceneManager.CreateSonarView();

        // 

    }

    Update() {
        const deltaTime = this.clock.getDelta();

        this.sceneManager.Update(deltaTime);

        this.gameObjects.forEach(gameObject => {
            if(gameObject.enabled)
            {
                gameObject.Update(deltaTime);
            }
        });

        this.renderManager.Render(deltaTime);

        if(this.gameObjectsToDestroy.length > 0)
        {
            // clean up destroyed gameObjects
            this.gameObjectsToDestroy.forEach(gameObject => {
                this.gameObjects.delete(gameObject.id);
                gameObject.OnDestroy();
            });
            this.gameObjectsToDestroy.length = 0;
        }
    }

    RegisterGameObject(gameObject)
    {
        console.log("Registered GameObject " + gameObject.name + " with id " + gameObject.id);
        this.gameObjects.set(gameObject.id, gameObject);
    }

    DestroyGameObject(gameObject)
    {
        this.gameObjectsToDestroy.push(gameObject);
        gameObject.SetActive(false);
    }
}

export const gameManager = new GameManager();
