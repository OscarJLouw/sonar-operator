import * as THREE from 'three';
import { DialogueManager } from './DialogueManager';
import { World } from '../gameObjects/World';

export class StoryManager {
    constructor() {
        // Singleton pattern
        if (!StoryManager.instance) {
            StoryManager.instance = this;
        }

        return StoryManager.instance;
    }

    Setup(gameManager, dialogueManager, audioManager, world) {
        this.gameManager = gameManager;
        this.dialogueManager = dialogueManager;
        this.audioManager =  audioManager;
        
        this.CreateDialogues();
    }

    CreateDialogues()
    {
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

    SetWorld(world)
    {
        this.world = world;
    }

    async Start()
    {
        await this.dialogueManager.start('intro1');
        await this.#sleep(5);
        await this.dialogueManager.start('test1');

        console.log("dialogue finished");
    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

}
