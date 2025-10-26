import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';

export class PortalsController {
    constructor() {
        // Singleton pattern
        if (!PortalsController.instance) {
            PortalsController.instance = this;
        }

        return PortalsController.instance;
    }

    Setup(portalsSDKActive) {
        this.portalsSDKActive = portalsSDKActive;

        this.TaskStates = {
            AnyToNotActive: "ToNotActive",
            AnyToActive: "SetAnyToActive",
            AnyToComplete: "SetAnyToCompleted",

            NotActiveToActive: "SetNotActiveToActive",
            NotActiveToComplete: "SetNotActiveToCompleted",

            ActiveToNotActive: "SetActiveToNotActive",
            ActiveToComplete: "SetActiveToCompleted",

            CompleteToNotActive: "SetCompletedToNotActive",
            CompleteToActive: "SetCompletedToActive",
        }
    }

    async StartGame() {
        //this.SendMessage("FadeToBlack", this.TaskStates.AnyToActive);
        await this.#sleep(1);
        //this.SendMessage("FadeToBlack", this.TaskStates.AnyToComplete);
        this.SendMessage("StartGame", this.TaskStates.NotActiveToActive);
        await this.#sleep(1);
        //this.SendMessage("FadeFromBlack", this.TaskStates.AnyToActive);
        await this.#sleep(1);
        this.SendMessage("FadeFromBlack", this.TaskStates.AnyToComplete);

    }

    SendMessage(taskName, targetState) {
        if(!this.portalsSDKActive)
            return;
        
        const message = {
            TaskName: taskName,
            TaskTargetState: targetState
        };
        PortalsSdk.sendMessageToUnity(JSON.stringify(message));

        console.log("Set task: " + taskName + " to " + targetState);
    }

    #sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

}
