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
        this.skipDialogue = true;

        this.gameManager = gameManager;
        this.dialogueManager = dialogueManager;
        this.audioManager = audioManager;

        this.CreateIntroDialogue();
        this.CreateTutorialDialogue();
    }

    SetWorld(world) {
        this.world = world;
    }

    SetGameEventManager(gameEvents) {
        this.gameEvents = gameEvents;
    }

    async Start() {
        // Intro
        await this.#sleep(10);
        await this.dialogueManager.start("intro1");
        await this.#sleep(4);
        await this.dialogueManager.start("intro2");

        // Tutorial
        // search for humpback whales (biophony example)
        await this.gameEvents.HumpbackSearch();
        await this.dialogueManager.start("tutorial_foundFirstTarget");

        // search for two ships (anthropogenic example)
        await this.gameEvents.ShipsSearch();
        await this.dialogueManager.start("tutorial_foundSecondTarget");

        // seach for reefs (geophony example)
        await this.gameEvents.ReefsSearch();
        await this.dialogueManager.start("tutorial_foundThirdTarget");
    }


    CreateIntroDialogue() {
        this.dialogueManager.registerNodes([

            // ACT 0: INTRO

            {
                id: "intro1",
                speaker: "CLARK",
                text: "{>>>}SMITH! Are you there? {>}COME IN SMITH! {>>}AAHH!!",
                choices:
                    [
                        { text: "I'm here Clark - Had a smoke on deck before my watch. What is it?! What do you see?", next: null }
                    ]
            },
            // Direction: pause here for 3 seconds before starting "intro2"
            {
                id: "intro2",
                text: "...",
                choices:
                    [
                        { text: "Clark! Come in! Ashton, are you in touch? I read you, but I don't hear any of you!", next: "intro3" }
                    ]
            },
            {
                id: "intro3",
                speaker: "ASHTON",
                text: "...{p: 2.0} Haha. I told you he would fall for it! ",
                next: "intro4"
            },
            {
                id: "intro4",
                speaker: "CLARK",
                text: "Never get jumpy in the face of the peril, sailor. Keep your cool.",
                choices:
                    [
                        { text: "Fuck off you guys!", next: "intro5" },
                        { text: "That's misuse of government hardware boys. Code 2 dash 8", next: "intro5" }
                    ]
            },
            {
                id: "intro5",
                speaker: "CLARK",
                text: "{>>>}Right, right. Sorry. {p: 0.25}{>>}Just passing the time. Well, let’s get on with it shall we?",
                next: "tutorial1",
            }
        ]);
    }

    CreateTutorialDialogue() {
        this.dialogueManager.registerNodes([

            // ---------------- //
            //  ACT 1: TUTORIAL
            // ---------------- //
            {
                id: "tutorial1",
                speaker: "CLARK",
                text: "We heard whales earlier, before you rotated in. {p: 0.7}Can you locate them on your end?",
                next: null
            },

            // BREAK FOR GAMEPLAY
            // Player searches for humpback whales.
            // After finding the target...
            {
                id: "tutorial_foundFirstTarget",
                text: "",
                choices:
                    [
                        { text: "Yeah I hear 'em.", next: "tutorial2" },
                        { text: "Humpbacks, by the sound of it.", next: "tutorial2" }
                    ]
            },

            {
                id: "tutorial2",
                speaker: "CLARK",
                text: "And you see our ships? Sorry Smith, this is procedure today. 3-way sonar array means we do verbal confirmation.{p:0.5}{>>>} I don't think you're an idiot.",
                choices:
                    [
                        { text: "Copy that, will check back in shortly.", next: null },
                    ]
            },

            // BREAK FOR GAMEPLAY
            // Player searches for both ships.
            // Once player finds both targets...
            {
                id: "tutorial_foundSecondTarget",
                text: "",
                choices:
                    [
                        { text: "I see you both. The unmistakable sound of two Iowa class battleships. At 3,1 nauticals equidistant. Sounds like your hull is rusty", next: "tutorial3" },
                        { text: "I hear you and see you. On my screen and out of my porthole. Right where I left you 8 hours ago", next: "tutorial3" }
                    ]
            },
            {
                id: "tutorial3",
                speaker: "CLARK",
                text: "Good. We have our triangulation then. {p: 1.0}By the wonders of {p: 1.3}trigonometry.",
                next: "tutorial4"
            },
            {
                id: "tutorial4",
                speaker: "ASHTON",
                text: "...{p: 1.2}Bet ‘ya none of us had girlfriends in high school…",
                next: "tutorial5"
            },
            {
                id: "tutorial5",
                speaker: "CLARK",
                text: "{>>>}That's a harmful stereotype, Ashton. Maths can be an aphrodisiac! {p: 1.7}{>>}Anyway..",
                next: "tutorial6"
            },
            {
                id: "tutorial6",
                speaker: "CLARK",
                text: "We are coming up on the reefs.",
                next: "tutorial7"
            },
            {
                id: "tutorial7",
                speaker: "ASHTON",
                text: "I have them marked",
                next: "tutorial8"
            },
            {
                id: "tutorial8",
                speaker: "CLARK",
                text: "So do I. Geophony. You mark that Smith?",
                choices:
                    [
                        { text: "Confirming...", next: null },
                    ]
            },

            // BREAK FOR GAMEPLAY
            // Player searches for sounds of the reef, underwater vents.
            {
                id: "tutorial_foundThirdTarget",
                text: "Confirming geophony. Did you hear the hydrothermal vents?",
                next: "tutorial_complete",
            },

            {
                id: "tutorial_complete",
                speaker: "CLARK",
                text: "Yes indeed.",
                next: null
            },
        ]);
    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
