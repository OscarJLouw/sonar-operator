import * as THREE from 'three';
import { MeshManager } from "../../managers/MeshManager";
import { GameObject } from "../GameObject";
import { Button } from "./Button";
import { SceneManager } from '../../managers/SceneManager';
import { AudioManager } from '../../managers/AudioManager';


export class MainMenu extends GameObject {
    Setup(gameManager) {
        this.gameManager = gameManager;
        this.startButton = GameObject.Instantiate(Button, this.transform, "Start Button");
        this.startButton.SetClickAction(this.StartGame.bind(this));    // bind the "this" context to the main menu

        const size = 0.3;
        this.startButton.transform.scale.set(size * 3.38659793814, size, 0.1);
        this.startButton.transform.position.set(0, -0.75, 0);
        this.startButton.material.map = gameManager.meshManager.textures.startButtonTexture;
        this.Hide();


        this.graphicsSettingsGeo = new THREE.PlaneGeometry(1.5, 1.5);
        this.graphicsSettingsTexture = MeshManager.instance.textures.graphicsSettingsPrompt; //new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI * 0.2);
        this.graphicsSettingsMat = new THREE.MeshBasicMaterial({ map: this.graphicsSettingsTexture, transparent: true });
        this.graphicsSettingsMesh = new THREE.Mesh(this.graphicsSettingsGeo, this.graphicsSettingsMat);
        this.graphicsSettingsMesh.position.set(0, 0.2, 0);
        this.AddComponent(this.graphicsSettingsMesh);
    }

    Show() {
        this.startButton.Show();
        this.startButton.SetActive(true);
    }

    StartGame() {
        AudioManager.instance.playOneShot("pingButton", { bus: 'sfx', volume: 0.7, rate: 1, jitter: 0.05 });
        
        this.Hide();
        this.gameManager.StartGame();
    }

    Hide() {
        if (this.graphicsSettingsMesh) {
            this.graphicsSettingsMesh.visible = false;
            this.RemoveComponent(this.graphicsSettingsMesh);
            this.graphicsSettingsMesh = undefined;
        }

        if (this.graphicsSettingsGeo) {
            this.graphicsSettingsGeo.dispose();
        }

        if (this.graphicsSettingsMat) {
            this.graphicsSettingsMat.dispose();
        }

        this.startButton.Hide();
        this.startButton.SetActive(false);
    }
}