import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Draggable } from '../../utils/MouseHandler';
import { MeshManager } from '../../managers/MeshManager';

export class Button extends GameObject {
    constructor(parent, name = "") {
        super(parent, name);
    }

    Awake() {
        this.events = new EventTarget();
        this.visible = true;
        this.active = true;
        this.clickCallback = null;

        this.geometry = MeshManager.instance.buttonGeometry; //new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI * 0.2);
        this.material = MeshManager.instance.buttonMaterial; //new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.8, 0.2) });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 1);
        this.AddComponent(this.mesh);

        this.draggable = new Draggable(this, this.mesh);
        this.handleMouseUp = event => this.OnMouseUp(event.detail.mousePosition, event.detail.hovered);
    }

    SetClickAction(callback) {
        this.clickCallback = callback;
    }

    OnEnable() {
        this.Show();
    }

    OnDisable() {
        this.Hide();
    }

    Show() {
        this.visible = true;
        this.mesh.visible = true;

        if (this.active) {
            this.ActivateEvents();
        }
    }

    Hide() {
        this.visible = false;
        this.mesh.visible = false;

        this.DisableEvents();
    }

    SetActive(active) {
        this.active = active;
        if (this.active) {
            this.ActivateEvents();
        } else {
            this.DisableEvents();
        }
    }


    OnMouseUp(mousePosition, hovered) {
        if(hovered)
        {
            this.OnClick();
        }
    }

    OnClick() {
        if (this.active && this.clickCallback) {
            this.clickCallback();
        }
    }

    ActivateEvents() {
        this.draggable.removeEventListener("onMouseUp", this.handleMouseUp);
        this.draggable.addEventListener("onMouseUp", this.handleMouseUp);
    }

    DisableEvents() {
        this.draggable.removeEventListener("onMouseUp", this.handleMouseUp);
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}