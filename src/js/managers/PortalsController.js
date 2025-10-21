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

    StartGame() {
        this.SendMessage("StartGame", this.TaskStates.NotActiveToActive);
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
}
