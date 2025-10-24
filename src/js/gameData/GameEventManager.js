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

        const endeavourConfig = new SonarTargetConfig(
            "Endeavor",
            "ship_endeavour",
            {
                randomizeRadius: false,
                radius: 0.05,
                spawnAtRandomPosition: false,
                spawnPosition: new THREE.Vector3(0.6, 0.2, 0)
            }
        );

        const melbourneConfig = new SonarTargetConfig(
            "Melbourne",
            "ship_melbourne",
            {
                randomizeRadius: false,
                radius: 0.05,
                spawnAtRandomPosition: false,
                spawnPosition: new THREE.Vector3(0.25, -0.2, 0)
            }
        );

        this.endeavour = this.world.SpawnSonarTarget(endeavourConfig);
        this.melbourne = this.world.SpawnSonarTarget(melbourneConfig);

        const ships = [this.endeavour, this.melbourne];

        let endeavourDone, melbourneDone;

        this.endeavour.addEventListener("discoveredTarget", (e) => {
            // build a serialized sequence with say()
            endeavourDone = (async () => {
                await this.ThinkToSelf("The USS Endeavour, Ashton is aboard.");
                await this.ThinkToSelf("He's a smart cookie, and he does make me laugh.");
            })();
        }, { once: true });

        this.melbourne.addEventListener("discoveredTarget", (e) => {
            melbourneDone = (async () => {
                await this.ThinkToSelf("The USS Melbourne, Clark is aboard.");
                await this.ThinkToSelf("I once watched him boil kranskies without removing them from the plastic packaging...");
            })();
        }, { once: true });


        // Resolve when both are discovered...
        await Promise.all(ships.map(s => this.WaitForEvent(s, "discoveredTarget")));

        // ...then wait for their queued dialogue sequences to finish before continuing story
        await Promise.all([endeavourDone, melbourneDone].filter(Boolean));
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
        const portalsController = this.gameManager.portalsController;

        // play moving sound
        this.audioManager.PlayFadeIn("underground", { seconds: 3 });
        this.audioManager.PlayFadeIn("windMedium", { seconds: 5 });

        portalsController.SendMessage("ShipState_Idle", portalsController.TaskStates.AnyToNotActive);
        portalsController.SendMessage("ShipState_Moving", portalsController.TaskStates.AnyToActive);
        portalsController.SendMessage("Vessel1_Idle", portalsController.TaskStates.AnyToNotActive);
        portalsController.SendMessage("Vessel1_Moving", portalsController.TaskStates.AnyToActive);
        portalsController.SendMessage("Vessel2_Idle", portalsController.TaskStates.AnyToNotActive);
        portalsController.SendMessage("Vessel2_Moving", portalsController.TaskStates.AnyToActive);
        portalsController.SendMessage("Sea_Choppy", portalsController.TaskStates.AnyToActive);
        this.world.SetVelocity(0, 0.2, 5);
        await this.#sleep(30);

    }

    async ArrivedAtNextSector() {
        const portalsController = this.gameManager.portalsController;

        this.world.SetVelocity(0, 0);
        portalsController.SendMessage("Sea_Calm", portalsController.TaskStates.AnyToActive);
        portalsController.SendMessage("ShipState_Moving", portalsController.TaskStates.AnyToNotActive);
        portalsController.SendMessage("ShipState_Idle", portalsController.TaskStates.AnyToActive);

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
        /*
        this.gameManager.playerMovementController.addEventListener("onEnterState", (e) => {
            if(e.state)
        })
        */
    }

    async AshtonPing() {

    }

    async PlayerPing() {
        const sonarMachine = SceneManager.instance.sonarMachine;
        sonarMachine.SetActiveSonarAuthorised(true);
        const e = await this.WaitForEvent(sonarMachine, "onPing");


        const worldPos = this.world.shipRoot.position.clone();
        worldPos.x += 0.1;
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
        this.audioManager.PlayFadeIn("interference3", { seconds: 3});
        await this.#sleep(2);
        this.audioManager.PlayFadeIn("subInterior", { seconds: 2});
        await this.#sleep(2);
        this.audioManager.PlayFadeOut("interference3", { seconds: 3 });
        this.audioManager.PlayFadeIn("glitchyNoise", { seconds: 8});
    }

    async IncreaseFear()
    {
        this.audioManager.PlayFadeIn("underworldVoices", { seconds: 15});
        await this.#sleep(1);
    }

    async IncreaseFearAgain()
    {

    }

    async AshtonDisappears() {

    }

    async WaitForPlayerToLookOutWindow() {

    }

    async TheChaseBegins() {

    }

    // ACT 4: THE CHOICE



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