import * as THREE from 'three';
import { DialogueManager } from './DialogueManager';

export class StoryManager {
    constructor() {
        // Singleton pattern
        if (!StoryManager.instance) {
            StoryManager.instance = this;
        }

        return StoryManager.instance;
    }

    async Setup() {

    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

}
