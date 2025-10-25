import * as THREE from "three";

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
        this.CreateActTwoDialogue();
        this.CreateActThreeDialogue();

        this.clock = new THREE.Clock();
        this.clock.getElapsedTime();
    }

    SetWorld(world) {
        this.world = world;
    }

    SetGameEventManager(gameEvents) {
        this.gameEvents = gameEvents;
    }

    async Start() {
        await this.Intro();
        await this.Act1();
        await this.Act2();
        //sonar, ships, sub, move
        //this.gameEvents.DebugSetupPrerequisites(true, true, false, true);
        await this.Act3();
        await this.Act4();
    }

    async Intro() {
        // Intro
        await this.#sleep(10);
        await this.dialogueManager.start("intro1");
        await this.#sleep(4);
        await this.dialogueManager.start("intro2");

    }

    async Act1() {
        // Act 1: Tutorial
        // search for two ships (anthropogenic example)
        await this.waitForWithHint(
            this.gameEvents.ShipsSearch(),     // resolves ONLY when ships are actually found
            60000,                            // 2 minutes
            async () => {
                await this.dialogueManager.start("stuck_player_hint");
            }
        );

        await this.dialogueManager.start("tutorial_foundShips");

        // search for humpback whales (biophony example)
        await this.gameEvents.HumpbackSearch();
        await this.dialogueManager.start("tutorial_foundWhales");

    }

    async Act2() {
        // ACT 2: SECTOR SWEEP
        // Spawn some targets, give player free reign to find them
        // after they find 4 targets...

        // UNCOMMENT

        await this.gameEvents.SectorSweep();
        await this.dialogueManager.start("act2_morgan1");

        await this.#sleep(5);
        await this.dialogueManager.start("act2_ashton1");

        await this.#sleep(5);
        await this.dialogueManager.start("act2_commander1");

        await this.gameEvents.MoveToNextSector();

        //ship begins moving
        // player gets some time to look around
        await this.dialogueManager.start("act2_ashton4");

        await this.gameEvents.ArrivedAtNextSector();
        await this.dialogueManager.start("act2_resumeSearch");

        // Spawn more whales
        // Wait for player to mark whales on screen
        await this.gameEvents.WhaleDisappearance();

        // -- player marks whales on screen --
        await this.dialogueManager.start("act2_whalesGone1");
    }

    async Act3() {
        // ACT 3: THE CONTACT
        await this.gameEvents.RequestActiveSonar();// wait till player interacts with the radio

        await this.dialogueManager.start("act3_morgan1");

        // Ashton sends off a ping here
        //await this.gameEvents.AshtonPing();
        //await this.dialogueManager.start("act3_clark1");

        // You have to ping
        await this.gameEvents.PlayerPing();
        await this.dialogueManager.start("act3_ashton2");

        // Mark it on the map
        await this.gameEvents.MarkTheSub();
        await this.dialogueManager.start("act3_clark2");

        // Ship starts moving
        await this.gameEvents.TransmissionBegins();

        // once you get in range, strange transmission begins
        await this.dialogueManager.start("act3_harper1");

        await this.gameEvents.IncreaseFear();
        // this guy has the bends
        await this.dialogueManager.start("act3_ashton3");


        await this.gameEvents.IncreaseFearAgain();
        await this.dialogueManager.start("act3_ashton4");

        // Ashton sends another ping, then his boat suddenly disappears
        await this.gameEvents.WaitForPlayerToGoToSonar();
        await this.gameEvents.TheEndeavourDisappears();
        await this.dialogueManager.start("act3_ashton_ping");

        // check the window
        await this.gameEvents.WaitForPlayerToLookOutWindow();
        await this.dialogueManager.start("act3_player");

        // Multiple contacts appear all of a sudden, then they change
        await this.gameEvents.CreateMultipleContacts();
        await this.dialogueManager.start("act3_clark6");

        // The melbourne attempts to flee
        await this.gameEvents.TheMelbourneFlees();
        // The ship starts to move, then slowly comes to a halt
        await this.dialogueManager.start("act3_commander5");


        // Final scene, jumpscare ahead

    }

    async Act4() {
        // ACT 4: OFFERING
        // Wait till player gets to console
        // Either they ping, or the melbourne pings

        if (this.dialogueManager.getVar("escapeChoice") === "noble") {
            // wait for player to get back to console, then the melbourne pings
            await this.gameEvents.WaitForPlayerToPing();
        } else {
            await this.gameEvents.WaitForPlayerToGoToSonar();
            await this.dialogueManager.start("act4_hereGoesNothing");
            await this.gameEvents.TheMelbournePings();
        }

        await this.dialogueManager.start("act4_theBeastIsPinged");
        // The melbourne disappears
        await this.gameEvents.TheMelbourneDisappears();

        //await this.dialogueManager.start("act4_doorInteract1");

        await this.gameEvents.FinalPing();
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
                        { text: "I'm here Clark - Had a smoke on deck before my watch. What is it?! What do you see?", next: null } // exit
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
                next: "tutorial_bonusTip1"
            },

            {
                id: "tutorial_bonusTip1",
                speaker: "ASHTON",
                text: "Oh, and in case you're new to the Nimrod SQS-23, you should know that it automatically marks targets on your behalf, as long as the confidence is high.",
                next: "tutorial_bonusTip2"
            },
            {
                id: "tutorial_bonusTip2",
                speaker: "ASHTON",
                text: "Just try to fit the listening zone as tightly and snuggly around the target as possible. If it's too small, too big, or not overlapping enough, it won't go through.",
                next: "tutorial_bonusTip3"  // exit
            },
            {
                id: "tutorial_bonusTip3",
                speaker: "ASHTON",
                text: "No need to press any buttons to submit your guess. If the target isn't marked, you're just not accurate enough yet.",
                next: null  // exit
            },


            // BREAK FOR GAMEPLAY
            // Player searches for both ships.

            // If they make no progress for 2 mins
            {
                id: "stuck_player_hint",
                speaker: "CLARK",
                text: "You struggling over there? {p:0.2}Wouldn't blame you with that old console.",
                choices:
                    [
                        { text: "I could use a hand. Is this machine broken?", next: "tutorial_hint1" },
                        { text: "This is all going exactly intended, Clark. Back off.", next: "tutorial_hint_exit" },
                    ]
            },
            {
                id: "tutorial_hint_exit",
                speaker: "CLARK",
                text: "Hm, if you say so. ",
                next: null  // exit
            },
            {
                id: "tutorial_hint1",
                speaker: "CLARK",
                text: "It's you that is broken. The Nimrod SQS-23 is a modern marvel.",
                next: "tutorial_hint2"
            },
            {
                id: "tutorial_hint2",
                speaker: "CLARK",
                text: "{p:0.2}Well, {p:0.2}not that modern{>}...{>>} but in skilled hands and ears it never fails. It might be my favourite Sonar array.",
                next: "tutorial_hint3"
            },
            {
                id: "tutorial_hint3",
                speaker: "CLARK",
                text: "Just takes some finess. You must manually tune the listening area as snugly around the target as possible.",
                next: "tutorial_hint4"
            },
            {
                id: "tutorial_hint4",
                speaker: "CLARK",
                text: "Questions?",
                choices:
                    [
                        { text: "Where do I even start looking?", next: "tutorial_hint_findingTargets" },
                        { text: "I think I have this ship framed, how do I submit it?", next: "tutorial_hint_framing" },
                        { text: "Why can I not use the active ping?", next: "tutorial_hint_activePing" },
                        { text: "Nope. I will try to play with it again.", next: null },
                    ]
            },

            // opt1 responses
            {
                id: "tutorial_hint_findingTargets",
                speaker: "CLARK",
                text: "Start big, and slowly narrow it down. I sometimes make a half circle and sweep it around, just to see where it's busiest.",
                next: "tutorial_hint_findingTargets2"
            },
            {
                id: "tutorial_hint_findingTargets2",
                speaker: "CLARK",
                text: "And of course, most of the info is using your ears. You can hear where the edges of the shape start and end by carefully crossing over it.",
                next: "tutorial_hint4"
            },

            // opt 2 responses
            {
                id: "tutorial_hint_framing",
                speaker: "CLARK",
                text: "You can't. {p:0.25}The Nimrod will automatically submit targets which meet the minimum certainty threshold. You are not as close to the exact target shape as you think.",
                next: "tutorial_hint_framing2"
            },
            {
                id: "tutorial_hint_framing2",
                speaker: "CLARK",
                text: "Try making the framing area smaller than you think the target is, and moving through the area a few times. Failing that, try the opposite, go larger than you expect.",
                next: "tutorial_hint4"
            },

            // opt 3 responses
            {
                id: "tutorial_hint_activePing",
                speaker: "CLARK",
                text: "OK now you're just being infantile. You well know the dangers of active sonar. Just wait for the captain's authorisation.",
                next: "tutorial_hint4"
            },


            // Player has found both ships, end of tutorial
            {
                id: "tutorial_foundShips",
                text: "",
                choices:
                    [
                        { text: "I hear you both, right where I left you 8 hours ago. The unmistakable sound of two Iowa class battleships. Sounds like your hull is rusty.", next: "tutorial_searchForWhale1" },
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
                next: null  // exit
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
                text: "But it is, in fact, a {p:0.2}{>}humpback.",
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
                        { text: "Copy. Smith out.", next: null },   // exit
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
                    { text: "Nothing of note, sir.", next: "act2_morgan3" }
                ]
            },
            {
                id: "act2_morgan3",
                speaker: "COMMANDER MORGAN",
                text: "Carry on.",
                choices: [
                    { text: "Yes sir.", next: null } // exit
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
                text: "{p: 0.8}…Right on top of that 12 tonne warhead that the brass wants back.",
                next: null  // exit
            },

            // Small beat before commander talks
            {
                id: "act2_commander1",
                speaker: "COMMANDER MORGAN",
                text: "All crew, mark end of 4th sector. We are engaging the starboard sweep.",
                next: "act2_commander2"
            },
            {
                id: "act2_commander2",
                speaker: "COMMANDER MORGAN",
                text: "Take a quick breather sonar. You won't find anything with all the engine noise.",
                next: null  // exit
            },

            // -- the ships begin moving --
            // Player maybe explores for a bit
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
                text: "You're right. {>>}All the animal signals have been coming in {p: 0.5}{>}different{>>} for a while. {p: 0.9}I've never heard them {p:0.3}scream{p:0.1} this much.",
                next: null  // exit
            },

            // Ship stops moving
            {
                id: "act2_resumeSearch",
                speaker: "COMMANDER MORGAN",
                text: "We've arrived. Resume your search.",
                next: null  //exit
            },

            // Wait for player to mark whales on screen
            // -- player marks whales on screen --
            {
                id: "act2_whalesGone1",
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
                text: "It's time we request {>}active sonar.",
                next: null  //exit
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
                text: "Perhaps the Russians aren't the worst thing that could hear us.",
                choices: [
                    { text: "Ready to ping.", next: null }  //exit
                ]
            },


            // You fire off an active sonar
            {
                id: "act3_ashton2",
                speaker: "ASHTON",
                text: "Hot damn, there's something there alright!",
                next: "act3_clark1"
            },
            {
                id: "act3_clark1",
                speaker: "CLARK",
                text: "It snuck right up on us. Even with full passive triangulation...",
                next: "act3_markTheSub"
            },
            {
                id: "act3_markTheSub",
                speaker: "COMMANDER MORGAN",
                text: "Mark it, sonarsman. Feel free to use active, it's already spotted us. Let's see if this is our quarry.",
                next: null  //exit
            },

            // You manage to mark the sub on the map
            {
                id: "act3_clark2",
                speaker: "COMMANDER MORGAN",
                text: "Report.",
                choices: [
                    { text: "Sir! That's our sub! Bearing 246 range 3 clicks.", next: "act3_morgan4" }
                ]
            },
            {
                id: "act3_morgan4",
                speaker: "COMMANDER MORGAN",
                text: "Miracle worker! {>}Let's get our boys!",
                next: null  //exit
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
                text: "{>}Oh {p:0.5}but I am home.",
                next: null
            },
            // A beat before ashton responds
            {
                id: "act3_ashton3",
                speaker: "ASHTON",
                text: "{>>}This guy has the bends.",
                next: "act3_morgan5"
            },
            {
                id: "act3_morgan5",
                speaker: "COMMANDER MORGAN",
                text: "Commander Harper. This is Commander Morgan. You appear to be dead in the water.",
                next: "act3_morgan6"
            },
            {
                id: "act3_morgan6",
                speaker: "COMMANDER MORGAN",
                text: "We need your precise location to send down a diver. {p: 0.5} Give a ping, or bang on your hull.",
                next: "act3_harper4"
            },
            {
                id: "act3_harper4",
                speaker: "HARPER",
                text: "I must respect my vow of silence.",
                next: null  //exit
            },
            // another beat
            {
                id: "act3_ashton4",
                speaker: "ASHTON",
                text: "This weirdo. All right then, I'll ping instead.",
                next: null  //exit
            },

            // Ashton pings. Suddenly the entire Endeavour disappears from the radar.
            {
                id: "act3_ashton_ping",
                speaker: "CLARK",
                text: "{>}...{p: 0.5}hmm, some interference from th... {p: 0.8}Wait- {>>}Ashton's gone!",
                choices: [
                    { text: "Clark?! Do you see the Endeavor on sonar?", next: "act3_clark5" }
                ]
            },
            {
                id: "act3_clark5",
                speaker: "CLARK",
                text: "No. It was just there. Do you have a visual, Smith? Look out your porthole.",
                choices: [
                    { text: "Must be a malfunction. I'll get eyes.", next: null } //exit
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
                next: null
            },
            // make multiple contacts appear here
            {
                id: "act3_clark6",
                speaker: "CLARK",
                text: "Multiple contacts, Smith. Or... one contact? {p: 1.0}What IS that?",
                choices: [
                    { text: "I have no idea, let me confirm.", next: "act3_clark7" },
                    { text: "I think it's time we leave.", next: "act3_clark7" },
                    { text: "Could this be deception?", next: "act3_clark7" }
                ]
            },
            {
                id: "act3_clark7",
                speaker: "CLARK",
                text: "We're getting out of here.{p: 0.8} I've already suggested we veer North. {>}Good luck, Smith.",
                choices: [
                    { text: "You're right. Good luck.", next: null }, //exit
                    { text: "Wait! I need to convince my commander!", next: null } //exit
                ]
            },

            // The ship starts to move, then slowly comes to a halt
            {
                id: "act3_commander5",
                speaker: "COMMANDER MORGAN",
                text: "I see him. {>}The great spawn!",
                next: "act3_clark8"
            },
            {
                id: "act3_commander5",
                speaker: "COMMANDER MORGAN",
                text: "{>}... he takes what is owed him!",
                next: "act3_clark8"
            },
            {
                id: "act3_clark8",
                speaker: "CLARK",
                text: "I don't see you moving!",
                choices: [
                    { text: "The commander appears to want to stay.", next: "act3_clark9" }
                ]
            },
            {
                id: "act3_clark9",
                speaker: "CLARK",
                text: "... what now?",
                choices: [
                    {
                        text: "I'll use my active sonar to draw it away. You have a chance of escaping.",
                        next: "act3_nobleSacrifice",
                        onSelect: vars => {
                            vars.escapeChoice = "noble";
                        }
                    },
                    {
                        text: "Use your active, it might delay it enough for me to knock some sense into the Captain.",
                        next: "act3_selfish",
                        onSelect: vars => {
                            vars.escapeChoice = "selfish";
                        }
                    }
                ]
            },

            // Branching decision
            // Branch A: noble
            {
                id: "act3_nobleSacrifice",
                speaker: "CLARK",
                text: "Good god{>}... {p: 0.4}Best of luck.",
                next: null  // exit
            },
            // Branch B: selfish
            {
                id: "act3_selfish",
                speaker: "CLARK",
                text: "You're right, I have a head start, I can probably still outrun it.",
                next: "act3_selfish2"
            },
            {
                id: "act3_selfish2",
                speaker: "CLARK",
                text: "You best get to your console before I ping. Maybe we can get a look at whatever this is.",
                choices: [
                    { text: "Copy that. Thank you, Clark.", next: null },
                ]
            },

            {
                id: "act4_hereGoesNothing",
                speaker: "CLARK",
                text: "Here goes nothing",
                next: null
            },
            

            // Wait till player gets to console
            {
                id: "act4_theBeastIsPinged",
                speaker: "CLARK",
                text: "Do you still read me Smith?",
                choices: [
                    { text: "Yes. You saw what I saw.", next: "act4_theBeastIsPinged2" },
                ]
            },
            {
                id: "act4_theBeastIsPinged2",
                speaker: "CLARK",
                text: "Indeed.",
                choices: [
                    {
                        text: "How long do I have? I'll need time to get to the Captain.",
                        next: "act4_clarksMadness1",
                        condition: vars => vars.escapeChoice == "selfish"
                    },
                    {
                        text: "How fast was it moving? Do you have time to escape?",
                        next: "act4_clarksMadness1",
                        condition: vars => vars.escapeChoice == "noble"
                    },
                ]
            },
            {
                id: "act4_clarksMadness1",
                speaker: "CLARK",
                text: "?",
                next: "act4_clarksMadness2"
            },
            {
                id: "act4_clarksMadness2",
                speaker: "CLARK",
                text: "Time?",
                next: "act4_clarksMadness3"
            },
            {
                id: "act4_clarksMadness3",
                speaker: "CLARK",
                text: "What has heard us lies beyond time.",
                next: "act4_clarksMadness4"
            },
            {
                id: "act4_clarksMadness4",
                speaker: "CLARK",
                text: "We are {>}KNOWN{>>} by him!",
                next: "act4_cultChant1"
            },
            {
                id: "act4_cultChant1",
                speaker: "CLARK",
                text: "{>}To be known is to be offered.",
                next: "act4_cultChant2"
            },
            {
                id: "act4_cultChant2",
                speaker: "COMMANDER MORGAN",
                text: "{>}To offer is to owe.",
                next: "act4_cultChant3"
            },
            {
                id: "act4_cultChant3",
                speaker: "HARPER",
                text: "{>}He takes what is owed him.",
                next: null
            },
            // The melbourne disappears

            // You hear a clang behind you. The door is bolted.
            {
                id: "act4_doorInteract1",
                speaker: "COMMANDER MORGAN",
                text: "Offer us. Press the button.",
                next: null
            },

            // Press the sonar button to cause the final jumpscare.
        ]);
    }

    /**
     * Runs an objective with a timed hint that is canceled the instant the objective completes.
     * - If the objective finishes before the timeout, the hint never runs.
     * - If the timeout fires first, the hint runs once, then we still await the objective.
     */
    async waitForWithHint(mainAction, timeoutMs, hintCallback) {
        // Always treat mainAction as a Promise.
        const actionPromise = Promise.resolve(mainAction);

        let actionDone = false;
        let hintStarted = null; // Promise for hint, if it starts
        const timerId = setTimeout(() => {
            // This callback may run even after we set actionDone=true if already queued.
            if (actionDone) return;               // hard guard: do nothing if the action already completed
            hintStarted = Promise.resolve().then(hintCallback);
        }, timeoutMs);

        try {
            await actionPromise;                   // wait for the REAL completion
        } finally {
            actionDone = true;                     // set before clearTimeout to guard queued callbacks
            clearTimeout(timerId);                 // cancel the timer if it hasn't fired
        }

        // If the hint started (timeout beat the action), finish it before proceeding.
        if (hintStarted) {
            await hintStarted;
        }
    }
    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
