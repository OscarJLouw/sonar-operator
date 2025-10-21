import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';
import { Draggable } from '../utils/MouseHandler';
import { SceneManager } from '../managers/SceneManager';
import { MeshManager } from '../managers/MeshManager';

export class Knob extends GameObject {
    constructor(parent, name = "", withIndicator = false, showBasePlate = false, halfBasePlate = false)
    {
        super(parent, name);
        this.withIndicator = withIndicator;
        this.showBasePlate = showBasePlate;
        this.halfBasePlate = halfBasePlate;
    }

    // Life Cycle
    Awake() {
        this.events = new EventTarget();

        // Variables
        this.mousePositionStart = new THREE.Vector3();
        this.mousePositionCurrent = new THREE.Vector3();
        this.targetDirection = new THREE.Vector3();
        this.currentAngle = 0;
        this.targetAngle = 0;
        this.startRotationOffset = 0;

        this.defaultRotationOffset = -Math.PI * 0.5;  // make it face upwards by default

        this.useRelativeRotation = true;
        this.clampRotation = false;
        this.minRotation = 0;
        this.maxRotation = Math.PI * 2;

        // Meshes
        this.knobColliderGeometry = MeshManager.instance.knobColliderGeometry; //new THREE.RingGeometry(0, 0.85, 32);
        this.knobColliderMaterial = MeshManager.instance.knobMaterial; //new THREE.MeshStandardMaterial({ color: new THREE.Color(0.4, 0.4, 0.4) });
        this.knobColliderMesh = new THREE.Mesh(this.knobColliderGeometry, this.knobColliderMaterial);
        this.knobColliderMesh.position.set(0, 0, -0.2);
        this.knobColliderMesh.scale.set(2.5, 2.5, 2.5);
        this.AddComponent(this.knobColliderMesh);

        //const knobVisuals = MeshManager.instance.models.knob;
        if(this.withIndicator)
        {
            this.knob = MeshManager.instance.models.knobWithIndicator.scene.clone();
        } else {
            this.knob = MeshManager.instance.models.knob.scene.clone();
        }

        this.knob.scale.set(0.8, 0.8, 0.8);
        this.knob.layers.set(1);
        this.knob.rotation.x = Math.PI*0.5;
        this.AddComponent(this.knob);
        
        this.camera = SceneManager.instance.camera;
        this.cameraForward = new THREE.Vector3();
        this.camera.getWorldDirection(this.cameraForward);
        
        /*
        this.indicatorGeometry = MeshManager.instance.indicatorGeometry; //new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI * 0.2);
        this.indicatorMaterial = MeshManager.instance.indicatorMaterial; //new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.8, 0.2) });
        this.indicatorMesh = new THREE.Mesh(this.indicatorGeometry, this.indicatorMaterial);
        this.indicatorMesh.position.set(0, 0, -0.1);
        this.indicatorMesh.rotateZ(-Math.PI * 0.1);
        */

        //this.AddComponent(this.indicatorMesh);

        // Interaction components
        this.draggable = new Draggable(this, this.knobColliderMesh);
        this.handleMouseDown = event => this.OnMouseDown(event.detail.mousePosition);
        this.handleDrag = event => this.OnDrag(event.detail.mousePosition, event.detail.mousePositionLast);
        this.handleMouseUp = event => this.OnMouseUp(event.detail.mousePosition);
    }

    OnEnable() {
        this.knobColliderMesh.visible = true;
        this.knobColliderMesh.layers.set(0);

        //this.indicatorMesh.visible = true;
        //this.indicatorMesh.layers.set(0);
        
        this.knob.visible = true;

        this.draggable.addEventListener("onMouseDown", this.handleMouseDown);
        this.draggable.addEventListener("onDrag", this.handleDrag);
        this.draggable.addEventListener("onMouseUp", this.handleMouseUp);
    }

    OnDisable() {
        this.knobColliderMesh.visible = false;
        this.knobColliderMesh.layers.set(1); // move to hidden layer, ignoring raycasts

        //this.indicatorMesh.visible = false;
        //this.indicatorMesh.layers.set(1);

        this.knob.visible = true;
        
        this.draggable.removeEventListener("onMouseDown", this.handleMouseDown);
        this.draggable.removeEventListener("onDrag", this.handleDrag);
        this.draggable.removeEventListener("onMouseUp", this.handleMouseUp);
    }

    OnDestroy() {
        if (this.knobColliderGeometry) this.knobColliderGeometry.dispose();

        if (this.knobColliderMaterial) {
            if (this.knobColliderMaterial.map) {
                this.knobColliderMaterial.map.dispose();
            }

            this.knobColliderMaterial.dispose();
        }

        if (this.knobColliderMesh) this.RemoveComponent(this.knobColliderMesh);

        this.knobColliderMesh = undefined;
    }


    Update(deltaTime) {
        let targetAngle = this.targetAngle;

        if (this.useRelativeRotation) {
            // Offset based off the grab point rather than just aiming directly towards mouse
            targetAngle += this.startRotationOffset;
        }

        // Smoothly rotate
        var angleDifference = Utils.instance.GetSignedAngleDifference(this.currentAngle, targetAngle);
        const maxRotateSpeed = 20 * deltaTime;
        var angleDelta = Utils.instance.Clamp(angleDifference, -maxRotateSpeed, maxRotateSpeed);

        if (Math.abs(angleDelta) > 0) {
            this.SetCurrentAngle(this.currentAngle + angleDelta);
        }
    }


    SetCurrentAngle(angle) {

        // Clamp the angle if necessary
        if (this.clampRotation) {
            this.currentAngle = Utils.instance.ClampAngle(angle, this.minRotation, this.maxRotation);
            this.percentage = Utils.instance.AngleToPercent(angle, this.minRotation, this.maxRotation);
        } else {
            this.currentAngle = angle;
            this.percentage = Utils.instance.AngleToPercent(angle, 0, Math.PI * 2);
        }

        this.transform.setRotationFromAxisAngle(Utils.forward, this.currentAngle);

        this.dispatchEvent(new CustomEvent("knobAngleChanged",
            {
                detail: {
                    angle: this.currentAngle,
                    percentage: this.percentage
                }
            }
        ));
    }

    // Interaction Event Handlers
    OnMouseDown(mousePosition) {
        // transform mouse pos to world space and cache
        this.mousePositionStart.copy(mousePosition)
        this.mousePositionStart.unproject(this.camera);

        this.targetAngle = this.CalculateTargetDirection(this.mousePositionStart);
        //this.currentAngle = this.targetAngle;

        this.startRotationOffset = this.transform.rotation.z - this.targetAngle;
    }

    OnDrag(mousePosition, mousePositionLast) {
        // transform mouse pos to world space
        this.mousePositionCurrent.copy(mousePosition);
        this.mousePositionCurrent.unproject(this.camera);

        this.targetAngle = this.CalculateTargetDirection(this.mousePositionCurrent);

        //this.transform.setRotationFromAxisAngle(Utils.forward, this.targetAngle + this.startRotationOffset);
    }

    OnMouseUp(mousePosition, hovered) {
        if (this.useRelativeRotation) {
            this.targetAngle = this.currentAngle - this.startRotationOffset;
        } else {
            this.targetAngle = this.currentAngle;
        }

        //const worldPos = mousePosition.unproject(SceneManager.instance.camera);
        //this.transform.position.set(worldPos.x, worldPos.y, this.transform.position.z);
    }



    // Setters
    SetClampRotation(enableClamp, minRotation, maxRotation) {
        this.clampRotation = enableClamp;
        this.minRotation = minRotation;
        this.maxRotation = maxRotation;
    }

    SetRelativeRotationControl(useRelativeRotation) {
        this.useRelativeRotation = useRelativeRotation;
    }

    // Sets angle from clockwise rotation (threejs's default is counter-clockwise), overriding current user control if necessary
    // Needs testing
    SetAngle(angle) {
        if (this.dragging) {
            this.targetAngle = this.CalculateTargetDirection(this.mousePositionCurrent);
            this.startRotationOffset = angle - this.targetAngle;
        }

        this.targetAngle = -angle;
        this.transform.setRotationFromAxisAngle(Utils.forward, -angle);
    }

    SetPercentage(percentage)
    {
        if (this.clampRotation) {
            let targetAngle = Utils.instance.PercentToAngle(1 - percentage, this.minRotation, this.maxRotation);
            this.SetAngle(-targetAngle);
        } else {
            let targetAngle = Utils.instance.PercentToAngle(1 - percentage, 0, Math.PI * 2);
            this.SetAngle(-targetAngle);
        }
    }

    // Returns angle in terms of clockwise rotation (threejs's default is counter-clockwise)
    GetAngle() {
        return -this.transform.rotation.z;
    }

    // Helper functions
    // Calculates the target direction to a given point and returns the angle
    CalculateTargetDirection(targetPoint) {
        this.targetDirection.copy(targetPoint);
        this.targetDirection.sub(this.transform.position);
        this.targetDirection.normalize();

        return Math.atan2(this.targetDirection.y, this.targetDirection.x);
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}