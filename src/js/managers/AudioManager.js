import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';

export class AudioManager 
{
    constructor() {
        // Singleton pattern
        if (!AudioManager.instance) {
            AudioManager.instance = this;
        }

        return AudioManager.instance;
    }

    Setup(camera)
    {
        // create an AudioListener and add it to the camera
        this.listener = new THREE.AudioListener();
        camera.add( this.listener );

        // load a sound and set it as the Audio object's buffer
        this.audioLoader = new THREE.AudioLoader();
    }

    Start(){
        this.CreateAmbientSounds();
    }

    CreateAmbientSounds()
    {
        const listener = this.listener;

        // Use the SAME context as the Three.js listener
        this.audioContext = listener.context;

        // Group gain for ambience (start near zero; avoid 0 for exponential ramps)
        this.ambienceGain = this.audioContext.createGain();
        this.ambienceGain.gain.setValueAtTime(0.0001, this.audioContext.currentTime);

        // Route ambience group into the listener's input (NOT the AudioContext directly)
        this.ambienceGain.connect(listener.getInput());

        // Create & load sounds
        this.windSound  = this.MakeLoop("./audio/Ambience_Wind_Intensity_Soft_Loop.ogg", 0.5);
        this.oceanSound = this.MakeLoop("./audio/Ambience_Waves_Ocean_Loop.ogg", 0.6);
    }

    FadeInAmbience(targetVolume, fadeTime)
    {
        const p = this.ambienceGain.gain;
        const now = this.audioContext.currentTime;
        const v0 = Math.max(0.0001, p.value);

        p.cancelScheduledValues(now);
        p.setValueAtTime(v0, now);
        // Use linear ramp for predictable fades; swap to exponential if you prefer
        p.linearRampToValueAtTime(targetVolume, now + fadeTime);

        /*
        this.windSound.play();
        this.oceanSound.play();
        this.windSound.connect(this.ambienceGain);
        this.oceanSound.connect(this.ambienceGain);

        this.ambienceGain.gain.exponentialRampToValueAtTime(targetVolume, this.audioContext.currentTime + time);
        */
    }

    MakeLoop(path, volume = 0)
    {
        const listener = this.listener;
        const sound = new THREE.Audio(listener);

        this.audioLoader.load(path, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(volume);

            sound.setFilters([ this.ambienceGain ]);

            sound.play(); // safe to autoplay; page may still require a user gesture to resume context
        });

        return sound;
    }
}
