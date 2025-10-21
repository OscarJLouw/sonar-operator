import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';

export class AudioManager {
  constructor() {
    if (!AudioManager.instance) {
      AudioManager.instance = this;
    }
    return AudioManager.instance;
  }

  manifest = {
    wind: { path: './audio/Ambience_Wind_Intensity_Soft_Loop.ogg', volume: 0.5, loop: true },
    ocean: { path: './audio/Ambience_Waves_Ocean_Loop.ogg', volume: 0.6, loop: true },
    // add more: uiClick, explosion, etc...
  };

  async Setup(camera) {

    // Listener
    this.listener = new THREE.AudioListener();
    this.listenerRig = new THREE.Object3D();
    this.listenerRig.add(this.listener);
    SceneManager.instance.scene.add(this.listenerRig);

    /*
    this.listenerRig.position.copy(camera.position);
    const p = this.listenerRig.position;
    this.listenerRig.lookAt(p.x, p.y, p.z - 1);
    */

    const L = this.listener;
    if ('forwardX' in L) {
      L.forwardX.value = 0; L.forwardY.value = 0; L.forwardZ.value = -1;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else if (L.setOrientation) {
      L.setOrientation(0, 0, -1, 0, 1, 0);
    }
    //camera.add(this.listener);


    // Loader
    this.audioLoader = new THREE.AudioLoader();
    this.audioContext = this.listener.context;

    // Ambience bus (starts near zero)
    this.ambienceGain = this.audioContext.createGain();
    this.ambienceGain.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
    this.ambienceGain.connect(this.listener.getInput());

    // 1) Preload + decode all buffers
    this.buffers = await this.#preloadAll(this.manifest);

    // 2) Build THREE.Audio objects (not playing yet)
    this.sounds = this.#buildSounds(this.buffers, this.manifest);
  }

  async Start() {
    await this.#unlockAudio();

    // Start loops if not already started
    const loopKeys = ['wind', 'ocean'];
    for (const k of loopKeys) {
      const s = this.sounds?.[k];
      if (s && !s.isPlaying) s.play();
    }
  }

  MakePositionalSound(buffer) {
    const s = new THREE.PositionalAudio(this.listener);
    s.setBuffer(buffer);
    s.setDistanceModel('linear');   // keep rolloff flat
    s.setRefDistance(1);            // distance reference
    s.setRolloffFactor(0);          // no distance attenuation
    if (s.panner) s.panner.panningModel = 'HRTF'; // crucial
    scene.add(s);
    return s;
  }

  FadeInAmbience(targetVolume, fadeTime) {
    const p = this.ambienceGain.gain;
    const now = this.audioContext.currentTime;
    const v0 = Math.max(0.0001, p.value);

    p.cancelScheduledValues(now);
    p.setValueAtTime(v0, now);
    p.linearRampToValueAtTime(targetVolume, now + fadeTime);
  }

  FadeOutAmbience(fadeTime) {
    const p = this.ambienceGain.gain;
    const now = this.audioContext.currentTime;
    const v0 = Math.max(0.0001, p.value);

    p.cancelScheduledValues(now);
    p.setValueAtTime(v0, now);
    p.linearRampToValueAtTime(0.0001, now + fadeTime);
  }

  // ---------- internals ----------

  async #preloadAll(manifest) {
    const entries = Object.entries(manifest);
    const buffers = await Promise.all(
      entries.map(async ([key, spec]) => {
        const buffer = await this.audioLoader.loadAsync(spec.path);
        return [key, buffer];
      })
    );
    return Object.fromEntries(buffers);
  }

  #buildSounds(buffers, manifest) {
    const out = {};
    for (const [key, spec] of Object.entries(manifest)) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffers[key]);
      sound.setLoop(!!spec.loop);
      sound.setVolume(spec.volume ?? 1.0);

      // Route through ambience bus (so we can group-fade)
      sound.setFilters([this.ambienceGain]);

      out[key] = sound;
    }
    return out;
  }

  async #unlockAudio() {
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (e) {
      console.warn('Audio resume failed:', e);
    }
  }
}