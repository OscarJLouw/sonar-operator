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
        this.portalsController.Setup(import.meta.env.PROD);

        this.playerMovementController = new PlayerMovementController();
        this.playerMovementController.Setup();

        this.dialogueManager = new DialogueManager();
        this.dialogueManager.Setup({ gameManager: this, audioManager: this.audioManager });

        this.playerControls = GameObject.Instantiate(PlayerControls, this.sceneManager.scene, "Player Controls UI");
        this.playerControls.Setup(this.playerMovementController);

        this.mainMenu = GameObject.Instantiate(MainMenu, this.sceneManager.scene, "Main Menu");
        this.mainMenu.Setup(this);

        window.addEventListener('pointerdown', () => {
            const ctx = this.audioManager.listener.context;
            if (ctx.state === 'suspended') ctx.resume();
        }, { once: true });


        this.handleMovementStateChange = event => this.OnMovementStateChanged(event.detail.previousState, event.detail.newState);
        this.playerMovementController.addEventListener("onEnterState", this.handleMovementStateChange);
    }

    InitialiseGame() {
        this.renderManager.SetAnimationLoop(() => this.Update());

        this.dialogueManager.registerNodes([
            { id: 'intro1', speaker: 'XO', text: 'Picking up a contact… {p: 0.6}{>}steady ping, 2-second interval.' , next: 'intro2' },
            { id: 'intro2', speaker: 'XO', text: 'What are you hearing?', choices: [
                { text: 'Biophony', next: 'bio', style: 'primary' },
                { text: 'Geophony', next: 'geo' },
                { text: 'Anthropogenic', next: 'anthro' },
                { text: 'Unknown', next: 'unk' },
                ]
            },
            { id: 'bio', text: '{color: #a2f39b}Biophony.{color: #e9ecf1} Humpback song patterns. Good catch.', next: null },
            { id: 'geo', text: 'No, that rumble isn\'t tectonic.', next: null },
            { id: 'anthro', text: 'Negative. Not prop cavitation.', next: null },
            { id: 'unk', text: 'Marking as unknown for now.', next: null },
            { id: 'test1', text: 'Testing second dialogue. {>>>}How does this feel? {>}Better? {>>}Worse?', next: null }
        ]);
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

        this.sceneManager.StartGame();

        this.playerMovementController.EnterState(this.playerMovementController.states.Entry);


        this.StartDialogue();

        // this.sceneManager.ActivateSonarView(false); // TODO: Hide sonar machine

        // 

    }

    async StartDialogue()
    {
        await this.dialogueManager.start('intro1');
        await this.#sleep(5);
        await this.dialogueManager.start('test1');


        console.log("dialogue finished");
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
                this.audioManager.FadeInSonarBus(1, 0.5);
                break;
            default:
                break;
        }
    }

    RegisterGameObject(gameObject) {
        console.log("GameManager registered GameObject: " + gameObject.name + " | ID: [ " + gameObject.id+"]");
        this.gameObjects.set(gameObject.id, gameObject);
    }

    DestroyGameObject(gameObject) {
        this.gameObjectsToDestroy.push(gameObject);
        gameObject.SetActive(false);
    }
    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

}

export const gameManager = new GameManager();
