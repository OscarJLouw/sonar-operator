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
        
        await this.#sleep(2);

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
        this.title.textContent = "Militaries vessels avoid using it, for fear of what could be listening."
        this.title.classList.remove('hide');
        this.title.classList.add('show');
        await this.#sleep(2);   // fade in over 2 seconds
        await this.#sleep(5);   // show text for 5 seconds

        // Fade out second text over 3 seconds
        this.title.classList.remove('show');
        this.title.classList.add('hide');
        await this.#sleep(3);   // fade out over 3 seconds
        await this.#sleep(1);   // pause before continuing
        this.title.style.display = 'none';
        this.root.style.display = 'none';
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
        // timings (seconds)
        const fadeIn = 1.5;
        const hold = 2.5;
        const fadeOut = 1.2;

        // ensure overlay root is visible (PlayIntro hides it at the end)

        // clear previous content
        this.credits.innerHTML = '';

        // build a section container that will fade
        const section = document.createElement('div');
        section.className = 'credits-section fade-text';
        section.classList.add('unselectable-element'); // keep text unselectable
        this.credits.appendChild(section);

        // header (small)
        if (headerText) {
            const header = document.createElement('div');
            header.className = 'credits-header';
            header.textContent = headerText;
            section.appendChild(header);
        }

        // normalize entries: allow strings or objects
        const normalized = items.map(it => {
            if (typeof it === 'string') return { name: it };
            return it || {};
        });

        // render each entry
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

            // If an entry has only a subtitle (like your “and countless others…” line)
            if (!entry.name && entry.subtitle && !entry.license && !entry.url) {
                row.classList.add('credit-item--subtitle-only');
            }

            section.appendChild(row);
        }

        // determine if this section should fade out (default true)
        const explicitNoFade = normalized.some(e => e && e.fadeOut === false);
        const shouldFadeOut = !explicitNoFade;

        // fade in
        section.classList.add('show');
        await this.#sleep(fadeIn);

        // hold
        await this.#sleep(hold);

        // fade out (optional)
        if (shouldFadeOut) {
            section.classList.remove('show');
            section.classList.add('hide');
            await this.#sleep(fadeOut);
            // cleanup (optional)
            this.credits.innerHTML = '';
        }
    }

    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}

