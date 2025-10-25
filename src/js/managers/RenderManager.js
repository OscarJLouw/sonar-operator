import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SceneManager } from './SceneManager';

export class RenderManager extends Resizable {
    constructor() {
        super();

        if (!RenderManager.instance) {
            RenderManager.instance = this;
        }
        return RenderManager.instance;
    }

    Setup(sceneManager, addPixelatePass = false, opts = {}) {
        // ----- fixed internal render size -----
        this.targetAspect = SceneManager.instance.targetAspectRatio; // e.g., 16/9
        this.targetHeight = typeof opts.targetHeight === 'number' ? opts.targetHeight : 180;
        this.targetWidth  = Math.round(this.targetHeight * this.targetAspect);

        // ----- renderer -----
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
        this.renderer.shadowMap.enabled = true;

        // Render at a stable internal res (ignore device DPR)
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Backbuffer size (internal)
        this.renderer.setSize(this.targetWidth, this.targetHeight, /*updateStyle*/ false);

        // ----- composer / passes -----
        this.composer = new EffectComposer(this.renderer);

        /*
        this.bloomPass = new UnrealBloomPass(1, 3, 2, 0.9);
        this.composer.addPass(this.bloomPass);
        */

        if (addPixelatePass) {
            this.hasPixelatePass = true;
            const initialPixelSize = typeof opts.pixelSize === 'number' ? opts.pixelSize : 6;
            this.renderPixelatedPass = new RenderPixelatedPass(
                initialPixelSize,
                sceneManager.scene,
                sceneManager.camera
            );
            //this.renderPixelatedPass.depthEdgeStrength = 0;
            this.composer.addPass(this.renderPixelatedPass);
        } else {
            this.renderPass = new RenderPass(sceneManager.scene, sceneManager.camera);
            this.composer.addPass(this.renderPass);
        }



        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        // Composer uses the same fixed internal size
        this.composer.setSize(this.targetWidth, this.targetHeight);

        // keep camera reference (we’ll lock it to target aspect)
        this.camera = sceneManager.camera;

        // First layout pass
        this.Resize(this.width, this.height, this.aspectRatio);

        document.body.appendChild(this.renderer.domElement);
    }

    SetAnimationLoop(loop) {
        this.renderer.setAnimationLoop(loop);
    }

    Render(deltaTime) {
        this.composer.render();
    }

    SetPixellation(pixelSize) {
        if (this.hasPixelatePass && this.renderPixelatedPass) {
            this.renderPixelatedPass.setPixelSize(pixelSize);
        }
    }

    SetInternalResolutionByHeight(newTargetHeight) {
        this.targetHeight = Math.max(1, Math.floor(newTargetHeight));
        this.targetWidth  = Math.round(this.targetHeight * this.targetAspect);

        this.renderer.setPixelRatio(1);
        this.renderer.setSize(this.targetWidth, this.targetHeight, false);
        this.composer.setSize(this.targetWidth, this.targetHeight);

        const canvas = this.renderer.domElement;
        canvas.style.width  = `${this.targetWidth}px`;
        canvas.style.height = `${this.targetHeight}px`;

        if (this.camera && this.camera.isPerspectiveCamera) {
            this.camera.aspect = this.targetAspect;
            this.camera.updateProjectionMatrix();
        }
    }

    Resize(windowWidth, windowHeight /*, windowAspectIgnored */) {
        // Keep internal buffers fixed; only change the CSS display size.
        const targetW = this.targetWidth;
        const targetH = this.targetHeight;

        // Fractional scale to maximize size without cropping, preserving aspect
        const scale = Math.min(windowWidth / targetW, windowHeight / targetH);

        const displayW = targetW * scale;
        const displayH = targetH * scale;

        const canvas = this.renderer.domElement;
        canvas.style.width  = `${displayW}px`;
        canvas.style.height = `${displayH}px`;

        // Lock camera to target aspect (not the window’s)
        if (this.camera && this.camera.isPerspectiveCamera) {
            this.camera.aspect = this.targetAspect;
            this.camera.updateProjectionMatrix();
        }

        // No setSize() here — internal render size stays fixed.
        this.Render(0);
    }
}
