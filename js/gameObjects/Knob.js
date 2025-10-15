import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';
import { Draggable } from '../utils/MouseHandler';
import { SceneManager } from '../managers/SceneManager';

export class Knob extends GameObject 
{
    // Life Cycle
    Awake()
    {
        // Variables
        this.mousePositionStart = new THREE.Vector3();
        this.mousePositionCurrent = new THREE.Vector3();
        this.targetDirection = new THREE.Vector3();
        this.currentAngle = 0;
        this.targetAngle = 0;
        this.startRotationOffset = 0;

        this.defaultRotationOffset = -Math.PI*0.5;  // make it face upwards by default

        this.useRelativeRotation = true;
        this.clampRotation = false;
        this.minRotation = 0;
        this.maxRotation = Math.PI*2;

        // Meshes
        this.knobGeometry = new THREE.RingGeometry(0, 0.85, 32);
        this.knobMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(0.4, 0.4, 0.4)});
        this.knobMesh = new THREE.Mesh(this.knobGeometry, this.knobMaterial);
        this.knobMesh.position.set(0, 0, -0.2);
        this.AddComponent(this.knobMesh);

        this.indicatorGeometry = new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI*0.2);
        this.indicatorMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(0.1, 0.8, 0.2)});
        this.indicatorMesh = new THREE.Mesh(this.indicatorGeometry, this.indicatorMaterial);
        this.indicatorMesh.position.set(0, 0, -0.1);
        this.indicatorMesh.rotateZ(-Math.PI*0.1);
        //this.indicatorMesh.rotateZ(Math.PI/2); // set default angle to face upwards
        this.AddComponent(this.indicatorMesh);

        // Interaction components
        this.draggable = new Draggable(this.knobMesh);
        this.handleMouseDown = event => this.OnMouseDown(event.detail.mousePosition);
        this.handleDrag = event => this.OnDrag(event.detail.mousePosition, event.detail.mousePositionLast);
        this.handleMouseUp = event => this.OnMouseUp(event.detail.mousePosition);
    }

    OnEnable()
    {
        this.knobMesh.visible = true;

        this.draggable.addEventListener("onMouseDown", this.handleMouseDown);
        this.draggable.addEventListener("onDrag", this.handleDrag);
        this.draggable.addEventListener("onMouseUp", this.handleMouseUp);
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


    Update(deltaTime)
    {
        let targetAngle = this.targetAngle;
        
        if(this.useRelativeRotation)
        {
            targetAngle += this.startRotationOffset;
        }

        var angleDifference = Utils.instance.GetSignedAngleDifference(this.currentAngle, targetAngle);
        const maxRotateSpeed = 20* deltaTime;

        var angleDelta = Utils.instance.Clamp(angleDifference, -maxRotateSpeed, maxRotateSpeed);

        //this.currentAngle += angleDelta;

        //this.currentAngle += angleDelta;

        if(this.clampRotation)
        {
            this.currentAngle = Utils.instance.ClampAngle(this.currentAngle + angleDelta, this.minRotation, this.maxRotation);
        } else 
        {
            this.currentAngle = this.currentAngle + angleDelta;
        }
        
        //this.currentAngle = Utils.instance.LerpAngle(this.currentAngle, targetAngle, deltaTime * 20);
        //this.SetRotationWithClamp(this.currentAngle);
        this.transform.setRotationFromAxisAngle(Utils.forward, this.currentAngle);

    }

    SetRotationWithClamp(targetAngle)
    {
        let finalAngle = targetAngle;
        
        if(this.clampRotation)
        {
            finalAngle = Utils.instance.ClampAngle(finalAngle, this.minRotation, this.maxRotation);
        }
        
        this.transform.setRotationFromAxisAngle(Utils.forward, finalAngle);

    }

    // Interaction Event Handlers
    OnMouseDown(mousePosition)
    {
        // transform mouse pos to world space and cache
        this.mousePositionStart.copy(mousePosition)
        this.mousePositionStart.unproject(SceneManager.instance.camera);

        this.targetAngle = this.CalculateTargetDirection(this.mousePositionStart);
        //this.currentAngle = this.targetAngle;

        this.startRotationOffset = this.transform.rotation.z - this.targetAngle;
    }

    OnDrag(mousePosition, mousePositionLast)
    {
        // transform mouse pos to world space
        this.mousePositionCurrent.copy(mousePosition);
        this.mousePositionCurrent.unproject(SceneManager.instance.camera);

        this.targetAngle = this.CalculateTargetDirection(this.mousePositionCurrent);

        //this.transform.setRotationFromAxisAngle(Utils.forward, this.targetAngle + this.startRotationOffset);
    }

    OnMouseUp(mousePosition)
    {
        if(this.useRelativeRotation)
        {
            this.targetAngle = this.currentAngle - this.startRotationOffset;
        } else {
            this.targetAngle = this.currentAngle;
        }

        //const worldPos = mousePosition.unproject(SceneManager.instance.camera);
        //this.transform.position.set(worldPos.x, worldPos.y, this.transform.position.z);
    }

    
    // Event dispatchers
    OnAngleUpdated(newAngle)
    {
        const angleUpdatedEvent = new CustomEvent("onAngleUpdated", {
            detail: {
                newAngle
            }
        });
    }

    // Setters
    SetClampRotation(enableClamp, minRotation, maxRotation)
    {
        this.clampRotation = enableClamp;
        this.minRotation = minRotation;
        this.maxRotation = maxRotation;
    }

    SetRelativeRotationControl(useRelativeRotation)
    {
        this.useRelativeRotation = useRelativeRotation;
    }

    // Sets angle from clockwise rotation (threejs's default is counter-clockwise), overriding current user control if necessary
    SetAngle(angle)
    {
        if(this.dragging)
        {
            this.targetAngle = this.CalculateTargetDirection(this.mousePositionCurrent);
            this.startRotationOffset = angle - this.targetAngle;
        }
        
        this.targetAngle = -angle;
        this.transform.setRotationFromAxisAngle(Utils.forward, -angle);
    }

    // Returns angle in terms of clockwise rotation (threejs's default is counter-clockwise)
    GetAngle()
    {
        return -this.transform.rotation.z;
    }

    // Helper functions
    // Calculates the target direction to a given point and returns the angle
    CalculateTargetDirection(targetPoint)
    {
        this.targetDirection.copy(targetPoint);
        this.targetDirection.sub(this.transform.position);
        this.targetDirection.normalize();

        return Math.atan2(this.targetDirection.y, this.targetDirection.x);
    }

}