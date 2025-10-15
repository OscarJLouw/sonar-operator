import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameManager } from '../managers/GameManager';
import { Draggable } from '../utils/MouseHandler';
import { SceneManager } from '../managers/SceneManager';

export class Knob extends GameObject {

    Awake()
    {
        // Variables
        this.mousePositionStart = new THREE.Vector3();
        this.mousePositionCurrent = new THREE.Vector3();
        this.targetDirection = new THREE.Vector3();
        this.forward = new THREE.Vector3(0,0,1);

        this.knobGeometry = new THREE.RingGeometry(0, 0.85, 32);
        this.knobMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(0.4, 0.4, 0.4)});
        this.knobMesh = new THREE.Mesh(this.knobGeometry, this.knobMaterial);
        this.knobMesh.position.set(0, 0, -0.2);
        this.AddComponent(this.knobMesh);

        this.indicatorGeometry = new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI*0.2);
        this.indicatorMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(0.1, 0.8, 0.2)});
        this.indicatorMesh = new THREE.Mesh(this.indicatorGeometry, this.indicatorMaterial);
        this.indicatorMesh.position.set(0, 0, -0.1);
        this.AddComponent(this.indicatorMesh);

        this.draggable = new Draggable(this.knobMesh);
        this.handleMouseDown = event => this.OnMouseDown(event.detail.mousePosition);
        this.handleDrag = event => this.OnDrag(event.detail.mousePosition, event.detail.mousePositionLast);
        this.handleMouseUp = event => this.OnMouseUp(event.detail.mousePosition);
    }

    Start()
    {
    }

    OnEnable()
    {
        this.knobMesh.visible = true;

        this.draggable.addEventListener("onMouseDown", this.handleMouseDown);
        this.draggable.addEventListener("onDrag", this.handleDrag);
        this.draggable.addEventListener("onMouseUp", this.handleMouseUp);
    }

    OnMouseDown(mousePosition)
    {
        this.mousePositionStart.copy(mousePosition)
        this.mousePositionStart.unproject(SceneManager.instance.camera);

        this.targetDirection.copy(this.mousePositionStart);
        this.targetDirection.sub(this.transform.position);
        this.targetDirection.normalize();

        const targetAngle = Math.atan2(this.targetDirection.y, this.targetDirection.x);

        this.startRotationOffset = this.transform.rotation.z - targetAngle;

        console.log(this.transform.rotation.z + " - " + targetAngle + " = " + this.startRotationOffset);
    }

    OnDrag(mousePosition, mousePositionLast)
    {
        this.mousePositionCurrent.copy(mousePosition);
        this.mousePositionCurrent.unproject(SceneManager.instance.camera);

        this.targetDirection.copy(this.mousePositionCurrent);
        this.targetDirection.sub(this.transform.position);
        this.targetDirection.normalize();

        const targetAngle = Math.atan2(this.targetDirection.y, this.targetDirection.x);
        this.transform.setRotationFromAxisAngle(this.forward, targetAngle + this.startRotationOffset);
        
    }

    OnMouseUp(mousePosition)
    {
        //const worldPos = mousePosition.unproject(SceneManager.instance.camera);
        //this.transform.position.set(worldPos.x, worldPos.y, this.transform.position.z);
    }

    Update(deltaTime)
    {
    }

    OnDisable()
    {
        this.knobMesh.visible = false;

        this.draggable.removeEventListener("onMouseDown", this.handleMouseDown);
        this.draggable.removeEventListener("onDrag", this.handleDrag);
        this.draggable.removeEventListener("onMouseUp", this.handleMouseUp);
    }

    OnDestroy()
    {
        if(this.knobGeometry) this.knobGeometry.dispose();

        if(this.knobMaterial){
            if(this.knobMaterial.map)
            {
                this.knobMaterial.map.dispose();
            }

            this.knobMaterial.dispose();
        }
        
        if(this.knobMesh) this.RemoveComponent(this.knobMesh);

        this.knobMesh = undefined;
    }
}