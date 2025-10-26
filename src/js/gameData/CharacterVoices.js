
import { DialogueManager } from '../managers/DialogueManager';
import { AudioManager } from '../managers/AudioManager';


export class CharacterVoices {
    constructor() {
        // Singleton pattern
        if (!CharacterVoices.instance) {
            CharacterVoices.instance = this;
        }

        return CharacterVoices.instance;
    }

    LinkWithDialogue(dialogueManager) {
        this.dialogueManager = dialogueManager;
        this.audioManager = AudioManager.instance;

        this.CreateVoices();              // make sure voices exist
        this.currentVoice = this.ashton;
        this.usingVoice = false;
        this._lastBlipAt = 0;             // throttle timer


        this._onDialogueStarted = e => {
            const speaker = e.detail.speaker;
            this._applyVoiceForSpeaker(speaker);
        };

        this._onSpeakerChanged = (e) => {
            const speaker = e.detail.speaker;
            this._applyVoiceForSpeaker(speaker);
        };

        dialogueManager.addEventListener('dialogueStarted', this._onDialogueStarted);
        dialogueManager.addEventListener('speakerChanged', this._onSpeakerChanged);

        dialogueManager.addEventListener('dialogueEnded', () => {
            this.usingVoice = false;
            this.dialogueManager?.setNameColor(null);
        });

        /*
        // play a “blip” per revealed character
        this.dialogueManager.setCharacterCallback((ch, index, { nodeId }) => {
            if (!this.usingVoice) return;

            // skip whitespace & punctuation
            if (!/[A-Za-z0-9]/.test(ch)) return;

            // optional throttle: don’t blip too fast
            const now = performance.now();
            if (now - this._lastBlipAt < 28) return; // ~35 blips/sec max
            this._lastBlipAt = now;

            // optional: only blip every Nth character instead of time throttle
            // if (index % 2) return;

            const key = this.GetRandomBlipKey(this.currentVoice, 'voices');
            try {
                // subtle pitch variation keeps it organic
                this.audioManager.playOneShot(key, { bus: 'dialogue', volume: 0.85, rate: 1, jitter: 0.06 });
            } catch (e) {
                // if a key is missing, don’t crash the typewriter
                console.warn('Dialogue blip failed:', key, e);
            }
        });
        */

        let _prevWasLetter = false;

        this.dialogueManager.setCharacterCallback((ch, index, { nodeId }) => {
            if (!this.usingVoice) return;

            const isLetter = /[A-Za-z]/.test(ch);

            if (!_prevWasLetter && isLetter) {
                // we’ve entered a new word
                const key = this.GetRandomBlipKey(this.currentVoice, 'voices', /* preferLong = */ true);
                try {
                    this.audioManager.playOneShot(key, { bus: 'dialogue', volume: 0.5, rate: 1, jitter: 0.06 });
                } catch (e) {
                    console.warn('Dialogue blip failed:', key, e);
                }
            }

            _prevWasLetter = isLetter;
        });
    }

    CreateVoices() {
        this.ashton = { characterName: "ASHTON", type: "deep", color: "#FF7A70", shortCount: 10, longCount: 10 };
        this.clark = { characterName: "CLARK", type: "high", color: "#7CD1FF", shortCount: 13, longCount: 14 };
        this.morgan = { characterName: "MORGAN", type: "mellow", color: "#A2F39B", shortCount: 15, longCount: 14 };
        this.harper = { characterName: "HARPER", type: "wacko", color: "#E2A8FF", shortCount: 13, longCount: 13 };
        this.voices = [
            this.ashton,
            this.clark,
            this.morgan,
            this.harper
        ];

        this.currentVoice = this.ashton;
    }

    GetFileList(voice) {
        const voiceType = voice.type;
        const voiceBase = `voice${voiceType}`; // e.g. voicehigh
        const voiceBaseCaps = `Voice${this.CapitalizeFirstLetter(voiceType)}`; // e.g. VoiceHigh
        const basePath = `./audio/voices/${voiceBase}_`; // e.g. ./audio/voices/voicehigh_
        const out = {};

        for (let i = 1; i <= voice.shortCount; i++) {
            const voiceName = `${voiceBaseCaps}_Short${i}`; // e.g. VoiceHigh_Short1
            out[voiceName] = { path: `${basePath}short/${voiceName}.ogg`, volume: 1, bus: 'dialogue' };
        }
        for (let i = 1; i <= voice.longCount; i++) {
            const voiceName = `${voiceBaseCaps}_Long${i}`;
            out[voiceName] = { path: `${basePath}long/${voiceName}.ogg`, volume: 1, bus: 'dialogue' };
        }

        return out; // <-- object map
    }

    GetAllVoices() {
        this.CreateVoices();
        const people = [this.ashton, this.clark, this.morgan, this.harper];
        return people.reduce((acc, v) => Object.assign(acc, this.GetFileList(v)), {});
    }

    CapitalizeFirstLetter(val) {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }

    GetRandomBlipKey(voice, ns = 'voices', useLongSounds = false) {
        const typeCaps = `Voice${this.CapitalizeFirstLetter(voice.type)}`;
        const useLong = useLongSounds; // maybe long more often
        const group = useLong ? 'Long' : 'Short';
        const max = useLong ? voice.longCount : voice.shortCount;
        const i = 1 + Math.floor(Math.random() * Math.max(1, max));
        const base = `${typeCaps}_${group}${i}`;
        return ns ? `${ns}/${base}` : base;
    }

    _applyVoiceForSpeaker(speaker) {
        if (speaker == null || speaker == "") {
            this.usingVoice = false;
            this.dialogueManager?.setNameColor(null);
            return;
        }

        const s = String(speaker).toUpperCase();
        const idx = this.voices.findIndex(v => {
            const name = v.characterName.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape
            const re = new RegExp(`\\b${name}\\b`); // match as a whole word
            return re.test(s);
        });

        if (idx < 0) {
            this.usingVoice = false;
            this.dialogueManager?.setNameColor(null);
            return;
        }
        this.usingVoice = true;
        this.currentVoice = this.voices[idx];
        if (this.currentVoice.color) {
            this.dialogueManager?.setNameColor(this.currentVoice.color);
        } else {
            this.dialogueManager?.setNameColor(null);
        }
    }

}