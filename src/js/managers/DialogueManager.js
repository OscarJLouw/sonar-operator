import * as THREE from 'three';
import { GameManager } from './GameManager';
import { AudioManager } from './AudioManager';

/**
 * Lightweight branching dialogue system that overlays the Three.js canvas using HTML.
 *
 * Key features:
 *  - Typewriter rendering with in-string controls:
 *      {p: 1.3}     pause for X seconds
 *      {>}/{>>}/{>>>}  switch speed preset (slow/normal/fast)
 *      {color: #ff0000}  set text color until changed again or this entry ends
 *  - Click anywhere to skip the typewriter and reveal full text instantly
 *  - Choice prompts; selections flow to next dialogue node (or end)
 *  - Conditions/effects per choice, variables bag to gate content
 *  - Suspend/resume from gameplay at any node id
 *  - Char callback (for blips/SFX via your AudioManager) + skip callback
 *  - Minimal DOM/CSS; controlled entirely inside this class, pluggable into your GM
 */

/**
 * @typedef {Object} DialogueChoice
 * @property {string} text - Label shown to the player.
 * @property {string | null} [next] - Next node id (or null/undefined to end dialogue).
 * @property {(vars:Record<string,any>, gm:GameManager)=>boolean} [condition] - Return false to hide option.
 * @property {(vars:Record<string,any>, gm:GameManager)=>void} [onSelect] - Side-effects when chosen.
 * @property {('primary'|'danger'|'neutral')} [style] - Optional visual hint.
 */

/**
 * @typedef {Object} DialogueNode
 * @property {string} id
 * @property {string} [speaker]
 * @property {string} [portraitUrl]
 * @property {string} text - Supports inline controls described above.
 * @property {DialogueChoice[]} [choices]
 * @property {string} [next] - If present and no choices, proceed on click.
 * @property {(vars:Record<string,any>, gm:GameManager)=>void} [onEnter]
 * @property {(vars:Record<string,any>, gm:GameManager)=>void} [onExit]
 */

export class DialogueManager {
    /** @type {DialogueManager} */
    static instance;

    constructor() {
        if (!DialogueManager.instance) {
            /** @type {GameManager | null} */ this.gm = null;
            /** @type {AudioManager | null} */ this.audio = null;

            // Variables bag available to conditions/effects
            this.vars = Object.create(null);

            // Registered dialogue graph
            /** @type {Map<string, DialogueNode>} */
            this.nodes = new Map();

            // Typing presets (ms per char)
            this.speedPresets = { slow: 100, normal: 24, fast: 10 };

            // Internal state
            this.active = false;            // dialogue mode entered
            this.isTyping = false;          // currently typing text
            this.skipRequested = false;     // user asked to skip reveal
            this.currentNodeId = null;      // id of node currently displayed
            this.currentColor = null;       // current color span while typing
            this.currentSpeed = this.speedPresets.normal;

            // Callbacks
            /** @type {(ch:string, index:number, ctx:{nodeId:string})=>void | null} */
            this.onChar = null; // set via setCharacterCallback
            /** @type {(ctx:{nodeId:string, revealed:number, total:number})=>void | null} */
            this.onSkip = null; // set via setSkipCallback
            /** @type {(choice:DialogueChoice, node:DialogueNode)=>void | null} */
            this.onChoice = null; // optional analytics/telemetry

            // DOM
            this.root = null;        // overlay root
            this.nameEl = null;      // speaker label
            this.textEl = null;      // typewriter target
            this.choicesEl = null;   // container for choices
            this.continueHint = null;// continue hint
            this.styleEl = null;     // injected styles

            DialogueManager.instance = this;
        }
        return DialogueManager.instance;
    }

    /**
     * One-time init; call during game boot.
     * @param {{gameManager?: GameManager, audioManager?: AudioManager, parent?: HTMLElement, clickToSkipGlobal?: boolean}} [opts]
     */
    Setup(opts = {}) {
        this.gm = opts.gameManager ?? this.gm ?? null;
        this.audio = opts.audioManager ?? this.audio ?? null;

        // Create overlay DOM if not present
        if (!this.root) this.#buildOverlay(opts.parent ?? document.body);

        // Global click-to-skip toggle
        this.clickToSkipGlobal = opts.clickToSkipGlobal ?? true;
    }

    /** Add or update a single node */
    addNode(node /** @type {DialogueNode} */) {
        if (!node || !node.id) throw new Error('Dialogue node must have an id');
        this.nodes.set(node.id, node);
    }

    /** Bulk register nodes: record<string, DialogueNode> or DialogueNode[] */
    registerNodes(nodes) {
        if (Array.isArray(nodes)) nodes.forEach(n => this.addNode(n));
        else Object.values(nodes).forEach(n => this.addNode(n));
    }

    /** Set or merge variables available to conditions */
    setVars(obj) { Object.assign(this.vars, obj); }
    setVar(k, v) { this.vars[k] = v; }
    getVar(k) { return this.vars[k]; }

    /** Configure typewriter speed presets (ms per char) */
    setTypeSpeedPresets({ slow, normal, fast }) {
        if (slow) this.speedPresets.slow = slow;
        if (normal) this.speedPresets.normal = normal;
        if (fast) this.speedPresets.fast = fast;
    }

    /** Provide a per-character callback (e.g., to blip an SFX). */
    setCharacterCallback(fn) { this.onChar = fn; }

    /** Callback fired when the user skips a line reveal. */
    setSkipCallback(fn) { this.onSkip = fn; }

    /** Optional callback when a choice is selected (telemetry). */
    setChoiceCallback(fn) { this.onChoice = fn; }

    /**
     * Start dialogue at a node id. Returns when the conversation ends or is suspended.
     * @param {string} nodeId
     */
    async start(nodeId) {
        if (!this.root) this.Setup();
        this.active = true;
        this.root.style.display = 'grid';
        this.currentNodeId = nodeId;
        this.#bindGlobalSkip();
        while (this.active && this.currentNodeId) {
            const next = await this.#playNode(this.currentNodeId);
            this.currentNodeId = next;
        }

        this.active = false;
        this.#unbindGlobalSkip();
        this.#hideOverlay();
        return; // finished or suspended
    }

    /** Suspends dialogue UI immediately; can be resumed later via start/resume. */
    suspend() {
        this.active = false;
        this.isTyping = false;
        this.skipRequested = false;
        this.#unbindGlobalSkip();
        this.#hideOverlay();
    }

    /** Resume from a node (or the last currentNodeId if provided as null). */
    async resume(nodeId = null) {
        if (nodeId) this.currentNodeId = nodeId;
        if (!this.currentNodeId) return;
        await this.start(this.currentNodeId);
    }

    /**
     * Show a one-off dynamic prompt from gameplay. Returns the selected choice.
     * Useful for your sonar-identification quiz.
     *
     * @param {{
     *   text: string,
     *   choices: DialogueChoice[],
     *   speaker?: string,
     *   onDone?: (choice: DialogueChoice)=>void,
     * }} payload
     */
    async prompt(payload) {
        const tempId = `__dyn_${Math.random().toString(36).slice(2)}`;
        /** @type {DialogueNode} */
        const node = { id: tempId, speaker: payload.speaker, text: payload.text, choices: payload.choices };
        this.addNode(node);
        const prev = this.currentNodeId;
        await this.start(tempId);
        // After the prompt ends, restore previous node if desired
        this.currentNodeId = prev;
        if (payload.onDone) payload.onDone(this._lastChoice || null);
        return this._lastChoice || null;
    }

    /** Convenience helper for the recurring sonar multiple-choice case. */
    async sonarIdentify({ correct, responses, speaker = 'Operator' }) {
        // responses: { Biophony: string, Geophony: string, Anthropogenic: string, Unknown: string }
        const options = ['Biophony', 'Geophony', 'Anthropogenic', 'Unknown'];
        const text = 'What are you hearing, cadet?';
        const choices = options.map(o => ({ text: o, next: null }));
        const selected = await this.prompt({ text, choices, speaker });
        if (!selected) return null;
        const resultText = responses[selected.text] ?? 'Copy.';
        await this.prompt({ text: resultText, choices: [] });
        const isCorrect = selected.text === correct;
        return { selected: selected.text, isCorrect };
    }

    // ===== Internal: node lifecycle =====

    async #playNode(id) {
        const node = this.nodes.get(id);
        if (!node) {
            console.warn(`[Dialogue] Missing node: ${id}`);
            return null;
        }
        // enter
        node.onEnter?.(this.vars, this.gm);
        this.#prepareForNewLine();
        if (node.speaker) this.nameEl.textContent = node.speaker; else this.nameEl.textContent = '';

        // type text (with controls)
        await this.#typeLine(node.id, node.text ?? '');

        // if choices present, show menu and await selection
        if (Array.isArray(node.choices) && node.choices.length) {
            const choice = await this.#presentChoices(node);
            this._lastChoice = choice || null;
            node.onExit?.(this.vars, this.gm);
            if (!choice) return null; // cancelled/suspended
            choice.onSelect?.(this.vars, this.gm);
            this.onChoice?.(choice, node);
            return choice.next ?? null;
        }

        // if no choices, either continue to node.next or end
        const cont = await this.#waitForContinue();
        node.onExit?.(this.vars, this.gm);
        if (!cont) return null; // suspended
        return node.next ?? null;
    }

    #prepareForNewLine() {
        this.textEl.innerHTML = '';
        this.choicesEl.innerHTML = '';
        this.continueHint.style.display = 'none';
        this.currentColor = null;
        this.currentSpeed = this.speedPresets.normal;
    }

    // ===== Typewriter implementation =====

    /** Parse inline control tokens and yield pieces in order. */
    *#tokenize(raw) {
        const re = /\{\s*(p:\s*([0-9]*\.?[0-9]+)|>{1,3}|color:\s*([^}]+))\s*\}/gi;
        let lastIdx = 0;
        let m;
        while ((m = re.exec(raw))) {
            if (m.index > lastIdx) {
                yield { kind: 'text', text: raw.slice(lastIdx, m.index) };
            }
            const full = m[1];
            if (full.startsWith('p:')) {
                const secs = parseFloat(m[2]);
                yield { kind: 'pause', secs: isFinite(secs) ? secs : 0 };
            } else if (full === '>' || full === '>>' || full === '>>>') {
                yield { kind: 'speed', level: full.length }; // 1/2/3
            } else if (full.startsWith('color:')) {
                const color = (m[3] || '').trim();
                yield { kind: 'color', color };
            }
            lastIdx = re.lastIndex;
        }
        if (lastIdx < raw.length) {
            yield { kind: 'text', text: raw.slice(lastIdx) };
        }
    }

    async #typeLine(nodeId, raw) {
        this.isTyping = true;
        this.skipRequested = false;

        // click-to-skip hint only while typing
        this.root.classList.add('dm-typing');

        // attach span for current color (or default)
        let span = this.#ensureColorSpan(this.currentColor);

        let revealed = 0;
        let totalChars = this.#computePlainLength(raw);

        for (const tok of this.#tokenize(raw)) {
            if (!this.active) return; // suspended mid-line

            if (tok.kind === 'text') {
                for (const ch of tok.text) {
                    if (this.skipRequested) {
                        // Finish instantly
                        this.#renderRemainderFast(span, raw, revealed);
                        this.onSkip?.({ nodeId, revealed, total: totalChars });
                        this.skipRequested = false; // consumed
                        this.isTyping = false;
                        this.root.classList.remove('dm-typing');
                        return;
                    }
                    span.appendChild(document.createTextNode(ch));
                    this.onChar?.(ch, revealed, { nodeId });
                    revealed++;
                    await this.#sleep(this.currentSpeed);
                }
            } else if (tok.kind === 'pause') {
                if (this.skipRequested) continue; // ignore pauses when skipping
                await this.#sleep(tok.secs * 1000);
            } else if (tok.kind === 'speed') {
                this.currentSpeed = [0, this.speedPresets.slow, this.speedPresets.normal, this.speedPresets.fast][tok.level] ?? this.speedPresets.normal;
            } else if (tok.kind === 'color') {
                this.currentColor = tok.color;
                span = this.#ensureColorSpan(this.currentColor);
            }
        }

        this.isTyping = false;
        this.root.classList.remove('dm-typing');
    }

    /** Render the rest of the string immediately (apply colors, no waits). */
    #renderRemainderFast(span, raw, alreadyRevealed) {
        // Append only what hasn't been shown yet; no per-char callbacks to avoid SFX burst
        let consumed = 0;
        for (const tok of this.#tokenize(raw)) {
            if (tok.kind === 'text') {
                const len = tok.text.length;
                if (consumed + len <= alreadyRevealed) {
                    consumed += len; // skip portion already revealed
                    continue;
                }
                const start = Math.max(0, alreadyRevealed - consumed);
                const remainder = tok.text.slice(start);
                span.appendChild(document.createTextNode(remainder));
                consumed += len;
            } else if (tok.kind === 'color') {
                // Apply color only after we reach the reveal boundary
                if (consumed < alreadyRevealed) continue;
                this.currentColor = tok.color;
                span = this.#ensureColorSpan(this.currentColor);
            } // ignore pause/speed when fast-forwarding
        }
    }

    #computePlainLength(raw) {
        // Remove tokens to count characters only
        return raw.replace(/\{\s*(p:\s*([0-9]*\.?[0-9]+)|>{1,3}|color:\s*([^}]+))\s*\}/gi, '').length;
    }

    #ensureColorSpan(color) {
        const span = document.createElement('span');
        if (color) span.style.color = color;
        this.textEl.appendChild(span);
        return span;
    }

    // ===== Choices & continue =====

    async #presentChoices(node) {
        this.choicesEl.innerHTML = '';
        const shown = (node.choices || []).filter(c => (c.condition ? c.condition(this.vars, this.gm) : true));
        if (!shown.length) return null;

        return new Promise(resolve => {
            const cleanup = () => {
                this.choicesEl.removeEventListener('click', onClick);
            };

            const onClick = (ev) => {
                const btn = ev.target.closest('button[data-index]');
                if (!btn) return;
                const idx = Number(btn.getAttribute('data-index'));
                cleanup();
                // store last choice for prompt()
                const choice = shown[idx];
                this._lastChoice = choice;
                resolve(choice);
            };

            ['click', 'pointerup', 'mouseup'].forEach(t =>
                this.choicesEl.addEventListener(t, onClick)
            );

            shown.forEach((c, i) => {
                const btn = document.createElement('button');
                btn.className = `dm-choice ${c.style ?? 'neutral'}`;
                btn.type = 'button';
                btn.setAttribute('data-index', String(i));
                btn.textContent = c.text;
                this.choicesEl.appendChild(btn);
            });
        });
    }

    async #waitForContinue() {
        // show subtle continue hint
        this.continueHint.style.display = 'block';
        return new Promise(resolve => {
            const onClick = (ev) => {
                if (!this.active) { cleanup(); resolve(false); return; }
                // Only accept clicks inside the overlay (so gameplay clicks don't advance)
                if (!this.root.contains(ev.target)) return;
                cleanup(); resolve(true);
            };
            const onKey = (ev) => {
                if (!this.active) { cleanup(); resolve(false); return; }
                if (ev.key === ' ' || ev.key === 'Enter') { cleanup(); resolve(true); }
            };
            const cleanup = () => {
                window.removeEventListener('pointerdown', onClick, true);
                window.removeEventListener('keydown', onKey, true);
                this.continueHint.style.display = 'none';
            };
            window.addEventListener('pointerdown', onClick, true);
            window.addEventListener('keydown', onKey, true);
        });
    }

    // ===== Global click-to-skip while typing =====

    #bindGlobalSkip() {
        if (!this.clickToSkipGlobal) return;
        this._skipHandler = (ev) => {
            if (!this.active || !this.isTyping) return;
            // Any click anywhere (use capture) skips reveal
            this.skipRequested = true;
        };
        window.addEventListener('pointerdown', this._skipHandler, true);
        window.addEventListener('keydown', this._skipHandler, true); // also Space/Enter etc.
    }
    #unbindGlobalSkip() {
        if (!this._skipHandler) return;
        window.removeEventListener('pointerdown', this._skipHandler, true);
        window.removeEventListener('keydown', this._skipHandler, true);
        this._skipHandler = null;
    }

    // ===== DOM / CSS =====

    #buildOverlay(parent) {
        // styles
        const css = `
        .dm-root { position: fixed; inset: 0; display: none; place-items: end center; pointer-events: none; z-index: 2147483647; }
        .dm-panel { position: relative; z-index: 1; pointer-events: auto; width: min(900px, 92vw); margin-bottom: 2vh; border-radius: 0; background: rgba(8,8,12,0.82); backdrop-filter: blur(6px); color: #e9ecf1; box-shadow: 0 14px 40px rgba(0,0,0,0.35); padding: 16px 18px 12px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .dm-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .dm-portrait { width: 36px; height: 36px; border-radius: 0; background-size: cover; background-position: center; flex: 0 0 auto; display:none; }
        .dm-name { font-weight: 700; letter-spacing: 0.3px; opacity: 0.95; }
        .dm-text { min-height: 56px; line-height: 1.5; font-size: 16px; }
        .dm-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin-top: 12px; }
        .dm-choice { border: 0; padding: 10px 12px; border-radius: 0; background: #1d2331; color: #f1f4f9; cursor: pointer; transition: transform .04s ease, background .15s ease; text-align: center; }
        .dm-choice:hover { transform: translateY(-1px); background: #232a3b; }
        .dm-choice.primary { background: #2b6bf3; }
        .dm-choice.primary:hover { background: #2f76ff; }
        .dm-choice.danger { background: #b83333; }
        .dm-choice.danger:hover { background: #c43a3a; }
        .dm-continue { display:none; margin-top: 10px; font-size: 12px; opacity: 0.65; user-select: none; }
        .dm-root.dm-typing .dm-continue { display:none !important; }
        .dm-backdrop { position: fixed; inset: 0; background: transparent; pointer-events: auto; z-index: 0; }
        .unselectable-element {
            user-select: none;
            /* Vendor prefixes for broader browser compatibility (though modern browsers often support without prefixes) */
            -webkit-user-select: none; /* Safari, Chrome, Opera */
            -moz-user-select: none;    /* Firefox */
            -ms-user-select: none;     /* Internet Explorer, Edge */
        }
        `;
        this.styleEl = document.createElement('style');
        this.styleEl.textContent = css;
        document.head.appendChild(this.styleEl);

        // root overlay
        this.root = document.createElement('div');
        this.root.className = 'dm-root';
        this.root.setAttribute('role', 'dialog');
        this.root.setAttribute('aria-live', 'polite');
        this.root.classList.add('unselectable-element');

        // Backdrop to swallow clicks across the viewport
        const backdrop = document.createElement('div');
        backdrop.className = 'dm-backdrop';
        this.root.appendChild(backdrop);

        // panel
        const panel = document.createElement('div');
        panel.className = 'dm-panel';
        this.root.appendChild(panel);
        this.panelEl = panel;

        // header
        const header = document.createElement('div');
        header.className = 'dm-header';
        panel.appendChild(header);

        const portrait = document.createElement('div');
        portrait.className = 'dm-portrait';
        header.appendChild(portrait);
        this.portraitEl = portrait;

        const name = document.createElement('div');
        name.className = 'dm-name';
        header.appendChild(name);
        this.nameEl = name;

        // text
        const text = document.createElement('div');
        text.className = 'dm-text';
        panel.appendChild(text);
        this.textEl = text;

        // choices
        const choices = document.createElement('div');
        choices.className = 'dm-choices';
        panel.appendChild(choices);
        this.choicesEl = choices;

        // continue hint
        const hint = document.createElement('div');
        hint.className = 'dm-continue';
        hint.textContent = 'Click to continue…';
        panel.appendChild(hint);
        this.continueHint = hint;

        parent.appendChild(this.root);
        

        // --- Input trapping strategy ---
        // Backdrop: full-viewport blocker (prevents gameplay clicks)
        // Panel: stop at panel (lets internal handlers run; nothing reaches window)
        const stopList = [
            'pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu', 'wheel',
            'touchstart', 'touchmove', 'touchend',
            'mousedown', 'mouseup', 'mousemove'
        ];

        const trapBackdrop = (e) => {
            if (!this.active) return;
            e.stopPropagation();
            e.preventDefault(); // fully block outside the panel
        };

        stopList.forEach(t =>
            this.root.querySelector('.dm-backdrop').addEventListener(t, trapBackdrop, true) // capture
        );

        const trapPanel = (e) => {
            if (!this.active) return;
            // Important: this runs in BUBBLE phase, AFTER your button/choices handlers
            // Do NOT preventDefault; just stop it before reaching document/window
            e.stopPropagation();
        };
        stopList.forEach(t =>
            this.panelEl.addEventListener(t, trapPanel, false) // bubble (lets buttons handle first)
        );

    }

    #hideOverlay() {
        if (this.root) this.root.style.display = 'none';
    }

    // ===== Utils =====

    #sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

export const dialogueManager = new DialogueManager();

/* =========================
 * Minimal usage example
 * =========================

import { dialogueManager } from './DialogueManager';

// during game boot
// dialogueManager.Setup({ gameManager: gm, audioManager: audio });
// dialogueManager.setCharacterCallback((ch) => audio.playDialogueBlip());

// register nodes once
// dialogueManager.registerNodes([
//   { id: 'intro1', speaker: 'XO', text: 'Picking up a contact… {p: 0.6}{>}steady ping, 2-second interval.' , next: 'intro2' },
//   { id: 'intro2', speaker: 'XO', text: 'What are you hearing?', choices: [
//       { text: 'Biophony', next: 'bio', style: 'primary' },
//       { text: 'Geophony', next: 'geo' },
//       { text: 'Anthropogenic', next: 'anthro' },
//       { text: 'Unknown', next: 'unk' },
//     ]
//   },
//   { id: 'bio', text: '{color: #a2f39b}Biophony.{color: #e9ecf1} Humpback song patterns. Good catch.', next: null },
//   { id: 'geo', text: 'No, that rumble isn\'t tectonic.', next: null },
//   { id: 'anthro', text: 'Negative. Not prop cavitation.', next: null },
//   { id: 'unk', text: 'Marking as unknown for now.', next: null },
// ]);

// later in gameplay
// await dialogueManager.start('intro1');

*/
