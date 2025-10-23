
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
        });

        // play a “blip” per revealed character
        this.dialogueManager.setCharacterCallback((ch, index, { nodeId }) => {
            console.debug('TYPE:', ch, index);

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
    }

    CreateVoices() {
        this.ashton = { characterName: "ASHTON", type: "deep", shortCount: 10, longCount: 10 };
        this.clark = { characterName: "CLARK", type: "high", shortCount: 13, longCount: 14 }; // (typo fixed)
        this.morgan = { characterName: "COMMANDER MORGAN", type: "mellow", shortCount: 15, longCount: 14 };
        this.harper = { characterName: "COMMANDER HARPER", type: "wacko", shortCount: 13, longCount: 13 };
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

    GetRandomBlipKey(voice, ns = 'voices') {
        const typeCaps = `Voice${this.CapitalizeFirstLetter(voice.type)}`;
        const useShort = Math.random() < 0.85; // bias to short clips
        const group = useShort ? 'Short' : 'Long';
        const max = useShort ? voice.shortCount : voice.longCount;
        const i = 1 + Math.floor(Math.random() * Math.max(1, max));
        const base = `${typeCaps}_${group}${i}`;           // e.g. VoiceHigh_Short7
        return ns ? `${ns}/${base}` : base;                // e.g. voices/VoiceHigh_Short7
    }

    _applyVoiceForSpeaker(speaker) {
        const idx = this.voices.findIndex(v => v.characterName === speaker);
        if (idx < 0) {
            this.usingVoice = false;
            return;
        }
        this.usingVoice = true;
        this.currentVoice = this.voices[idx];
    }

}