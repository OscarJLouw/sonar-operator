import * as THREE from 'three';
import { RenderManager } from './RenderManager.js';
import { SceneManager } from './SceneManager.js';
import { MouseHandler } from '../utils/MouseHandler.js';
        
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

        this.CreateGlobalComponents();
        this.CreateManagers();
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
        this.mouseHandler = new MouseHandler(this.sceneManager.camera);
        this.renderManager = new RenderManager(this.sceneManager, false);
    }

    StartGame()
    {
        this.renderManager.SetPixellation(6);
        this.renderManager.SetAnimationLoop(() => this.Update());

        this.sceneManager.Start();
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
