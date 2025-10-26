import * as THREE from "three";
import { SonarTargetConfig } from "../gameObjects/SonarTargets/SonarTargetConfig";
import { SceneManager } from "../managers/SceneManager";
import { MeshManager } from "../managers/MeshManager";
import { Utils } from "../utils/Utils";

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

        this.subOrbitCtrl = null;
        this.subOrbitTask = null;
    }

    async FadeIn() {
        this.portalsController.SendMessage("BlackScreen", this.portalsController.TaskStates.AnyToComplete);
        //this.portalsController.SendMessage("BlackScreen", this.portalsController.TaskStates.AnyToNotActive);
        //this.portalsController.SendMessage("FadeFromBlack", this.portalsController.TaskStates.AnyToActive);
        this.audioManager.playOneShot("echoCymbal", { bus: 'sfx', volume: 0.6, rate: 1 });
        await this.#sleep(2);
        this.portalsController.SendMessage("BlackScreen", this.portalsController.TaskStates.AnyToNotActive);

        //this.portalsController.SendMessage("FadeFromBlack", this.portalsController.TaskStates.AnyToComplete);
    }

    CutToBlack() {
        this.portalsController.SendMessage("BlackScreen", this.portalsController.TaskStates.AnyToComplete);

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

    DebugSetupPrerequisites(activateSonar, addShips, addSub, movePlayerAndShips) {
        if (activateSonar) {
            const sonarMachine = SceneManager.instance.sonarMachine;
            sonarMachine.SetActiveSonarAuthorised(true);
        }

        if (movePlayerAndShips) {
            this.world.shipRoot.position.set(
                Math.random() * 20,
                Math.random() * 20,
                0
            );
        }
        const worldPos = this.world.shipRoot.position.clone();

        if (addShips) {


            const melbourneConfig = new SonarTargetConfig(
                "Melbourne",
                "ship_melbourne",
                {
                    randomizeRadius: false,
                    radius: 0.05,
                    spawnAtRandomPosition: false,
                    spawnPosition: new THREE.Vector3(worldPos.x + 0.6, worldPos.y + 0.2, 0)
                }
            );

            const endeavourConfig = new SonarTargetConfig(
                "Endeavor",
                "ship_endeavour",
                {
                    randomizeRadius: false,
                    radius: 0.05,
                    spawnAtRandomPosition: false,
                    spawnPosition: new THREE.Vector3(worldPos.x + 0.25, worldPos.y - 0.2, 0)
                }
            );

            this.melbourne = this.world.SpawnSonarTarget(melbourneConfig);
            this.endeavour = this.world.SpawnSonarTarget(endeavourConfig);

            this.melbourne.OnDiscovered();
            this.endeavour.OnDiscovered();
        }



        if (addSub) {

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
            this.submarine.OnDiscovered();
        }
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
        this.audioManager.PlayFadeIn("ghostFrequency", { seconds: 10 });
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
        worldPos.y -= 0.45;

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

        // --- start moving slowly around the player here (non-blocking) ---
        // cancel any prior orbit if it exists
        this.subOrbitCtrl?.abort();
        this.subOrbitCtrl = new AbortController();

        this.subOrbitTask = this.OrbitUntilAbort(
            this.submarine.worldTransform,
            this.world.shipRoot.position.clone(),
            {
                angularSpeed: -Math.PI*0.02,    // slower circle
                signal: this.subOrbitCtrl.signal,
            }
        );

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
        const sonarMachine = SceneManager.instance.sonarMachine;
        const sonarParticles = sonarMachine.sonarViewController.particlesController;
        sonarParticles.PingAt(this.endeavour.transform.position, { radius: 2, showHorror: false });

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
        if (movementController.currentState === movementController.states.Porthole)
            return;

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

        //this.audioManager.StopFadeOut("underworldVoices", 1);

        //this.portalsController.SendMessage("FadeToBlack", this.portalsController.TaskStates.AnyToComplete);
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
        if (movementController.currentState === movementController.states.UsingSonar)
            return;

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
        const sonarMachine = SceneManager.instance.sonarMachine;
        sonarMachine.SetActiveSonarAuthorised(false);
        const sonarParticles = sonarMachine.sonarViewController.particlesController;
        this.audioManager.playOneShot("sonarBlip", { bus: 'sfx', volume: 0.9, rate: 1 });
        sonarParticles.CreateTentacles();
        sonarParticles.PingAt(this.melbourne.transform.position, { radius: 2, showHorror: true });
        this.audioManager.playOneShot("eyeOfSonar", { bus: 'sfx', volume: 0.9, rate: 1 });

        await this.#sleep(4);
    }

    async WaitForPlayerToPing() {
        const sonarMachine = SceneManager.instance.sonarMachine;
        const sonarParticles = sonarMachine.sonarViewController.particlesController;
        sonarParticles.CreateTentacles();
        sonarParticles.showHorrorInPing = true;
        const e = await this.WaitForEvent(sonarMachine, "onPing");
        this.audioManager.playOneShot("eyeOfSonar", { bus: 'sfx', volume: 0.9, rate: 1 });
        await this.#sleep(4);
    }

    async TheMelbourneDisappears() {
        //const sonarMachine = SceneManager.instance.sonarMachine;
        //const sonarParticles = sonarMachine.sonarViewController.particlesController;
        //sonarParticles.PingAt(this.melbourne.transform.position, { radius: 2, showHorror: true });
        //this.audioManager.playOneShot("sonarBlip", { bus: 'sfx', volume: 0.9, rate: 1 });

        //this.portalsController.SendMessage("Vessel2_Disappear", this.portalsController.TaskStates.AnyToComplete);
        //this.melbourne.Destroy();

        //await this.#sleep(3);
    }

    async FinalPing() {

        this.audioManager.StopFadeOut("ghostFrequency", 10);

        const sonarMachine = SceneManager.instance.sonarMachine;
        sonarMachine.SetActiveSonarAuthorised(true);
        const sonarParticles = sonarMachine.sonarViewController.particlesController;
        //sonarParticles.

        sonarParticles.fadeoutTentacles = false;
        const e = await this.WaitForEvent(sonarMachine, "onPing");
        this.SpawnFace();
    }


    async SpawnFace() {

        const sonarMachine = SceneManager.instance.sonarMachine;
        const sonarViewController = sonarMachine.sonarViewController;
        const sonarParticles = sonarViewController.particlesController;

        sonarViewController.mesh.visible = false;
        sonarViewController.mesh.layers.set(1);
        sonarViewController.targetMesh.visible = false;
        sonarViewController.targetMesh.layers.set(1);

        
        //SceneManager.instance.CreateControls(sonarParticles.transform);
        sonarMachine.SetActiveSonarAuthorised(false);
        this.gameManager.playerControls.HideAll();

        this.audioManager.playOneShot("core", { bus: 'sfx', volume: 0.9, rate: 1 });

        // 1) Trigger horror (tentacles)
        sonarParticles.CreateTentacles({
            spawnAngleMin: 0, spawnAngleMax: 1, endpointSpread: 0.2,
            tentacleLengthMin: 0.3, tentacleLengthMax: 0.5, animScaleMin: 0, animScaleMax: 0.5
        });

        sonarParticles.PingAt(new THREE.Vector2(0, 0), { radius: 2, showHorror: true });

        // 2) After a short beat, start the face reveal.
        //    Pass a THREE.Mesh (or find one inside a loaded GLTF scene).
        const faceMesh = MeshManager.instance.models.eldritchHorror;
        const eyeTexture = MeshManager.instance.textures.eyeTexture;
        sonarParticles.faceResampleMode = 'pool';
        //sonarParticles.facePoolSize = 20000;           // more variety if you want
        sonarParticles.StartFaceFromMesh(faceMesh, {
            center: new THREE.Vector2(0, 0),
            scaleX: 0.4,
            scaleY: 0.4,
            scaleZ: 0.4,
            yawSpeed: 0,
            pitchSpeed: 0,
            rollSpeed: 0,
            jitter: 0.01,
            weightTexture: eyeTexture,
            weightChannel: 'r',                       // or 'r' if you painted pure red
        });
        sonarParticles.faceRot.set(Math.PI / 2, 0, 0);

        var start = performance.now();
        var duration = 0.2 * 1000;
        var duration2 = 0.25 * 1000;


        while (true) {
            const now = performance.now();
            const t1 = Math.min((now - start) / duration, 1);
            const t2 = Math.min((now - start) / duration2, 1);

            sonarParticles.faceRot.set(Math.PI / 2, 0, Utils.instance.Lerp(Math.PI / 6, 0, this.easeOutBack(t1)));
            sonarParticles.faceScaleX = Utils.instance.Lerp(0.2, 0.4, this.easeOutBack(t2));
            //sonarParticles.faceScaleY = Utils.instance.Lerp(0, 0.4, easeInOutQuad(t));
            await this.nextFrame();

            if (Math.min(t1, t2) >= 1) break;
        }
        await this.#sleep(6);


        start = performance.now();
        duration = 1 * 1000;
        const realOrigin = sonarParticles.transform.worldToLocal(new THREE.Vector3(0, 0, 0));
        const startJitter = sonarParticles.faceJitter;
        this.audioManager.playOneShot("distortedScreams1", { bus: 'sfx', volume: 0.9, rate: 1 });

        while (true) {
            const now = performance.now();
            const t = Math.min((now - start) / duration, 1);
            //const tEased = this.easeInBack(t);
            const tEased = t;

            const lerpedScale = Utils.instance.Lerp(0.4, 2, tEased);

            sonarParticles.facePos.x = Utils.instance.Lerp(0, realOrigin.x, tEased);
            sonarParticles.facePos.y = Utils.instance.Lerp(0, realOrigin.y, tEased);
            sonarParticles.facePos.z = Utils.instance.Lerp(0, 10, tEased);
            sonarParticles.faceScaleX = lerpedScale;
            sonarParticles.faceScaleY = lerpedScale;
            sonarParticles.faceScaleZ = lerpedScale;
            sonarParticles.faceJitter = Utils.instance.Lerp(startJitter, 0.5, tEased);
            //sonarParticles.transform.scale.x = Utils.instance.Lerp(1, 3, tEased);
            //sonarParticles.transform.scale.y = Utils.instance.Lerp(1, 3, tEased);
            //sonarParticles.transform.scale.z = Utils.instance.Lerp(1, 3, tEased);

            await this.nextFrame();

            if (t >= 1) break;
        }

        sonarMachine.SetActive(false);

        //sonarParticles.faceRollSpeed = 0;
    }


    async EndCredits() {
        await this.#sleep(5);
        this.audioManager.FadeBusByID("ambience", 0.001, 5);
        this.audioManager.FadeBusByID("sonar", 0.001, 5);
        this.audioManager.FadeBusByID("sfx", 0.001, 5);
        this.audioManager.PlayFadeIn("creditsMusic", { to: 0.3, seconds: 3, randomizeStart: false });

    }

    async AnimateCameraFOV() {
        // wherever your finale begins:
        SceneManager.instance.StartPerspectiveTransition({
            duration: 3,     // seconds
            finalFovDeg: 40,    // taste
            easing: (t) => t * t * (3 - 2 * t)  // smoothstep
        });
    }

    async OrbitUntilAbort(
        object3D,
        centerPoint,                      // () => THREE.Vector3 (called every frame; follows a moving ship)
        {
            angularSpeed = Math.PI / 2,  // radians per second (slow circle)
            signal,                       // AbortSignal to stop
        } = {}
    ) {
        let last = await this.nextFrameResolver(); // prime with first timestamp


        var offsetX = object3D.position.x - centerPoint.x;
        var offsetY = object3D.position.y - centerPoint.y;
        var originalZ = object3D.position.z;
        const orbitRadius = Math.hypot(offsetX, offsetY);
        var angle = Math.atan2(offsetY, offsetX);

        while (!signal?.aborted) {
            const now = await this.nextFrameResolver();
            const dt = (now - last) / 1000; // seconds
            last = now;

            angle += angularSpeed * dt;

            const x = centerPoint.x + Math.cos(angle) * orbitRadius;
            const y = centerPoint.y + Math.sin(angle) * orbitRadius;

            object3D.position.set(x, y, originalZ);
        }
    }

    async StopSubmarineMoving() {
        if (!this.subOrbitCtrl) return;

        // abort the loop
        this.subOrbitCtrl.abort();

        // optionally wait for the task to finish cleanly
        try {
            await this.subOrbitTask;
        } catch (_) {
            // ignore if it was already stopped
        }

        this.subOrbitCtrl = null;
        this.subOrbitTask = null;

        this.submarine.Destroy();
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

    nextFrame = () => new Promise(requestAnimationFrame);
    nextFrameResolver = () => new Promise(resolve => requestAnimationFrame(resolve));

    easeInQuad = t => t * t;
    easeOutQuad = t => t * (2 - t);
    easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    easeInBack = (t, overshoot = 1.70158) => {
        const c1 = overshoot;
        return (c1 + 1) * t * t * t - c1 * t * t;
    }

    easeOutBack = (t, overshoot = 1.70158) => {
        const c1 = overshoot;
        return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    easeInOutBack = (t, overshoot = 1.70158) => {
        const c1 = overshoot;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    };
}