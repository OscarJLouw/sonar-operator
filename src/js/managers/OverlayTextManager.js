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
        this.credits.classList.add('unselectable-element');
        this.root.appendChild(this.credits);

        document.body.appendChild(this.root);
    }

    async PlayIntro() {
        // Fade in first text
        this.root.style.display = 'flex';
        this.title.style.display = 'flex';

        // Timings (seconds)
        const startPause = 3.0; // pause at the end
        const fadeIn = 2.0;
        const hold = 5.0;
        const fadeOut = 3.0;
        const blackFor = 2.0; // black screen between lines
        const endPause = 2.0; // pause at the end

        const t = this.title;
        // Ensure we're starting from the base "hidden" state
        t.classList.remove('show');

        const showLine = async (text) => {
            t.textContent = text;

            // Fade IN
            t.style.setProperty('--fade-duration', `${fadeIn}s`);
            t.getBoundingClientRect();           // force reflow so opacity:0 is applied
            t.classList.add('show');             // go to opacity:1
            await this.#sleep(fadeIn + 0.05);    // wait for full transition

            // Hold visible
            await this.#sleep(hold);
        };

        const hideLine = async () => {
            // Fade OUT (remove .show → back to base opacity:0)
            t.style.setProperty('--fade-duration', `${fadeOut}s`);
            t.classList.remove('show');
            await this.#sleep(fadeOut + 0.05);   // wait for full transition
        };

        await this.#sleep(startPause);

        AudioManager.instance.playOneShot("echoCymbal", { bus: 'sfx', volume: 0.1, rate: 1 });

        // ---- Line 1 ----
        await showLine("At 235 decibels, the ping of active sonar is the loudest sound ever produced by humans.");

        // Start riser as we begin the fade-out (like your original)
        await hideLine();
        AudioManager.instance.playOneShot("cinematicRiser", { bus: 'sfx', volume: 0.6, rate: 1 });

        // Black screen
        await this.#sleep(blackFor);

        // ---- Line 2 ----
        await showLine("Military vessels avoid it in favour of passive sonar, for fear of what could be listening.");
        await hideLine();

        // Small pause then hide the whole overlay until credits
        await this.#sleep(endPause);
        this.root.style.display = 'none';
        this.title.style.display = 'none';
    }


    async PlayCredits() {
    this.root.style.display = 'flex';
    this.credits.style.display = 'flex';

    await this.FadeCreditsText(
        "A game by",
        "Oscar Louw");

    await this.FadeCreditsText(
        "Written by",
        "Hans Frederik Jacobsen");

    await this.FadeCreditsText(
        "Special thanks",
        { name: "@miroweb3", subtitle: "for the ocean waves animation" });

    await this.FadeCreditsText(
        "Thank you for the help",
        { name: "@.bus." },
        { name: "@.beerftw" },
        { name: "@tatltael" },
        { name: "@ntz.sol" },
        { name: "@amongface" },
        { subtitle: "and countless others on the Portals Discord" });

    await this.FadeCreditsText(
        "PBR Textures From:",
        { name: "Yughues/Nobiax", license: "CC-BY and CC0 1.0 Universal", url: "opengameart.org/users/yughues" },
        { name: "rubberduck ", license: "CC-BY 3.0", url: "opengameart.org/users/rubberduck" },
        { name: "3dtextures.me ", license: "CC0 1.0 Universal", url: "3dtextures.me" },
        { name: "ambientcg.com ", license: "CC0 1.0 Universal", url: "ambientcg.com" },
        { name: "cc0textures.com ", license: "CC0 1.0 Universal", url: "cc0textures.com" },
        { name: "texturecan.com ", license: "CC0 1.0 Universal", url: "texturecan.com" },
        { name: "freepbr.com ", license: "License required for commercial use", url: "freepbr.com" },
    );

    await this.FadeCreditsText(
        "Models:",
        { name: "Captain_Ahab_62", subtitle: "HMAS Darling", license: "CC0 1.0 Universal", url: "https://opengameart.org/content/hmas-darling" },
    );

    await this.FadeCreditsText(
        "Sound effects:",
        { name: "Audios_With_Love", subtitle: "Ambience Sounds Vol 1", license: "GameDevMarket pro license", url: " https://www.gamedevmarket.net/asset/ambiences-sounds-vol-1" },
        { name: "StormwaveAudio", subtitle: "Underwater Ambient Sounds Effects Pack ", license: "GameDevMarket pro license", url: " https://www.gamedevmarket.net/asset/ambiences-sounds-vol-1" },
        { name: "AudibleDread ", subtitle: "Horror Collection Vol 1 & PSX Horror Audio", license: "GameDevMarket pro license", url: "https://audible-dread.itch.io/" },
        { name: "PizzaDoggy", subtitle: "Echoes Audio Super Kit", license: "Pizza Doggy's Game Assets License Agreement", url: "https://pizzadoggy.itch.io/echoes-audio-super-kit" },
        { name: "SingularitysMarauder", subtitle: "Alien planet underwater ", license: "Pixabay content license", url: "https://pixabay.com/sound-effects/alien-planet-underwater-199375" }
    );

    await this.FadeCreditsText(
        "Underwater / sonar recordings:",
        { name: "MBARI_MARS", subtitle: "Blue Whale B call @ 5X ", license: "Attribution 4.0", url: "https://freesound.org/s/343682/" },
        { name: "MBARI_MARS", subtitle: "MBARI_MARS_2017_1107h22_HumpbackWhaleSongSession", license: "Attribution 4.0", url: "https://freesound.org/s/496438/" },
        { name: "SanctSound", subtitle: "Several underwater recordings", license: "CC0 1.0 Universal", url: "https://sanctsound.ioos.us/sounds.html" },
        { name: "craigsmith", subtitle: "G45-20-Submarine Motor Underwater", license: "CC0", url: "https://freesound.org/s/438722/" },
        { name: "NOAA Passive Acoustics Group", subtitle: "Vess-05-large-vessel-clip and Oror-Multisound-AWI-Van-Opzeeland-01-killer-clip", license: "CC-BY", url: "https://www.fisheries.noaa.gov/national/science-data/sounds-ocean" },

    );

    await this.FadeCreditsText(
        "Thank you for playing!",
        { name: "", subtitle: "If you enjoyed this, please check out my other games at", url: "gormlessgames.itch.io", fadeOut: false },
    );

    await this.#sleep(20);
    this.credits.style.display = 'none';
    this.root.style.display = 'none';
}

    async FadeCreditsText(headerText, ...items) {
    // durations (seconds) — match these to what you want to see
    const fadeIn = 1.0;
    const hold = 4;
    const fadeOut = 1.0;

    // clear previous section
    this.credits.innerHTML = '';

    // build container
    const section = document.createElement('div');
    section.className = 'credits-section fade-text';
    section.classList.add('unselectable-element');
    // set initial transition duration (for fade-in)
    section.style.setProperty('--fade-duration', `${fadeIn}s`);
    this.credits.appendChild(section);

    // header
    if (headerText) {
        const header = document.createElement('div');
        header.className = 'credits-header';
        header.textContent = headerText;
        section.appendChild(header);
    }

    // normalize entries (strings → {name})
    const normalized = items.map(it => (typeof it === 'string' ? { name: it } : (it || {})));

    // render entries
    for (const entry of normalized) {
        const row = document.createElement('div');
        row.className = 'credit-item';

        if (entry.name) {
            const name = document.createElement('div');
            name.className = 'credit-name';
            name.textContent = entry.name;
            row.appendChild(name);
        }

        if (entry.subtitle) {
            const subtitle = document.createElement('div');
            subtitle.className = 'credit-subtitle';
            subtitle.textContent = entry.subtitle;
            row.appendChild(subtitle);
        }

        if (entry.license || entry.url) {
            const meta = document.createElement('div');
            meta.className = 'credit-meta';

            if (entry.license) {
                const lic = document.createElement('span');
                lic.className = 'credit-license';
                lic.textContent = entry.license;
                meta.appendChild(lic);
            }

            if (entry.url) {
                if (entry.license) {
                    const sep = document.createElement('span');
                    sep.textContent = '  •  ';
                    meta.appendChild(sep);
                }
                const link = document.createElement('a');
                link.className = 'credit-link';
                link.href = entry.url.startsWith('http') ? entry.url : `https://${entry.url}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = entry.url.replace(/^https?:\/\//, '');
                meta.appendChild(link);
            }

            row.appendChild(meta);
        }

        if (!entry.name && entry.subtitle && !entry.license && !entry.url) {
            row.classList.add('credit-item--subtitle-only');
        }

        section.appendChild(row);
    }

    // should this section remain on screen?
    const explicitNoFade = normalized.some(e => e && e.fadeOut === false);
    const shouldFadeOut = !explicitNoFade;

    // ---- fade IN ----
    // Force the browser to apply the initial opacity:0 before we add .show
    section.getBoundingClientRect(); // reflow
    section.classList.add('show');
    await this.#sleep(fadeIn + 0.05); // tiny buffer

    // hold visible
    await this.#sleep(hold);

    // ---- fade OUT ----
    if (shouldFadeOut) {
        // change the transition duration for the fade-out
        section.style.setProperty('--fade-duration', `${fadeOut}s`);
        section.classList.remove('show'); // returns to base opacity:0
        await this.#sleep(fadeOut + 0.05); // wait for full transition
        this.credits.innerHTML = '';
    }
}

#sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}

