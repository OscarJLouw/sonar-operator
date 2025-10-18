import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';

export class PortalsController 
{
    constructor() {
        // Singleton pattern
        if (!PortalsController.instance) {
            PortalsController.instance = this;
        }

        return PortalsController.instance;
    }

    Setup()
    {
        
    }
}
