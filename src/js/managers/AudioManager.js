import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';

/**
 * AudioManager
 *
 * Backward compatible with your current usage, but adds:
 * - Master/ambience/sfx/music buses
 * - Robust listener orientation (WebAudio listener)
 * - Panner factory + ring placement helper
 * - Lightweight pooling of THREE.Audio instances
 * - One-shot/spatial spawn helpers
 */
export class AudioManager {
  constructor() {
    if (!AudioManager.instance) {
      AudioManager.instance = this;
    }
    return AudioManager.instance;
  }

  // --- PUBLIC CONFIG ---
  manifest = {
    wind: { path: './audio/Ambience_Wind_Intensity_Soft_Loop.ogg', volume: 0.5, loop: true, bus: 'ambience', autostart: true },
    ocean: { path: './audio/Ambience_Waves_Ocean_Loop.ogg', volume: 0.6, loop: true, bus: 'ambience', autostart: true },
    // example sfx (does NOT autostart)
    question_004: { path: './audio/question_004.ogg', volume: 0.4, loop: false, bus: 'sfx', autostart: false },
  };

  // --- LIFECYCLE ---
  async Setup(camera) {
    this.camera = camera;

    // Listener
    this.listener = new THREE.AudioListener();
    this.listenerRig = new THREE.Object3D();
    this.listenerRig.add(this.listener);
    SceneManager.instance.scene.add(this.listenerRig);

    // Correctly set the WebAudio listener orientation (forward = -Z, up = +Y)
    this.audioContext = this.listener.context;
    const webListener = this.audioContext.listener;
    if ('forwardX' in webListener) {
      webListener.forwardX.value = 0; webListener.forwardY.value = 0; webListener.forwardZ.value = -1;
      webListener.upX.value = 0; webListener.upY.value = 1; webListener.upZ.value = 0;
    } else if (webListener.setOrientation) {
      webListener.setOrientation(0, 0, -1, 0, 1, 0);
    }

    // Buses
    this.masterGain = this.audioContext.createGain();
    this.ambienceGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();

    this.sfxGain = this.audioContext.createGain();
    this.roomSFXGain = this.audioContext.createGain();
    this.sonarSFXGain = this.audioContext.createGain();
    this.playerSFXGain = this.audioContext.createGain();
    this.uiSFXGain = this.audioContext.createGain();
    this.dialogueSFXGain = this.audioContext.createGain();



    this.masterGain.gain.value = 1.0;
    this.ambienceGain.gain.value = 0.0001; // start low like before
    this.musicGain.gain.value = 1.0;

    this.sfxGain.gain.value = 1.0;
    this.roomSFXGain.gain.value = 1.0;
    this.sonarSFXGain.gain.value = 0.0001;
    this.playerSFXGain.gain.value = 1.0;
    this.uiSFXGain.gain.value = 1.0;
    this.dialogueSFXGain.gain.value = 1.0;


    // route: bus -> master -> listener
    this.ambienceGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);

    this.sfxGain.connect(this.masterGain);

    this.roomSFXGain.connect(this.sfxGain);
    this.sonarSFXGain.connect(this.sfxGain);
    this.playerSFXGain.connect(this.sfxGain);
    this.uiSFXGain.connect(this.sfxGain);
    this.dialogueSFXGain.connect(this.sfxGain);
    
    this.masterGain.connect(this.listener.getInput());

    // Loader
    this.audioLoader = new THREE.AudioLoader();

    // 1) Preload + decode all buffers
    this.buffers = await this.#preloadAll(this.manifest);

    // 2) Build THREE.Audio objects for manifest entries (not playing yet)
    this.sounds = this.#buildSounds(this.buffers, this.manifest);

    // 3) Simple pool per key (lazy-filled)
    this.pools = new Map(); // key -> { free: THREE.Audio[], used: Set<THREE.Audio> }
  }

  async Start() {
    await this.#unlockAudio();

    // Keep the listener rig in sync with the camera once at start
    this.UpdateListenerFromCamera(this.camera);

    // Only autostart when explicitly opted-in
    const autoKeys = Object.keys(this.manifest).filter(k => this.manifest[k].autostart === true);
    for (const k of autoKeys) {
      const s = this.sounds?.[k];
      if (s && !s.isPlaying) s.play();
    }
  }

  /** Call this every frame from your main update to keep the listener aligned. */
  UpdateListenerFromCamera(camera) {
    if (!camera) return;
    this.listenerRig.position.copy(camera.position);
    const p = this.listenerRig.position;
    this.listenerRig.lookAt(p.x, p.y, p.z - 1); // face -Z
  }

  // --- FACTORIES / HELPERS ---

  /** Create an HRTF panner ready to go. */
  createPanner(opts = {}) {
    const {
      distanceModel = 'linear', // good for constant-loudness rings when rolloff=0
      refDistance = 1,
      rolloffFactor = 0,
      coneInnerAngle = 360,
      coneOuterAngle = 360,
      coneOuterGain = 0.0,
    } = opts;

    const p = new PannerNode(this.audioContext, {
      panningModel: 'HRTF',
      distanceModel,
      refDistance,
      rolloffFactor,
      coneInnerAngle,
      coneOuterAngle,
      coneOuterGain,
    });

    // Force mono into HRTF for consistent elevation behavior with stereo files
    p.channelCountMode = 'explicit';
    p.channelCount = 1;

    return p;
  }

  /** Map 2D (dx, dy) around listener to a constant-radius ring around the head. */
  placeAroundHead(panner, dx, dy, opts = {}) {
    const R = opts.R ?? 1.3;      // meters
    const X_SIGN = opts.xSign ?? -1;   // flip if L/R feels swapped
    const Z_SIGN = opts.zSign ?? 1;  // +1 if your camera faces +Z

    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;

    this.#setPannerPos(panner, X_SIGN * nx * R, ny * R, Z_SIGN * R);
    this.#setPannerOrientation(panner, 0, 0, -1);
  }

  /** Place using a *world* position on your 2D plane. */
  placeAroundHeadFromWorld(panner, worldX, worldY, opts = {}) {
    const L = this._tmpL ??= new THREE.Vector3();
    this.listenerRig.getWorldPosition(L);

    const dx = worldX - L.x;
    const dy = worldY - L.y;

    this.placeAroundHead(panner, dx, dy, opts);
  }

  /** Place using an Object3D's world position. */
  placeAroundHeadFromObject(panner, obj3D, opts = {}) {
    const S = this._tmpS ??= new THREE.Vector3();
    obj3D.getWorldPosition(S);
    this.placeAroundHeadFromWorld(panner, S.x, S.y, opts);
  }


  /** Convert pixels to meters and set 3D position (classic mapping). */
  placeWithDistance(panner, dx, dy, ppm = 100) {
    this.#setPannerPos(panner, dx / ppm, 0, dy / ppm);
  }

  /** Acquire a THREE.Audio from pool for the given key (buffer must exist). */
  acquireAudio(key, { bus = 'sfx', loop = false, volume = 1.0 } = {}) {
    const buffer = this.buffers?.[key];
    if (!buffer) throw new Error(`No buffer for key: ${key}`);

    let entry = this.pools.get(key);
    if (!entry) { entry = { free: [], used: new Set() }; this.pools.set(key, entry); }

    let audio = entry.free.pop();
    if (!audio) {
      audio = new THREE.Audio(this.listener);
      audio.setBuffer(buffer);
    }

    audio.setLoop(!!loop);
    audio.setVolume(volume);

    // Route output -> bus (do NOT insert bus as a filter)
    const busNode = this.#getBus(bus);
    audio.setFilters([]);
    this.#routeSoundToBus(audio, busNode);


    entry.used.add(audio);
    return audio;
  }

  /** Release an audio back to its pool. */
  releaseAudio(key, audio) {
    const entry = this.pools.get(key);
    if (!entry) return;
    try { audio.stop(); } catch { }
    audio.setFilters([]);
    try { audio.getOutput().disconnect(); } catch { }
    entry.used.delete(audio);
    entry.free.push(audio);
  }

  /** One-stop helper: spawn a ring‑panned sound by manifest key. */
  spawnRingPanned(key, {
    bus = 'sfx',
    loop = false,
    volume = 1.0,
    R = 1.3,
    xSign = 1,
    zSign = -1,
    autostart = true,
  } = {}) {
    const sound = this.acquireAudio(key, { bus, loop, volume });
    const panner = this.createPanner({ distanceModel: 'linear', rolloffFactor: 0, refDistance: 1 });

    // Insert panner before the bus
    const busNode = this.#getBus(bus);
    sound.setFilters([panner]); // only panner in the filter chain
    this.#routeSoundToBus(sound, busNode);

    if (autostart && !sound.isPlaying) sound.play();

    const ctx = this.audioContext;

    const handle = {
      sound,
      panner,
      key,
      place: (dx, dy) => this.placeAroundHead(panner, dx, dy, { R, xSign, zSign }),

      // Instant (old behavior)
      setVolume: (v) => sound.setVolume(v),

      // Smooth ramp (recommended)
      setVolumeSmooth: (v, rampSec = 0.03) => {
        const g = sound.getOutput().gain; // underlying GainNode
        const now = ctx.currentTime;
        const cur = g.value;

        g.cancelScheduledValues(now);
        g.setValueAtTime(cur, now);
        g.linearRampToValueAtTime(v, now + Math.max(0.001, rampSec));
      },

      // Click-free start/stop helpers
      play: (targetVol = 1, fadeSec = 0.02) => {
        if (!sound.isPlaying) sound.play();
        handle.setVolumeSmooth(targetVol, fadeSec);
      },
      pause: (fadeSec = 0.02) => {
        const now = ctx.currentTime;
        const g = sound.getOutput().gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + Math.max(0.001, fadeSec));
        // pause a tick after fade
        setTimeout(() => { try { sound.pause(); } catch { } }, (fadeSec * 1000) + 4);
      },
      stop: (fadeSec = 0.02) => {
        const now = ctx.currentTime;
        const g = sound.getOutput().gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + Math.max(0.001, fadeSec));
        setTimeout(() => { try { sound.stop(); } catch { } }, (fadeSec * 1000) + 4);
      },

      isPlaying: () => !!sound.isPlaying,
      setVolumeInstant: (v) => sound.setVolume(v), // alias if you ever need it
      free: () => this.releaseAudio(key, sound),
    };

    return handle;
  }

  // --- BUSES & FADES ---
  FadeInAmbience(targetVolume, fadeTime) {
    this.FadeBus(this.ambienceGain, targetVolume, fadeTime);
  }

  FadeOutAmbience(fadeTime) {
    this.FadeBus(this.ambienceGain, 0.0001, fadeTime);
  }

  FadeInSonarBus(targetVolume, fadeTime) {
    this.FadeBus(this.sonarSFXGain, targetVolume, fadeTime);
  }

  FadeOutSonarBus(fadeTime) {
    this.FadeBus(this.sonarSFXGain, 0.0001, fadeTime);
  }

  FadeBusByID(busID, targetVolume, fadeTime)
  {
    const bus = this.#getBus(busID);
    if(bus != null)
    {
      this.FadeBus(bus, targetVolume, fadeTime);
    }
  }

  FadeBus(bus, targetVolume, fadeTime)
  {
    const gainNode = bus.gain;
    const now = this.audioContext.currentTime;
    const v0 = Math.max(0.0001, gainNode.value);

    gainNode.cancelScheduledValues(now);
    gainNode.setValueAtTime(v0, now);
    gainNode.linearRampToValueAtTime(targetVolume, now + fadeTime);
  }

  // --- INTERNALS ---

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

      // Route through declared bus (default ambience to preserve behavior for loops)
      const busName = spec.bus ?? 'ambience';
      const busNode = this.#getBus(busName);
      sound.setFilters([]); // no filters by default for manifest loops
      this.#routeSoundToBus(sound, busNode);


      out[key] = sound;
    }
    return out;
  }

  #getBus(name) {
    switch ((name || 'sfx')) {
      case 'ambience':  return this.ambienceGain;
      case 'music':     return this.musicGain;
      case 'sfx':       return this.sfxGain;
      case 'room':      return this.roomSFXGain;
      case 'sonar':     return this.sonarSFXGain;
      case 'player':    return this.playerSFXGain;
      case 'ui':        return this.uiSFXGain;
      case 'dialogue':  return this.dialogueSFXGain;
      default:          return this.masterGain;
    }
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

  #setPannerPos(p, x, y, z) {
    if ('positionX' in p) {
      p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    } else if (p.setPosition) {
      p.setPosition(x, y, z);
    }
  }

  #setPannerOrientation(p, x, y, z) {
    if ('orientationX' in p) {
      p.orientationX.value = x; p.orientationY.value = y; p.orientationZ.value = z;
    } else if (p.setOrientation) {
      p.setOrientation(x, y, z);
    }
  }

  #routeSoundToBus(sound, busNode) {
    const out = sound.getOutput();   // GainNode
    try { out.disconnect(); } catch { }
    out.connect(busNode);
  }

}
