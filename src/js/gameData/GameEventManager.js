import * as THREE from "three";
import { DialogueManager } from "../managers/DialogueManager";
import { SonarTargetConfig } from "../gameObjects/SonarTargets/SonarTargetConfig";
import { PortalsController } from "../managers/PortalsController";
import { SceneManager } from "../managers/SceneManager";

export class GameEventManager {
    constructor() {
        // Singleton pattern
        if (!GameEventManager.instance) {
            GameEventManager.instance = this;
        }

        return GameEventManager.instance;
    }

    Setup(gameManager, audioManager, dialogueManager, world) {
        this.gameManager = gameManager;
        this.audioManager = audioManager;
        this.dialogueManager = dialogueManager;
        this.world = world;

        this._dlgGate ??= Promise.resolve();
        this.portalsController = this.gameManager.portalsController;
    }

    // Act 1: Tutorial events
    async HumpbackSearch() {
        const humpbacksConfig = new SonarTargetConfig(
            "Humpbacks",
            "humpbacks",
            {
                randomizeRadius: true,
                minRadius: 0.05,
                maxRadius: 0.1,
                spawnAtRandomPosition: true
            }
        );


        const humpbacks = this.world.SpawnSonarTarget(humpbacksConfig);

        const e = await this.WaitForEvent(humpbacks, "discoveredTarget");

        return e.detail?.target ?? null;
    }

    async ShipsSearch() {

        const melbourneConfig = new SonarTargetConfig(
            "Melbourne",
            "ship_melbourne",
            {
                randomizeRadius: false,
                radius: 0.05,
                spawnAtRandomPosition: false,
                spawnPosition: new THREE.Vector3(0.6, 0.2, 0)
            }
        );

        const endeavourConfig = new SonarTargetConfig(
            "Endeavor",
            "ship_endeavour",
            {
                randomizeRadius: false,
                radius: 0.05,
                spawnAtRandomPosition: false,
                spawnPosition: new THREE.Vector3(0.25, -0.2, 0)
            }
        );

        this.melbourne = this.world.SpawnSonarTarget(melbourneConfig);
        this.endeavour = this.world.SpawnSonarTarget(endeavourConfig);

        const ships = [this.melbourne, this.endeavour];

        let melbourneDone, endeavourDone;

        this.melbourne.addEventListener("discoveredTarget", (e) => {
            // build a serialized sequence with say()
            melbourneDone = (async () => {
                await this.ThinkToSelf("The USS Melbourne, Clark is aboard.");
                await this.ThinkToSelf("I once watched him boil kranskies without removing them from the plastic packaging...");
            })();
        }, { once: true });

        this.endeavour.addEventListener("discoveredTarget", (e) => {
            endeavourDone = (async () => {
                await this.ThinkToSelf("The USS Endeavour, Ashton is aboard.");
                await this.ThinkToSelf("He's a smart cookie, and he does make me laugh.");
            })();
        }, { once: true });


        // Resolve when both are discovered...
        await Promise.all(ships.map(s => this.WaitForEvent(s, "discoveredTarget")));

        // ...then wait for their queued dialogue sequences to finish before continuing story
        await Promise.all([melbourneDone, endeavourDone].filter(Boolean));
    }

    // Act 2: Sector Sweep events
    async SectorSweep() {

        const configs =
            [
                new SonarTargetConfig("KillerWhales1", "killerWhales",
                    {
                        randomizeRadius: true, minRadius: 0.09, maxRadius: 0.12,
                        spawnAtRandomPosition: true
                    }),
                new SonarTargetConfig("Humpbacks2", "humpbacks2",
                    {
                        randomizeRadius: true, minRadius: 0.05, maxRadius: 0.1,
                        spawnAtRandomPosition: true
                    }),
                new SonarTargetConfig("FishChorus", "fishChorus",
                    {
                        randomizeRadius: true, minRadius: 0.05, maxRadius: 0.06,
                        spawnAtRandomPosition: true
                    }),
                new SonarTargetConfig("Damselfish", "damselfish",
                    {
                        randomizeRadius: true, minRadius: 0.05, maxRadius: 0.06,
                        spawnAtRandomPosition: true
                    }),
                new SonarTargetConfig("RedGrouper", "redGrouper",
                    {
                        randomizeRadius: true, minRadius: 0.05, maxRadius: 0.06,
                        spawnAtRandomPosition: true
                    }),
            ]

        const targets = [];
        configs.forEach(config => {
            targets.push(this.world.SpawnSonarTarget(config));
        });



        await this.WaitForFirstNEvents(targets, "discoveredTarget", 3);
    }

    async MoveToNextSector() {

        // play moving sound
        this.audioManager.PlayFadeIn("underground", { seconds: 3 });
        this.audioManager.PlayFadeIn("windMedium", { seconds: 5 });

        this.portalsController.SendMessage("ShipState_Idle", this.portalsController.TaskStates.AnyToNotActive);
        this.portalsController.SendMessage("ShipState_Moving", this.portalsController.TaskStates.AnyToActive);
        this.portalsController.SendMessage("Vessel1_Idle", this.portalsController.TaskStates.AnyToNotActive);
        this.portalsController.SendMessage("Vessel1_Moving", this.portalsController.TaskStates.AnyToActive);
        this.portalsController.SendMessage("Vessel2_Idle", this.portalsController.TaskStates.AnyToNotActive);
        this.portalsController.SendMessage("Vessel2_Moving", this.portalsController.TaskStates.AnyToActive);
        this.portalsController.SendMessage("Sea_Choppy", this.portalsController.TaskStates.AnyToActive);
        this.world.SetVelocity(0, 0.1, 10);

        this.melbourne.SetVelocity(-0.005, 0.09, 9);
        this.endeavour.SetVelocity(0.01, 0.14, 11);
        await this.#sleep(10);
        this.melbourne.SetVelocity(0.003, 0.11, 11);
        this.endeavour.SetVelocity(-0.01, 0.09, 9);
        await this.#sleep(10);
        this.melbourne.SetVelocity(0, 0.1, 5);
        this.endeavour.SetVelocity(0, 0.1, 5);


        this.audioManager.PlayFadeIn("generalAmbience", { seconds: 10 });
    }

    async ArrivedAtNextSector() {
        this.world.SetVelocity(0, 0, 7.5);
        this.melbourne.SetVelocity(0, 0, 8);
        this.endeavour.SetVelocity(0, 0, 7);

        this.portalsController.SendMessage("Sea_Calm", this.portalsController.TaskStates.AnyToActive);
        this.portalsController.SendMessage("ShipState_Moving", this.portalsController.TaskStates.AnyToNotActive);
        this.portalsController.SendMessage("ShipState_Idle", this.portalsController.TaskStates.AnyToActive);

        // play moving sound
        this.audioManager.StopFadeOut("underground", 5);
        this.audioManager.StopFadeOut("windMedium", 3);

        await this.#sleep(4);

    }

    async WhaleDisappearance() {
        const blueWhaleConfig = new SonarTargetConfig("BlueWhale", "blueWhale",
            {
                randomizeRadius: true, minRadius: 0.1, maxRadius: 0.15,
                spawnAtRandomPosition: true
            });


        const blueWhale = this.world.SpawnSonarTarget(blueWhaleConfig);

        const e = await this.WaitForEvent(blueWhale, "discoveredTarget");

        await this.#sleep(0.5);
        // play a creepy sound and remove the whale
        this.audioManager.playOneShot("staticGlitch", { bus: 'sfx', volume: 0.5, rate: 1 });
        blueWhale.Destroy();
        await this.#sleep(0.2);
        this.audioManager.playOneShot("analogBeep", { bus: 'sfx' });
        await this.#sleep(1);
    }

    // ACT 3: THE CONTACT
    async RequestActiveSonar() {
        await this.#sleep(5);
        // OR wait for player to look to the radio with
        //

    }

    async AshtonPing() {

    }

    async PlayerPing() {
        const sonarMachine = SceneManager.instance.sonarMachine;
        sonarMachine.SetActiveSonarAuthorised(true);
        const e = await this.WaitForEvent(sonarMachine, "onPing");


        const worldPos = this.world.shipRoot.position.clone();
        worldPos.x -= 0.2;
        worldPos.y -= 0.35;

        // Create the as soon as the ping fires submarine!
        const submarineContext = new SonarTargetConfig(
            "Submarine",
            "submarine",
            {
                randomizeRadius: false,
                radius: 0.04,
                spawnAtRandomPosition: false,
                spawnPosition: worldPos
            }
        );

        this.submarine = this.world.SpawnSonarTarget(submarineContext);

        await this.#sleep(0.25);
        this.audioManager.playOneShot("targetAppear", { bus: 'sfx', volume: 0.5, rate: 1 });
        await this.#sleep(1);
    }

    async MarkTheSub() {
        await this.WaitForEvent(this.submarine, "discoveredTarget");
        await this.#sleep(1);
    }

    async TransmissionBegins() {
        this.audioManager.PlayFadeIn("interference3", { seconds: 3 });
        await this.#sleep(2);
        this.audioManager.PlayFadeIn("subInterior", { seconds: 2 });
        await this.#sleep(2);
        this.audioManager.StopFadeOut("interference3", 3);
        this.audioManager.PlayFadeIn("glitchyNoise", { to: 0.6, seconds: 8 });
    }

    async IncreaseFear() {
        this.audioManager.PlayFadeIn("underworldVoices", { to: 0.6, seconds: 15 });
        await this.#sleep(1);
    }

    async IncreaseFearAgain() {
        this.audioManager.StopFadeOut("generalAmbience", 5);
        await this.#sleep(3);
    }

    async TheEndeavourDisappears() {

        this.audioManager.playOneShot("sonarBlip", { bus: 'sfx', volume: 0.9, rate: 1 });
        //this.audioManager.StopFadeOut("underworldVoices", 0.05);
        this.audioManager.StopFadeOut("glitchyNoise", 10);
        this.audioManager.StopFadeOut("subInterior", 5);
        this.portalsController.SendMessage("Vessel1_Disappear", this.portalsController.TaskStates.AnyToComplete);

        await this.#sleep(1);
        this.endeavour.Destroy();

        await this.#sleep(3);
    }

    async WaitForPlayerToLookOutWindow() {
        const movementController = this.gameManager.playerMovementController;

        // Wait until the player enters the Porthole state
        await new Promise((resolve) => {
            const handler = (e) => {
                if (e.detail.newState === movementController.states.Porthole) {
                    movementController.removeEventListener("onEnterState", handler);
                    resolve(); // continue execution
                }
            };

            movementController.addEventListener("onEnterState", handler);
        });

        this.audioManager.StopFadeOut("underworldVoices", 1);

        this.portalsController.SendMessage("FadeToBlack", this.portalsController.TaskStates.AnyToComplete);
    }


    async CreateMultipleContacts() {
        this.audioManager.playOneShot("monster1", { bus: 'sfx', volume: 0.9, rate: 1 });

    }


    async TheMelbourneFlees() {

        this.melbourne.SetVelocity(0.04, 0.08, 10);
        this.portalsController.SendMessage("Vessel2_Flee", this.portalsController.TaskStates.AnyToComplete);
    }

    // ACT 4: THE CHOICE
    async WaitForPlayerToGoToSonar() {
        const movementController = this.gameManager.playerMovementController;

        // Wait until the player enters the Porthole state
        await new Promise((resolve) => {
            const handler = (e) => {
                if (e.detail.newState === movementController.states.UsingSonar) {
                    movementController.removeEventListener("onEnterState", handler);
                    resolve(); // continue execution
                }
            };

            movementController.addEventListener("onEnterState", handler);
        });
    }

    async TheMelbournePings() {

    }

    async WaitForPlayerToPing() {
        const sonarMachine = SceneManager.instance.sonarMachine;
        sonarMachine.SetActiveSonarAuthorised(true);
        const e = await this.WaitForEvent(sonarMachine, "onPing");
    }

    async TheMelbourneDisappears() {

    }

    async FinalPing() {

    }



    // HELPERS

    // Works with EventTarget or THREE.EventDispatcher
    WaitForEvent(emitter, type, { signal, timeout } = {}) {
        return new Promise((resolve, reject) => {
            let timer;

            const cleanup = () => {
                emitter.removeEventListener(type, onHit);
                if (signal) signal.removeEventListener('abort', onAbort);
                if (timer) clearTimeout(timer);
            };

            const onHit = (e) => { cleanup(); resolve(e); };
            const onAbort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };

            emitter.addEventListener(type, onHit, { once: true });

            if (signal) {
                if (signal.aborted) return onAbort();
                signal.addEventListener('abort', onAbort);
            }

            if (timeout != null) {
                timer = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timed out waiting for "${type}"`));
                }, timeout);
            }
        });
    }

    async WaitForFirstNEvents(emitterList, type, n) {
        return new Promise((resolve) => {
            const hits = [];
            const onHit = (e) => {
                hits.push(e);
                if (hits.length >= n) {
                    // cleanup all listeners
                    emitterList.forEach(em => em.removeEventListener(type, onHit));
                    resolve(hits);
                }
            };
            emitterList.forEach(em => em.addEventListener(type, onHit, { once: true }));
        });
    }

    // queue a single prompt so it runs after previous ones, returns a Promise that
    // resolves when that prompt completes
    QueuePrompt = (opts) => {
        const run = () => new Promise((resolve) => {
            this.dialogueManager.prompt({
                ...opts,
                onDone: (...args) => resolve(args[0])
            });
        });

        const p = this._dlgGate.then(run);
        // keep the chain alive even if a prompt throws
        this._dlgGate = p.catch(() => { });
        return p;
    };

    // optional sugar for multi-line sequences
    ThinkToSelf = (text, speaker = "") => this.QueuePrompt({ speaker, text });

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}