import * as THREE from 'three';
import { Resizable } from '../utils/ResizeHandler';


import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


export class RenderManager extends Resizable {
    constructor(sceneManager, addPixelatePass = false) {
        super();

        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio( Math.min(window.devicePixelRatio, 3) );
        
        this.composer = new EffectComposer(this.renderer);

        if(addPixelatePass)
        {
            this.hasPixelatePass = true;
            this.renderPixelatedPass = new RenderPixelatedPass(6, sceneManager.scene, sceneManager.camera);
            this.composer.addPass(this.renderPixelatedPass);
        } else {
            this.renderPass = new RenderPass( sceneManager.scene, sceneManager.camera );
            this.composer.addPass(this.renderPass);
        }

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        this.Resize(this.width, this.height, this.aspectRatio);
        document.body.appendChild(this.renderer.domElement);
    }

    SetAnimationLoop(loop) {
        this.renderer.setAnimationLoop(loop);
    }

    Render(deltaTime)
    {
        this.composer.render();
    }

    SetPixellation(pixelSize)
    {
        if(this.hasPixelatePass)
        {
            this.renderPixelatedPass.setPixelSize(pixelSize);
        }
    }

    Resize(width, height, aspectRatio)
    {
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
        this.Render(0);
    }
}