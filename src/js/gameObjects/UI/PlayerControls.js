import { GameObject } from "../GameObject";
import { Button } from "./Button";


export class PlayerControls extends GameObject {
    Setup(playerMovementController) {
        this.playerMovementController = playerMovementController;

        this.backwardsButton = this.CreateButton("Backwards Button", playerMovementController.directions.Back);

        this.buttons = 
        [
            this.backwardsButton
        ];

        this.Hide();
    }


    CreateButton(buttonName, moveDirection)
    {
        var newButton = GameObject.Instantiate(Button, this.transform, buttonName);
        newButton.SetClickAction(this.playerMovementController.Move.bind(null, moveDirection));

        const size = 0.4;
        newButton.transform.scale.set(size * 3.38659793814, size, 0.1);
        newButton.transform.position.set(0, -0.5, 0);
        newButton.material.color.setHex(0x00ff00);

        return newButton;
    }


    ShowForwardButton(visible) {

    }

    ShowBackButton(visible) {

    }

    ShowLeftButton(visible) {

    }

    ShowRightButton(visible) {

    }

    ShowRotateLeftButton(visible) {

    }

    ShowRotateRightButton(visible) {

    }

    ButtonClicked(button)
    {
        playerMovementController.Move(button.direction);
    }

    Show() {
    }

    Hide() {
        this.buttons.forEach(button => {
            button.Hide();
        });
    }
}