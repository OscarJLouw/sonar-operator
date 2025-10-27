import * as THREE from 'three';
import { AudioManager } from './AudioManager';

export class OverlayTextManager {

    Create() {
        this.root = document.createElement('div');
        this.root.className = 'textOverlay';
        this.root.classList.add('unselectable-element');

        this.title = document.createElement('div');
        this.title.className = 'titleOverlay';
        this.title.classList.add('unselectable-element');
        this.title.classList.add('fade-text');
        this.root.appendChild(this.title);

        this.credits = document.createElement('div');
        this.credits.className = 'creditsOverlay';
        this.title.classList.add('unselectable-element');
        this.root.appendChild(this.credits);

        document.body.appendChild(this.root);
    }

    async PlayIntro() {
        // Fade in first text
        this.title.textContent = "At 235 decibels, the ping of active sonar is the loudest sound ever produced by humans."
        this.title.classList.add('show');
        await this.#sleep(2);   // fade in over 2 seconds
        await this.#sleep(5);   // show text for 5 seconds

        // Fade out first text over 3 seconds
        this.title.classList.remove('show');
        this.title.classList.add('hide');
        AudioManager.instance.playOneShot("cinematicRiser", { bus: 'sfx', volume: 0.6, rate: 1 });
        await this.#sleep(3);

        // black for 2 seconds
        await this.#sleep(2);  

        // Fade in second text
        this.title.textContent = "Militaries avoid using it, for fear of what could be listening."
        this.title.classList.remove('hide');
        this.title.classList.add('show');
        await this.#sleep(2);   // fade in over 2 seconds
        await this.#sleep(5);   // show text for 5 seconds

        // Fade out second text over 3 seconds
        this.title.classList.remove('show');
        this.title.classList.add('hide');
        await this.#sleep(3);   // fade out over 3 seconds
        await this.#sleep(1);   // pause before continuing
        this.root.style.display = 'none';
    }

    async PlayCredits() {

    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

}

