
import { DialogueManager } from '../managers/DialogueManager';
import { AudioManager } from '../managers/AudioManager';

const audio = AudioManager.instance;

export class CharacterVoices {
    constructor() {
        // Singleton pattern
        if (!CharacterVoices.instance) {
            CharacterVoices.instance = this;
        }

        return CharacterVoices.instance;
    }


    Setup() {
        this.dialogueManager = DialogueManager.instance;

        // play a “blip” per revealed character
        this.dialogueManager.setCharacterCallback((ch, index, { nodeId }) => {
            // Optional: throttle or only blip on certain characters:
            // if (!/\s/.test(ch)) audio.playDialogueBlip();
            audio.playDialogueBlip();  // your existing AudioManager method
        });

        // when fast-forward happens, you may want to stop any blip loop or play a whoosh
        this.dialogueManager.setSkipCallback(({ nodeId, revealed, total }) => {
            audio.stopDialogueBlip?.();       // if you have a long/looping blip
            audio.playSkipWhoosh?.();         // optional “skip” sfx
        });

    }

    CreateVoices() {
        const ashton =
        {
            characterName: "ASHTON",
            type: "deep",
            shortCount: 10,
            longCount: 10
        };

        const clark =
        {
            characterName: "ASHTON",
            type: "high",
            shortCount: 13,
            longCount: 14
        };

        const morgan =
        {
            characterName: "COMMANDER MORGAN",
            type: "mellow",
            shortCount: 15,
            longCount: 14
        };

        const harper =
        {
            characterName: "COMMANDER HARPER",
            type: "wacko",
            shortCount: 13,
            longCount: 13
        };
    }


    GetFileList() {


    }
}