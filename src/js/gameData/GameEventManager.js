import * as THREE from "three";
import { DialogueManager } from "../managers/DialogueManager";
import { SonarTargetConfig } from "../gameObjects/SonarTargets/SonarTargetConfig";

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
            "humpbacks", //"battleship", TEMP: for testing
            {
                randomizeRadius: false,
                radius: 0.05,
                spawnAtRandomPosition: false,
                spawnPosition: new THREE.Vector3(0.6, 0.2, 0)
            }
        );

        const melbourneConfig = new SonarTargetConfig(
            "Melbourne",
            "humpbacks", //"battleship", TEMP: for testing
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

    async ReefsSearch() {

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