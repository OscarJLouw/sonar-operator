import * as THREE from 'three';

export class MouseHandler {
    constructor(camera) {
        // Singleton pattern
        if (!MouseHandler.instance) {
            MouseHandler.instance = this;

            this.Setup(camera);
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
        this.draggables = this.draggables.filter(function(draggable) {
            return draggable !== value;
        })
    }

    UpdateMousePosition(mouseEvent)
    {
        this.mousePositionLast = this.mousePosition;

        this.mousePosition.x = ( mouseEvent.clientX / window.innerWidth ) * 2 - 1;
        this.mousePosition.y = -( mouseEvent.clientY / window.innerHeight ) * 2 + 1;
        this.mousePosition.z = -1;
    }

    OnMouseDown(mouseEvent)
    {
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
                const intersections = this.raycaster.intersectObject(draggable.targetObject, true, this.intersectionResults);

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
        if(!this.mousePressed)
        {
            return;
        }

        this.mousePressed = false;

        this.UpdateMousePosition(mouseEvent);

        if(this.dragging)
        {
            this.draggingObjects.forEach(releasedObject => {
                releasedObject.OnMouseUp(this.mousePosition);
            });

            this.dragging = false;
            this.draggingObjects.length = 0;
        }

    }
}

export class Draggable extends EventTarget {
    constructor(targetObject) {
        super();
        this.targetObject = targetObject;
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

    OnMouseUp(mousePosition)
    {
        this.dragging = false;
        this.mousePosition.copy(mousePosition);

        const mouseUpEvent = new CustomEvent("onMouseUp", {
            detail: {
                mousePosition: this.mousePosition
            }
        });

        this.dispatchEvent(mouseUpEvent);
    }

    Cleanup() {
        MouseHandler.instance.RemoveDraggable(this);
    }
}