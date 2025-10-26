import { AudioManager } from "../../managers/AudioManager";
import { DialogueManager } from "../../managers/DialogueManager";
import { MeshManager } from "../../managers/MeshManager";
import { Utils } from "../../utils/Utils";
import { GameObject } from "../GameObject";
import { Button } from "./Button";


export class PlayerControls extends GameObject {
    Setup(playerMovementController) {
        this.events = new EventTarget();

        this.playerMovementController = playerMovementController;

        this.buttons = new Map();

        this.forwardsButton = this.CreateButton("Forwards Button", playerMovementController.directions.Forward);
        this.forwardsButton.transform.position.set(0, -0.5, 0);

        this.backwardsButton = this.CreateButton("Backwards Button", playerMovementController.directions.Back);
        this.backwardsButton.transform.position.set(0, -0.8, 0);

        this.leftButton = this.CreateButton("Left Button", playerMovementController.directions.Left);
        this.leftButton.transform.position.set(-0.4, -0.65, 0);

        this.rightButton = this.CreateButton("Right Button", playerMovementController.directions.Right);
        this.rightButton.transform.position.set(0.4, -0.65, 0);

        this.rotateLeftButton = this.CreateButton("Rotate Left Button", playerMovementController.directions.RotateLeft);
        this.rotateLeftButton.transform.position.set(-0.8, -0.8, 0);

        this.rotateRightButton = this.CreateButton("Rotate Right Button", playerMovementController.directions.RotateRight);
        this.rotateRightButton.transform.position.set(0.8, -0.8, 0);

        this.HideAll();

        this.handleStateChange = event => this.OnStateChange(event.detail.previousState, event.detail.newState);
        this.playerMovementController.addEventListener("onEnterState", this.handleStateChange);

        this.currentExits = null;
        this.hiddenOverride = false;
    }

    CreateButton(buttonName, moveDirection) {
        var newButton = GameObject.Instantiate(Button, this.transform, buttonName);
        newButton.SetMeshIsForDrawing(false);
        var flipX = false;
        var flipY = false;
        var offsetY = 0;


        switch (moveDirection) {
            case this.playerMovementController.directions.Back:
                flipY = true;
                offsetY = 0.1
                newButton.arrowMesh = MeshManager.instance.models.arrowStraight.clone();
                break;
            case this.playerMovementController.directions.Forward:
                offsetY = -0.1
                newButton.arrowMesh = MeshManager.instance.models.arrowStraight.clone();
                break;
            case this.playerMovementController.directions.Left:
                flipX = true;
            case this.playerMovementController.directions.Right:
                newButton.arrowMesh = MeshManager.instance.models.arrowCurve.clone();
                break;

            case this.playerMovementController.directions.RotateLeft:
                flipX = true;
            case this.playerMovementController.directions.RotateRight:
                newButton.arrowMesh = MeshManager.instance.models.arrowRotate.clone();
                break;
            default:
                break;
        }

        if (flipX) {
            newButton.arrowMesh.rotateY(-Math.PI);
            newButton.arrowMesh.rotateX(Math.PI * 0.25);
        } else {
            newButton.arrowMesh.rotateX(Math.PI * -0.25);
        }
        if (flipY) {
            newButton.arrowMesh.rotateX(-Math.PI);

        }

        newButton.arrowMesh.scale.set(0.6, 0.6, 0.6);
        newButton.arrowMesh.position.y += offsetY;
        //newButton.arrowMesh.position.y -= 0.25;

        newButton.AddComponent(newButton.arrowMesh);


        newButton.material.opacity = 0;

        newButton.direction = moveDirection;
        newButton.SetClickAction(this.playerMovementController.Move.bind(this.playerMovementController, moveDirection));

        const size = 0.3;
        newButton.transform.scale.set(size, size, 0.1);
        newButton.material.color.setHex(0x00ff00);

        this.buttons.set(moveDirection, newButton);
        return newButton;
    }

    ShowButton(direction) {
        if(this.hiddenOverride)
        {
            button.Hide();
            return;
        }

        var button = this.buttons.get(direction);

        if (button != undefined) {
            button.Show();
        }
    }

    HideButton(direction) {
        var button = this.buttons.get(direction);

        if (button != undefined) {
            button.Hide();
        }
    }

    ButtonClicked(button) {
        playerMovementController.Move(button.direction);
    }

    ShowAll() {
        this.buttons.forEach((button, direction) => {
            button.Show();
        });
    }

    HideAll() {
        this.buttons.forEach((button, direction) => {
            button.Hide();
        });
    }

    ShowButtonsForValidExits() {
        if(this.hiddenOverride)
        {
            this.HideAll()
            return;
        }

        if (this.currentExits == null) {
            return;
        }

        this.currentExits.forEach((exit) => {
            this.ShowButton(exit.direction);
        });
    }

    async OnStateChange(previousState, newState) {
        this.HideAll();

        this.currentExits = this.playerMovementController.GetExits(newState);

        //if (import.meta.env.PROD) {
            // Hide controls while moving
            
            const stepInterval = Math.random() * 0.1+0.05;
            const remainingStepInterval = 0.25 - stepInterval;
            await this.#sleep(stepInterval);
            this.PlayFootstep();
            await this.#sleep(remainingStepInterval);
            this.PlayFootstep();


            if (DialogueManager.instance.active)
                return;
        //}

        this.ShowButtonsForValidExits();
    }


    PlayFootstep() {
        AudioManager.instance.playOneShot("footstep" + Math.floor(Utils.instance.RandomBetween(1, 11)), { bus: 'sfx', volume: Utils.instance.RandomBetween(0.4, 0.5), rate: 1, jitter: 0.1 });
    }

    // Utils
    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}