import { GameObject } from "../GameObject";
import { Button } from "./Button";


export class MainMenu extends GameObject {
    Setup(gameManager) {
        this.gameManager = gameManager;
        this.startButton = GameObject.Instantiate(Button, this.transform, "Start Button");
        this.startButton.SetClickAction(this.StartGame.bind(this));    // bind the "this" context to the main menu

        const size = 0.4;
        this.startButton.transform.scale.set(size * 3.38659793814, size, 0.1);
        this.startButton.transform.position.set(0, -0.25, 0);
        this.startButton.material.map = gameManager.meshManager.textures.startButtonTexture;
        this.Hide();
    }

    Show() {
        this.startButton.Show();
        this.startButton.SetActive(true);
    }

    StartGame() {
        this.Hide();
        this.gameManager.StartGame();
    }

    Hide() {
        this.startButton.Hide();
        this.startButton.SetActive(false);
    }
}