import * as THREE from 'three';

export class MeshManager {
    constructor() {
        // Singleton pattern
        if (!MeshManager.instance) {
            MeshManager.instance = this;
        }

        return MeshManager.instance;
    }

    async Setup()
    {
        const manager = new THREE.LoadingManager();
        manager.onLoad = function () {
            // Your function to execute after all textures are done loading
        };

        this.loader = new THREE.TextureLoader(manager);
        this.CreateSharedGeometry();
        await this.LoadTextures();
        this.CreateSharedMaterials();
    }

    CreateSharedGeometry()
    {
        this.knobGeometry = new THREE.RingGeometry(0, 0.85, 32);
        this.indicatorGeometry = new THREE.RingGeometry(0.6, 0.85, 32, 1, 0, Math.PI * 0.2);
        this.buttonGeometry = new THREE.BoxGeometry(1, 1, 0.1);
    }

    CreateSharedMaterials()
    {
        this.knobMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.4, 0.4, 0.4) });
        this.indicatorMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.8, 0.2) });
        this.buttonMaterial = new THREE.MeshBasicMaterial({transparent: true});//{ color: new THREE.Color(, 0.4, 0.4) });
    }

    async LoadTextures()
    {
        const textureLoader = new THREE.TextureLoader();
        const texturePaths = [
            './textures/StartGameButton.png'
        ];

        const texturePromises = texturePaths.map(path => {
            return new Promise((resolve, reject) => {
                textureLoader.load(path, resolve, undefined, reject);
            });
        });

        try {
            const loadedTextures = await Promise.all(texturePromises);

            this.textures = 
            {
                startButtonTexture: this.SetupTextureProperties(loadedTextures[0]),
            };
        } catch (error) {
            console.error("Error loading textures:", error);
        }
        
    }
    
    SetupTextureProperties(texture)
    {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

}

export const meshManager = new MeshManager();
