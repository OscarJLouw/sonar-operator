import * as THREE from 'three';
import { GameManager } from '../managers/GameManager';

export class GameObject
{
    constructor(parent, name = "") 
    {
        this.name = name;
        this.parent = parent;
        this.transform = new THREE.Group();
        this.id = this.transform.id;

        this.parent.add(this.transform);

        this.components = [];
        this.enabled = false;

        GameManager.instance.RegisterGameObject(this);

        this.Awake();
        this.SetActive(true);
        this.Start();
    }

    // Abstract lifecycle functions. Can be overridden by implementing in derived classes. Called by the GameManager as per the object lifecycle.
    Awake(){}
    OnEnable(){}
    Start(){}
    Update(deltaTime){}
    OnDisable(){}
    OnDestroy(){}

    // Public API (don't override these)
    Destroy()
    {
        this.parent.remove(this);
        GameManager.instance.DestroyGameObject(this);
    }

    SetActive(active)
    {
        if(active && !this.enabled)
        {
            this.OnEnable();
        } else if(!active && this.enabled)
        {
            this.OnDisable();
        }

        this.enabled = active;
    }

    AddComponent(component)
    {
        this.components.push(component);
        this.transform.add(component);
        
    }

    RemoveComponent(component)
    {
        this.transform.remove(component);
    }
}