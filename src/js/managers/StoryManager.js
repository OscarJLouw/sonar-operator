import * as THREE from "three";
import { DialogueManager } from "./DialogueManager";
import { World } from "../gameObjects/World";

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
            // Introduction
            { id: "intro1", speaker: "XO", text: "Good evening sonarsman." , next: "intro2" },
            { id: "intro2", speaker: "XO", text: "{>>}Ready for another...{p: 0.3}{>} long {>>} night shift?", next: "intro3", choices: [
                {text: "Always ready Commander.", next: "intro3"},
                {text: "Still waking up, Sir.", next: "intro3"}
            ]},
            { id: "intro3", speaker: "XO", text: "Get yourself acquainted with the new space before tonights briefing.", choices: [
                { text: "Why did we have to move the sonar array down here?", next: "intro_whyMove", style: "primary" },    // highlights a button in green, use with main conversation thread
                { text: "Copy that.", next: "intro_signOff" }
                ]
            },
            { id: "intro_whyMove", text: "{>>>}I'm not happy about it either, {>>}technician, {>>>}but you well know that the engine work cannot be delayed any longer. ", next: "intro_signOff" },
            { id: "intro_signOff", text: "Report back on the radio when you're ready.", next: null },
        ]);
    }

    SetWorld(world)
    {
        this.world = world;
    }

    async Start()
    {
        await this.dialogueManager.start("intro1");
        //await this.#sleep(5);
        // 
    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

}
