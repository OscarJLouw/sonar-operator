import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { AudioManager } from '../../managers/AudioManager';
import { Utils } from '../../utils/Utils';

export class SonarTargetAudio extends GameObject {
    Awake() {
    }

    CreateFromConfig(targetConfig) {
        this.targetConfig = targetConfig;
        this.audioHandle = AudioManager.instance.spawnRingPanned(targetConfig.soundKey, { bus: "sonar", loop: true, R: 1.3, autostart: false, randomizeStartTime: targetConfig.randomizeSoundStartTime });
    }

    Link(sonarTarget) {
        this.CreateFromConfig(sonarTarget.targetConfig);
        this.sonarTarget = sonarTarget;
        this.sonarTarget.addEventListener("overlapPercentageUpdated", this.OnOverlapPercentageUpdated);
        this.sonarTarget.addEventListener("onRemoved", this.OnRemoved);
    }

    Update(deltaTime) {
        if (this.audioHandle == null || this.sonarTarget == null)
            return;


        // spatial placement
        const dx = this.sonarTarget.transform.position.x - AudioManager.instance.listenerRig.position.x;
        const dy = this.sonarTarget.transform.position.y - AudioManager.instance.listenerRig.position.y;
        //this.audioHandle.place(dx, dy);
        //console.log("positioning " + this.name + " at " + dx + ", " + dy);

        AudioManager.instance.placeAroundHeadFromObject(this.audioHandle.panner, this.sonarTarget.transform, { R: 1.3 });
    }

    OnOverlapPercentageUpdated = (event) => {
        const START_T = 0.02;  // start when >2%
        const STOP_T = 0.01;  // stop when <1%
        const RAMP = 0.08;  // 30ms ramp is usually pop-free

        if (event.detail.overlapping) {
            const targetVolume = Utils.instance.Clamp(event.detail.percentage, 0, 1);

            if (!this.audioHandle.isPlaying() && targetVolume > START_T) {
                this.audioHandle.play(0, RAMP); // fade in from 0
            }

            this.audioHandle.setVolumeSmooth(targetVolume, RAMP);

            this.wasOverlapping = true;
        } else {
            if (event.detail.wasOverlappingPreviously) {
                this.audioHandle.setVolumeSmooth(0, RAMP);
                this.wasOverlapping = false;
            }
        }
    }

    OnRemoved = (event) => {
        this.sonarTarget = null;
        this.Destroy();
    }

    OnDestroy() {
        if (this.audioHandle) {
            this.audioHandle.stop();
            this.audioHandle.free();
        }
    }


    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}