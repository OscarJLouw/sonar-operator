import * as THREE from 'three';
import { RenderManager } from '../managers/RenderManager';
import { DialogueManager } from '../managers/DialogueManager';

export class MouseHandler {    
    constructor() {
        // Singleton pattern
        if (!MouseHandler.instance) {
            MouseHandler.instance = this;
        }
        return MouseHandler.instance;
    }

    Setup(camera) {
        this.draggables = [];
        this.dragging = false;
        this.draggingObjects = [];
        this.mousePositionLast = new THREE.Vector3()
        this.mousePosition = new THREE.Vector3()
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(0);
        this.camera = camera;

        this.mousePressed = false;

        this.intersectionResults = [];

        window.addEventListener('mousedown', (e) => this.OnMouseDown(e));
        window.addEventListener('mouseup', (e) => this.OnMouseUp(e));
        window.addEventListener('mousemove', (e) => this.OnMouseMove(e));
    }

    AddDraggable(draggable) {
        // Check object is derived from Draggable
        if (!(draggable instanceof Draggable)) {
            console.error("Object " + draggable + " does not inherit from Draggable.");
            return;
        }

        // Check object is not already stored in draggable list
        for (let i = 0; i < this.draggables.length; i++) {
            if (this.draggables[i] === draggable) {
                return;
            }
        }

        this.draggables.push(draggable);
    }
    

    RemoveDraggable(draggable) {
        if (!(draggable instanceof Draggable)) {
            console.error("Object " + draggable + " does not inherit from Draggable.");
            return;
        }

        // Filter out all instances of the object
        this.draggables = this.draggables.filter(d => d !== draggable);
    }

    UpdateMousePosition(mouseEvent)
    {
        // this.renderer must be the same renderer you setSize() on
        const rect = RenderManager.instance.renderer.domElement.getBoundingClientRect();

        const nx = ( (mouseEvent.clientX - rect.left) / rect.width ) * 2 - 1;
        const ny = -( (mouseEvent.clientY - rect.top) / rect.height ) * 2 + 1;

        // Raycaster.setFromCamera uses x,y; z is ignored
        this.mousePositionLast.copy(this.mousePosition);
        this.mousePosition.set(nx, ny, 0.5);

        /*
        this.mousePositionLast = this.mousePosition;

        this.mousePosition.x = ( mouseEvent.clientX / window.innerWidth ) * 2 - 1;
        this.mousePosition.y = -( mouseEvent.clientY / window.innerHeight ) * 2 + 1;
        this.mousePosition.z = -1;
        */

    }

    OnMouseDown(mouseEvent)
    {
        if (DialogueManager.instance.active) return; // block clicks during dialogue

        if(this.mousePressed)
        {
            return;
        }

        this.mousePressed = true;
        this.UpdateMousePosition(mouseEvent);

        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        this.intersectionResults.length = 0;
        this.draggingObjects.length = 0;

        this.draggables.forEach(
            draggable =>
            {
                this.intersectionResults.length = 0;
                const intersections = this.raycaster.intersectObject(draggable.raycastTarget, false, this.intersectionResults);

                if(intersections.length > 0)
                {
                    this.dragging = true;
                    this.draggingObjects.push(draggable);

                    draggable.dragging = true;
                    draggable.OnMouseDown(this.mousePosition);
                }
            }
        );

        //mouseEvent.preventDefault(); // gotta test this...
    }

    OnMouseMove(mouseEvent)
    {
        if (DialogueManager.instance.active) return; // block clicks during dialogue

        this.UpdateMousePosition(mouseEvent);
        if(this.dragging)
        {
            this.draggingObjects.forEach(draggedObject => {
                draggedObject.OnDrag(this.mousePosition, this.mousePositionLast);
            });
        }
    }

    OnMouseUp(mouseEvent)
    {
        if (DialogueManager.instance.active) return; // block clicks during dialogue

        if(!this.mousePressed)
        {
            return;
        }

        this.mousePressed = false;

        this.UpdateMousePosition(mouseEvent);

        if(this.dragging)
        {
            
            this.raycaster.setFromCamera(this.mousePosition, this.camera);


            this.draggingObjects.forEach(releasedObject => {
                this.intersectionResults.length = 0;
                const intersections = this.raycaster.intersectObject(releasedObject.raycastTarget, false, this.intersectionResults);
                if(intersections.length > 0)
                {
                    releasedObject.OnMouseUp(this.mousePosition, true);
                } else {
                    releasedObject.OnMouseUp(this.mousePosition, false);
                }
            });

            this.dragging = false;
            this.draggingObjects.length = 0;
        }

    }
}

export class Draggable extends EventTarget {
    constructor(owner, raycastTarget) {
        super();
        this.owner = owner;
        this.raycastTarget = raycastTarget;
        this.mousePosition = new THREE.Vector3();
        this.mousePositionLast = new THREE.Vector3();
        this.dragging = false;
        MouseHandler.instance.AddDraggable(this);

    }

    OnMouseDown(mousePosition)
    {
        this.dragging = true;
        this.mousePosition.copy(mousePosition);

        const mouseDownEvent = new CustomEvent("onMouseDown", {
            detail: {
                mousePosition: this.mousePosition
            }
        });

        this.dispatchEvent(mouseDownEvent);
    }

    OnDrag(mousePosition, mousePositionLast)
    {
        this.mousePosition.copy(mousePosition);
        this.mousePositionLast.copy(mousePositionLast);

        if(this.dragging)
        {
            const dragEvent = new CustomEvent("onDrag", {
                detail: {
                    mousePosition: this.mousePosition,
                    mousePositionLast: this.mousePositionLast
                }
            });

            this.dispatchEvent(dragEvent);
        }
    }

    OnMouseUp(mousePosition, hovered)
    {
        this.dragging = false;
        this.mousePosition.copy(mousePosition);
        
        const mouseUpEvent = new CustomEvent("onMouseUp", {
            detail: {
                mousePosition: this.mousePosition,
                hovered: hovered
            }
        });

        this.dispatchEvent(mouseUpEvent);
    }

    Cleanup() {
        MouseHandler.instance.RemoveDraggable(this);
    }
}