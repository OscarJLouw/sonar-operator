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
import { DialogueManager } from './DialogueManager';
import { StoryManager } from './StoryManager.js';
import { GameEventManager } from '../gameData/GameEventManager.js';
import { CharacterVoices } from '../gameData/CharacterVoices.js';

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

        var loader = document.getElementById('loader');
        loader.remove();
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
        this.characterVoices = new CharacterVoices();
        this.audioManager.addNamespace('voices', () => this.characterVoices.GetAllVoices());
        await this.audioManager.Setup(this.sceneManager.camera);

        this.renderManager = new RenderManager();
        this.renderManager.Setup(this.sceneManager, true, {targetHeight: 1024});
        this.renderManager.SetPixellation(1.5);

        this.mouseHandler = new MouseHandler();
        this.mouseHandler.Setup(this.sceneManager.camera);

        this.portalsController = new PortalsController();
        this.portalsController.Setup(import.meta.env.PROD);

        this.playerMovementController = new PlayerMovementController();
        this.playerMovementController.Setup();

        this.dialogueManager = new DialogueManager();
        this.dialogueManager.Setup({ gameManager: this, audioManager: this.audioManager });

        this.storyManager = new StoryManager();
        this.storyManager.Setup(this, this.dialogueManager, this.audioManager);

        this.playerControls = GameObject.Instantiate(PlayerControls, this.sceneManager.scene, "Player Controls UI");
        this.playerControls.Setup(this.playerMovementController);

        this.mainMenu = GameObject.Instantiate(MainMenu, this.sceneManager.scene, "Main Menu");
        this.mainMenu.Setup(this);

        this.characterVoices.LinkWithDialogue(this.dialogueManager);

        // Event listeners
        window.addEventListener('pointerdown', () => {
            const ctx = this.audioManager.listener.context;
            if (ctx.state === 'suspended') ctx.resume();
        }, { once: true });


        this.handleMovementStateChange = event => this.OnMovementStateChanged(event.detail.previousState, event.detail.newState);
        this.playerMovementController.addEventListener("onEnterState", this.handleMovementStateChange);

        this.handleDialogueStarted = event => this.OnDialogueStarted(event.detail.nodeId);
        this.dialogueManager.addEventListener("dialogueStarted", this.handleDialogueStarted);
        
        this.handleDialogueEnded = event => this.OnDialogueEnded(event.detail.reason);
        this.dialogueManager.addEventListener("dialogueEnded", this.handleDialogueEnded);

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

        // Start the game in Portals
        this.portalsController.StartGame();

        // Fade in the audio

        
        this.audioManager.Start();
        this.audioManager.FadeInAmbience(0.2, 3);

        // Create the in-game elements (world, sonar view, etc)
        this.sceneManager.StartGame();

        // Setup the story and game events
        this.gameEvents = new GameEventManager();
        this.gameEvents.Setup(this, this.audioManager, this.dialogueManager, this.sceneManager.world);

        this.storyManager.SetWorld(this.sceneManager.world);
        this.storyManager.SetGameEventManager(this.gameEvents);

        // Put the player in the entrance hallway
        this.playerMovementController.EnterState(this.playerMovementController.states.Entry);

        // Let's go!
        this.StartStory();
    }

    async StartStory()
    {
        await this.storyManager.Start();
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
            var objectsToDestroyThisIteration;
            var iterations = 0;
            const maxIterations = 50;

            while(this.gameObjectsToDestroy.length > 0 && iterations < maxIterations)
            {
                objectsToDestroyThisIteration = [...this.gameObjectsToDestroy];
                this.gameObjectsToDestroy.length = 0;

                objectsToDestroyThisIteration.forEach(gameObject => {
                    console.log("GameManager destroying GameObject: " + gameObject.name + " | ID: ["+gameObject.id+"]");

                    this.gameObjects.delete(gameObject.id);
                    gameObject.OnDestroy();
                });

                objectsToDestroyThisIteration.length = 0;

                iterations++;
            }

            if(iterations >= maxIterations)
            {
                console.error("Exceeded max destroy iterations. There's probably a destroy loop of some kind. Current gameObjectsToDestroy: " + this.gameObjectsToDestroy);
            }

            this.gameObjectsToDestroy.length = 0;
        }
    }

    OnMovementStateChanged(previousState, newState) {
        var states = this.playerMovementController.states;

        switch (previousState) {
            case states.UsingSonar:
                // Fade out sonar sound sources
                this.audioManager.FadeOutSonarBus(0.5);
                break;
            default:
                break;
        }

        switch(newState)
        {
            case states.UsingSonar:
                // Fade in sonar sound sources
                this.audioManager.FadeInSonarBus(0.9, 0.5);
                break;
            default:
                break;
        }
    }

    OnDialogueStarted(nodeId)
    {
        console.log("Dialogue started");
        this.playerControls.HideAll();
    }

    OnDialogueEnded(reason)
    {
        console.log("Dialogue Ended");
        this.playerControls.ShowButtonsForValidExits();
    }

    RegisterGameObject(gameObject) {
        console.log("GameManager registered GameObject: " + gameObject.name + " | ID: [ " + gameObject.id+"]");
        this.gameObjects.set(gameObject.id, gameObject);
    }

    DestroyGameObject(gameObject) {
        this.gameObjectsToDestroy.push(gameObject);
        gameObject.SetActive(false);
    }
}

export const gameManager = new GameManager();
