import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export class MeshManager {
    constructor() {
        // Singleton pattern
        if (!MeshManager.instance) {
            MeshManager.instance = this;
        }

        return MeshManager.instance;
    }

    async Setup() {
        const manager = new THREE.LoadingManager();
        manager.onLoad = function () {
            // Executes after all textures are done loading
        };

        this.textureLoader = new THREE.TextureLoader(manager);
        this.gltfLoader = new GLTFLoader(manager);

        this.CreateSharedGeometry();
        await this.LoadTextures();
        this.CreateSharedMaterials();
        await this.LoadModels();
        console.log("Finished loading models");
    }

    CreateSharedGeometry() {
        this.knobGeometry = new THREE.RingGeometry(0, 0.85, 16);
        this.indicatorGeometry = new THREE.RingGeometry(0.6, 0.85, 16, 1, 0, Math.PI * 0.2);
        this.buttonGeometry = new THREE.BoxGeometry(1, 1, 0.1);
    }

    CreateSharedMaterials() {
        this.knobMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.4, 0.4, 0.4) });
        this.indicatorMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.8, 0.2) });
        this.buttonMaterial = new THREE.MeshBasicMaterial({ transparent: true });//{ color: new THREE.Color(, 0.4, 0.4) });
    }

    async LoadTextures() {
        const textureLoader = this.textureLoader;
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
                startButtonTexture: this.SetupColorTexture(loadedTextures[0]),
            };
        } catch (error) {
            console.error("Error loading textures:", error);
        }

    }

    SetupColorTexture(texture) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipMaps = false;
        texture.anisotropy = 1;
        texture.needsUpdate = true;
        return texture;
    }

    SetupDataTexture(texture) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 1;
        texture.needsUpdate = true;
        return texture;
    }

    async LoadModels() {
        console.log("loading models");
        const modelLoader = this.gltfLoader;
        const modelPaths = [
            './models/BasePlateFull.glb',
            './models/BasePlateHalf.glb',
            './models/Knob.glb',
            './models/KnobWithIndicator.glb'
        ];

        const modelPromises = modelPaths.map(path => {
            return new Promise((resolve, reject) => {
                modelLoader.load(path, data => resolve(data), undefined, reject);
            });
        });

        try {
            const loadedModels = await Promise.all(modelPromises);

            this.models =
            {
                basePlateFull: this.SetupModelProperties(loadedModels[0]),
                basePlateHalf: this.SetupModelProperties(loadedModels[1]),
                knob: this.SetupModelProperties(loadedModels[2]),
                knobWithIndicator: this.SetupModelProperties(loadedModels[3]),
            };
        } catch (error) {
            console.error("Error loading models:", error);
        }
    }

    SetupModelProperties(model) {
        model.scene.traverse((node) => {
            if (!node.isMesh) return;

            const materials = Array.isArray(node.material) ? node.material : [node.material];

            for (const mat of materials) {
                if (!mat) continue;

                // Color textures
                if (mat.map) this.SetupColorTexture(mat.map);
                if (mat.emissiveMap) this.SetupColorTexture(mat.emissiveMap);

                // Data textures
                if(mat.normalMap) this.SetupDataTexture(mat.normalMap);
                if(mat.roughnessMap) this.SetupDataTexture(mat.roughnessMap);
                if(mat.metalnessMap) this.SetupDataTexture(mat.metalnessMap);
                if(mat.aoMap) this.SetupDataTexture(mat.aoMap);
                if(mat.displacementMap) this.SetupDataTexture(mat.displacementMap);
                if(mat.bumpMap) this.SetupDataTexture(mat.bumpMap);
                if(mat.alphaMap) this.SetupDataTexture(mat.alphaMap);

                mat.needsUpdate = true;
            }

            node.castShadow = true;
        });

        return model;
    }
}

export const meshManager = new MeshManager();
