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
        // search for two ships (anthropogenic example)
        await this.gameEvents.ShipsSearch();
        await this.dialogueManager.start("tutorial_foundShips");

        // search for humpback whales (biophony example)
        await this.gameEvents.HumpbackSearch();
        await this.dialogueManager.start("tutorial_foundWhales");

        // Act 2
        // Spawn some targets, give player free reign to find them
        // after they find 4 targets...
        await this.gameEvents.SectorSweep();
        await this.dialogueManager.start("act2_morgan1");

        await this.#sleep(5);
        await this.dialogueManager.start("act2_ashton1");

        //ship begins turning? somehow
        // slowly spawn more animal life
        await this.#sleep(30);
        await this.dialogueManager.start("act2_ashton4");

        // Wait for player to mark whales on screen

        // -- player marks whales on screen --
        await this.dialogueManager.start("act2_clark5");

        await this.#sleep(30); // or wait till player interacts with the radio

        // ACT 3: THE CONTACT
        await this.dialogueManager.start("act3_morgan1");

        // Ashton sends off a ping here
        await this.dialogueManager.start("act3_clark1");

        // You have to ping
        await this.dialogueManager.start("act3_ashton2");

        // Ship starts moving
        // once you get in range, strange transmission begins
        await this.dialogueManager.start("act3_harper1");

        // Ashton sends another ping, then his boat suddenly disappears
        // act3_ashton_ping
        await this.dialogueManager.start("act3_ashton_ping");

        // check the window
        await this.dialogueManager.start("act3_player");

        // Chase scene beginss
        // The ship starts to move, then slowly comes to a halt
        await this.dialogueManager.start("act3_commander5");

        // Final scene, jumpscare ahead
    }


    CreateIntroDialogue() {
        this.dialogueManager.registerNodes([

            // ACT 0: INTRO
            {
                id: "intro1",
                speaker: "CLARK",
                text: "{>>>}SMITH!{p: 0.5} Are you there? {>}COME IN SMITH! {>>}AAHH!!",
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
                text: "{>}...{p: 0.8}{>>} Haha. I told you he would fall for it! ",
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
                text: "{>>>}Right, right. Sorry. {p: 0.25}{>>}Just passing the time. {p:0.6}Well,{p:0.2} let's get on with it shall we?",
                next: "tutorial_exposition1",
            }
        ]);
    }

    CreateTutorialDialogue() {
        this.dialogueManager.registerNodes([

            // ---------------- //
            //  ACT 1: TUTORIAL
            // ---------------- //
            {
                id: "tutorial_exposition1",
                speaker: "CLARK",
                text: "This is your first time in a 3-way sonar array, right?",
                choices:
                    [
                        { text: "I resent your line of questioning. But yes.", next: "tutorial_exposition2" },
                        { text: "Roger that.", next: "tutorial_exposition2" }
                    ]
            },
            {
                id: "tutorial_exposition2",
                speaker: "CLARK",
                text: "Well, we're already calibrated from the last shift here. But procedure says you locate us first, verbally confirm location, and then we hone on a third party source to get aligned.",
                next: "tutorial_exposition3"
            },
            {
                id: "tutorial_exposition3",
                speaker: "CLARK",
                text: "Sorry Smith, it's tedious, but we have to start here. {p:0.5}{>>>} I don't think you're an idiot.",
                choices:
                    [
                        { text: "Ready to proceed.", next: "tutorial_exposition4" },
                        { text: "I barely understood what you just said.", next: "tutorial_exposition4" },
                        { text: "What was that last part?", next: "tutorial_exposition4" }
                    ]
            },
            {
                id: "tutorial_exposition4",
                speaker: "CLARK",
                text: "{>>>}Just mark both our ships and we can get started. {p:0.35}{>>}We're loud as hell, but it can still be hard to get a bead with this old array.",
                next: null
            },

            // BREAK FOR GAMEPLAY
            // Player searches for both ships.
            // Once player finds both targets...
            {
                id: "tutorial_foundShips",
                text: "",
                choices:
                    [
                        { text: "I see you both. The unmistakable sound of two Iowa class battleships. At 3,1 nauticals equidistant. Sounds like your hull is rusty.", next: "tutorial_searchForWhale1" },
                        { text: "I hear you and see you. On my screen and out of my porthole. Right where I left you 8 hours ago.", next: "tutorial_searchForWhale1" }
                    ]
            },
            {
                id: "tutorial_searchForWhale1",
                speaker: "CLARK",
                text: "Great. Now for the third party.",
                next: "tutorial_searchForWhale2"
            },
            {
                id: "tutorial_searchForWhale2",
                speaker: "CLARK",
                text: "We heard a pod of whales earlier, before you rotated in. {p: 0.5}Can you locate them on your end?",
                next: null
            },

            // BREAK FOR GAMEPLAY
            // Player searches for humpback whales.
            // After finding the target...
            {
                id: "tutorial_foundWhales",
                text: "",
                choices:
                    [
                        { text: "Yeah I hear 'em. Can't say for sure what kind.", next: "tutorial_whaleChoice1" },
                        { text: "That almost sounded like an orca to me.", next: "tutorial_whaleChoice1" },
                        { text: "Humpbacks, by the sound of it.", next: "tutorial_whaleChoice1" }
                    ]
            },

            {
                id: "tutorial_whaleChoice1",
                speaker: "ASHTON",
                text: "We don't need that sort of detail today. Just mark it as biophony on the map. We're on the hunt for the sounds of machinery.",
                next: "tutorial_whaleChoice2"
            },
            {
                id: "tutorial_whaleChoice2",
                speaker: "ASHTON",
                text: "But it was, in fact, a {p:0.2}{>}humpback!",
                next: "tutorial_banter1"
            },
            {
                id: "tutorial_banter1",
                speaker: "CLARK",
                text: "Alright then. We have our triangulation. {p: 0.5}By the wonders of {p: 0.8}trigonometry!",
                next: "tutorial_banter2"
            },
            {
                id: "tutorial_banter2",
                speaker: "ASHTON",
                text: "...{p: 1}Bet ‘ya none of us had girlfriends in high school…",
                next: "tutorial_banter3"
            },
            {
                id: "tutorial_banter3",
                speaker: "CLARK",
                text: "{>>>}That's a harmful stereotype, Ashton. Maths can be an aphrodisiac! {p: 0.8}{>>}Anyway..",
                next: "tutorial_complete"
            },
            {
                id: "tutorial_complete",
                speaker: "CLARK",
                text: "Let's get this sector mapped fast, we'll be moving again soon.",
                choices:
                    [
                        { text: "Copy. Smith out.", next: null},
                    ]
            },
            // BREAK FOR GAMEPLAY
            // On to act two, "sector sweep"
        ]);
    }

    CreateActTwoDialogue() {
        this.dialogueManager.registerNodes([

            // Spawn several targets, player marks them at their own pace
            // Once they have 4+ targets found, commander interrupts

            // ACT 2: SECTOR SWEEP
            {
                id: "act2_morgan1",
                speaker: "COMMANDER MORGAN",
                text: "{>>>}Come in sonar.",
                choices: [
                    { text: "This is Sonar, sir.", next: "act2_morgan2" }
                ]
            },
            {
                id: "act2_morgan2",
                speaker: "COMMANDER MORGAN",
                text: "Anything to report?",
                choices: [
                    { text: "Nothing to report.", next: "act2_morgan3" }
                    // maybe the change to report something like a mine here if you've found it
                ]
            },
            {
                id: "act2_morgan3",
                speaker: "COMMANDER MORGAN",
                text: "Carry on.",
                choices: [
                    { text: "Yes sir.", next: null }
                ]
            },

            // -- a few seconds later --
            {
                id: "act2_ashton1",
                speaker: "ASHTON",
                text: "What a chatterbox, your commander. {>}Real verbose.",
                choices: [
                    { text: "You were listening to that?", next: "act2_ashton2" }
                ]
            },
            {
                id: "act2_ashton2",
                speaker: "ASHTON",
                text: "Your radio is live, dumbass.",
                next: "act2_clark1"
            },
            {
                id: "act2_clark1",
                speaker: "CLARK",
                text: "He's right to check in. {p: 0.8}We should have found them by now.",
                next: "act2_ashton3"
            },
            {
                id: "act2_ashton3",
                speaker: "ASHTON",
                text: "A sunken sub, lost to contact somewhere in the infinite pacific... {p: 1.0}Now their only hope of rescue is… {p: 0.6}The wonders of {>}trigonometry!",
                choices: [
                    { text: "Don't mock the dead, Ashton.", next: "act2_clark2" }
                ]
            },
            {
                id: "act2_clark2",
                speaker: "CLARK",
                text: "They might not be dead. {p: 0.8}They might just be lame ducks, busted electricals or something. {p: 1.0}Just sitting down there in that tin can.",
                next: "act2_clark3"
            },
            {
                id: "act2_clark3",
                speaker: "CLARK",
                text: "{p: 0.8}…Right on top of that 12 tonnes warhead that our brass wants back.",
                next: "act2_commander1"
            },
            {
                id: "act2_commander1",
                speaker: "COMMANDER MORGAN",
                text: "Mark end of 4th sector. We are engaging the starboard sweep.",
                next: null
            },

            // -- the ships begin turning --
            {
                id: "act2_ashton4",
                speaker: "ASHTON",
                text: "So are we going to talk about those whales?",
                choices: [
                    { text: "What about them?", next: "act2_ashton5" }
                ]
            },
            {
                id: "act2_ashton5",
                speaker: "ASHTON",
                text: "Between the three of us, we must have listened to hundreds of hours of whalesong. {p: 1.0}And this is different. They're louder than they're supposed to be.",
                next: "act2_clark4"
            },
            {
                id: "act2_clark4",
                speaker: "CLARK",
                text: "You're right. {>>}All the animal signals have been coming in {p: 0.5}{>}different{>>} for a while. {p: 0.9}Increasing their DB's...",
                next: null
            },

            // Wait for player to mark whales on screen
            // -- player marks whales on screen --
            {
                id: "act2_clark5",
                speaker: "CLARK",
                text: "Smith.{p: 1.0} That pod of whales to your nor'east. They're…",
                next: "act2_ashton6"
            },
            {
                id: "act2_ashton6",
                speaker: "ASHTON",
                text: "Gone. Yeah we're looking at the same thing over here.",
                choices: [
                    { text: "Just blipped off the map!", next: "act2_clark6" }
                ]
            },
            {
                id: "act2_clark6",
                speaker: "CLARK",
                text: "Not a malfunction. {p: 0.9}Three vessels seeing the same event. {p: 0.7}All right. Smith. Ashton. Notify your commanders.",
                next: "act2_clark7"
            },
            {
                id: "act2_clark7",
                speaker: "CLARK",
                text: "Let's request {>}active sonar.",
                next: null
            }
        ]);
    }

    CreateActThreeDialogue() {
        this.dialogueManager.registerNodes([

            // Player has to interact with a radio to progress the story
            // ACT 3: THE CONTACT
            {
                id: "act3_morgan1",
                speaker: "COMMANDER MORGAN",
                text: "{>>>}Commander Morgan here. {>>}Report.",
                choices: [
                    { text: "Requesting permission to deploy active sonar, sir.", next: "act3_morgan2" }
                ]
            },
            {
                id: "act3_morgan2",
                speaker: "COMMANDER MORGAN",
                text: "Reason given?",
                choices: [
                    { text: "We have... a hunch, sir.", next: "act3_morgan3" }
                ]
            },
            {
                id: "act3_morgan3",
                speaker: "COMMANDER MORGAN",
                text: "Good enough for me. {>}Permission granted. {p: 0.7}{>>}Let's hope the Russians aren't listening in.",
                next: "act3_ashton1"
            },
            {
                id: "act3_ashton1",
                speaker: "ASHTON",
                text: "{p: 1.0}So do I. {>}Allow me, ladies.",
                next: null
            },

            // Ashton sends off a ping here
            {
                id: "act3_clark1",
                speaker: "CLARK",
                text: "Something there! {>}Smith, fire off.",
                choices: [
                    { text: "Pinging.", next: null }
                ]
            },

            // You fire off an active sonar
            {
                id: "act3_ashton2",
                speaker: "ASHTON",
                text: "Hot damn, there's our prize!",
                next: "act3_clark2"
            },
            {
                id: "act3_clark2",
                speaker: "CLARK",
                text: "Call it in, Smith!",
                choices: [
                    { text: "Sir! Objective spotted. Bearing 108 range 3 clicks.", next: "act3_morgan4" }
                ]
            },
            {
                id: "act3_morgan4",
                speaker: "COMMANDER MORGAN",
                text: "Miracle worker! {>}Let's get our boys!",
                next: null
            },

            // Ship starts moving
            // -- strange transmission begins --
            {
                id: "act3_harper1",
                speaker: "HARPER",
                text: "{>}Come. Make yourself known to him. {p: 1.3}Come. Zoth-Ommog compels you.",
                choices: [
                    { text: "Hello? Is this Commander Harper?", next: "act3_harper2" }
                ]
            },
            {
                id: "act3_harper2",
                speaker: "HARPER",
                text: "This is he.",
                next: "act3_clark3"
            },
            {
                id: "act3_clark3",
                speaker: "CLARK",
                text: "Commander Harper. {p: 0.9}What is your situation?! {>>>}Depth? Are you intact? {p: 0.8}{>>}We are a three vessel salvage mission. We'll get you home.",
                next: "act3_harper3"
            },
            {
                id: "act3_harper3",
                speaker: "HARPER",
                text: "Oh but I am home.",
                next: "act3_ashton3"
            },
            {
                id: "act3_ashton3",
                speaker: "ASHTON",
                text: "{>>}This guy has the bends.",
                next: "act3_clark4"
            },
            {
                id: "act3_morgan5",
                speaker: "COMMANDER MORGAN",
                text: "Commander Harper. This is Commander Morgan. You appear to be dead in the water there.",
                next: "act3_harper4"
            },
            {
                id: "act3_morgan6",
                speaker: "COMMANDER MORGAN",
                text: "We need help locating you to send down a diver. {p: 0.9} Give a ping, or bang on your hull.",
                next: "act3_harper4"
            },
            {
                id: "act3_harper4",
                speaker: "HARPER",
                text: "I must respect my vow of silence.",
                next: "act3_ashton4"
            },
            {
                id: "act3_ashton4",
                speaker: "ASHTON",
                text: "All right then. I'll ping this weirdo.",
                next: null
            },

            // Ashton pings. Suddenly the entire Endeavour disappears from the radar.
            {
                id: "act3_ashton_ping",
                speaker: "CLARK",
                text: "{p: 2.0}Something there... {p: 0.8}Wait—{>}Ashton's gone.",
                choices: [
                    { text: "Clark?! Do you see the Endeavor on sonar?", next: "act3_clark5" }
                ]
            },
            {
                id: "act3_clark5",
                speaker: "CLARK",
                text: "No. It was just there. Do you have a visual, Smith?",
                choices: [
                    { text: "Surely a malfunction. Let me check.", next: null }
                ]
            },
            // when the player goes to the window
            {
                id: "act3_player",
                text: "Nothing but ocean. It's... {p: 1.0} like it was never there.", next: "act3_harper5"
            },
            {
                id: "act3_harper5",
                speaker: "HARPER",
                text: "Zoth-Ommog. {p: 1.0}Spawn of Ythoghta. {>}He of which it is written... {p: 1.0}For aeons he slumbered. {>}I found him. Now he is awake.",
                next: "act3_harper6"
            },
            {
                id: "act3_harper6",
                speaker: "HARPER",
                text: "{>>}Now he takes what is offered up to him. {p: 0.9}He takes those calves that bare their necks to the master's blade. {>}He takes what is owed him!",
                next: "act3_clark6"
            },
            {
                id: "act3_clark6",
                speaker: "CLARK",
                text: "Multiple contacts, Smith. {p: 1.0}Time to leave, I think.",
                choices: [
                    { text: "We split up. Hope it only takes one of us.", next: "act3_clark7" }
                ]
            },
            {
                id: "act3_clark7",
                speaker: "CLARK",
                text: "Sensible. {p: 0.8}I've already suggested we veer North. {>}Good luck, Smith.",
                choices: [
                    { text: "Good luck.", next: null }
                ]
            },

            // The ship starts to move, then slowly comes to a halt
            {
                id: "act3_commander5",
                speaker: "COMMANDER MORGAN",
                text: "I see him. {>}The great spawn! {p: 0.7}He takes what is owed him!",
                next: "act3_clark8"
            },
            {
                id: "act3_clark8",
                speaker: "CLARK",
                text: "I don't see your movement!",
                choices: [
                    { text: "The commander appears to want to stay.", next: "act3_clark9" }
                ]
            },
            {
                id: "act3_clark9",
                speaker: "CLARK",
                text: "... what now?",
                choices: [
                    { text: "I'll use my active sonar. Try to invite him in my direction.", next: "act3_clark9" }
                ]
            },
            {
                id: "act3_clark9",
                speaker: "CLARK",
                text: "Good god... {p: 0.8}Best of luck.",
                next: null
            },

            // Final act, the god approaches. You can use the active sonar to draw him towards you.
            // Then the screen jumpscare.
        ]);
    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
