import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';

export class SoundSource extends GameObject {
    // Life Cycle
    Awake() {
        this.events = new EventTarget();

        const minRadius = 0.025;
        const maxRadius = 0.1;

        const maxspawnRange = 0.6;

        this.radius = Math.random() * (maxRadius - minRadius) + minRadius;
        this.radius = 0.025;
        
        // Meshes
        this.geometry = new THREE.CircleGeometry(this.radius, 16);
        this.material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(0.1, 0.1, 0.8), 
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.AddComponent(this.mesh);

        const randomAngle = Math.random() * Math.PI * 2;
        const randomPointOnUnitCircle = new THREE.Vector3(Math.cos(randomAngle), Math.sin(randomAngle), 0);
        const randomDistance = Math.random() * ((maxspawnRange-this.radius) - this.radius) + this.radius;

        this.transform.position.copy(randomPointOnUnitCircle);
        this.transform.position.multiplyScalar(randomDistance);

        this.wasOverlapping = false;
    }

    OnEnable() {
        this.mesh.visible = true;
    }

    OnDisable() {
        this.mesh.visible = false;
    }

    OnDestroy() {
        if (this.geometry) this.geometry.dispose();

        if (this.material) {
            if (this.material.map) {
                this.material.map.dispose();
            }

            this.material.dispose();
        }

        if (this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;
    }
   
    SetArcParameters(innerRadius, outerRadius, thetaMin, thetaMax)
    {
        this.arcInnerRadius = innerRadius;
        this.arcOuterRadius = outerRadius;
        this.arcThetaMin = thetaMin;
        this.arcThetaMax = thetaMax;
    }

    Update(deltaTime) {
        var overlap = this.CalculateOverlapAndDistance(
            this.arcInnerRadius, this.arcOuterRadius, this.arcThetaMin, this.arcThetaMax,
            this.transform.position.x, this.transform.position.y, this.radius);

        if(overlap.hit)
        {
            if(!this.wasOverlapping)
            {
                this.material.color = new THREE.Color(0, 1, 0);
                this.material.opacity = 0.9;
                //this.material.needsUpdate = true;
                this.wasOverlapping = true;
            }
        } else if(this.wasOverlapping)
        {
            this.material.color = new THREE.Color(0.1, 0.1, 0.8);
            this.material.opacity = 0.5;
            this.wasOverlapping = false;
        }
    }

    // robust “intervals overlap?” for wrapped [s,e] arcs
    AngleArcOverlap(s1, e1, s2, e2) {
        // they overlap if either interval contains an endpoint of the other
        return (
            Utils.instance.AngleInArc(s1, s2, e2) || Utils.instance.AngleInArc(e1, s2, e2) ||
            Utils.instance.AngleInArc(s2, s1, e1) || Utils.instance.AngleInArc(e2, s1, e1)
        );
    }

    /**
     * Fast test: does a circle intersect an annular sector?
     * Also returns closest distance from the circle center to the sector (optional use).
     *
     * @param {number} rin      inner radius
     * @param {number} rout     outer radius  (rin <= rout)
     * @param {number} tMin     theta min (radians)
     * @param {number} tMax     theta max (radians) — equal to tMin => full 2π
     * @param {number} cx, cy   circle center
     * @param {number} cr       circle radius
     * @returns {{hit:boolean, distance:number}}
     */
    CalculateOverlapAndDistance(rin, rout, tMin, tMax, cx, cy, cr) {
    const EPS = 1e-12;

    // --- quick radial rejection/acceptance ---
    const r = Math.hypot(cx, cy);

    // 1) entirely outside outer circle -> no hit
    if (r - cr > rout + EPS) return { hit: false, distance: (r - cr) - rout };

    // 2) entirely inside inner hole -> no hit
    if (r + cr < rin - EPS) return { hit: false, distance: rin - (r + cr) };

    // --- angular span of the circle as seen from the origin ---
    const phi = Math.atan2(cy, cx);

    // half-angle α; if the origin is inside the circle, α = π (covers all angles)
    let alpha;
    if (r <= cr + EPS) {
        alpha = Math.PI; // every angle is covered
    } else {
        const s = Math.min(1, Math.max(0, cr / r));
        alpha = Math.asin(s);
    }

    const a0 = phi - alpha;
    const a1 = phi + alpha;

    // 3) angular overlap test (handles wrap-around)
    const angleOK = this.AngleArcOverlap(tMin, tMax, a0, a1);

    if (!angleOK) {
        // quick distance-to-angle wedge for a useful "how far" measure (center -> sector)
        // distance to nearest radial edge segment (between rin..rout)
        const distToEdge = (th) => {
        const ex = Math.cos(th), ey = Math.sin(th);
        const t = cx * ex + cy * ey;
        const nproj = Math.abs(cx * ey - cy * ex); // ⟂ distance to the ray line
        if (t < rin)  return Math.hypot(cx - rin  * ex, cy - rin  * ey);
        if (t > rout) return Math.hypot(cx - rout * ex, cy - rout * ey);
        return nproj;
        };
        const dEdge = Math.min(distToEdge(tMin), distToEdge(tMax));
        // also distance to arcs at clamped angles
        const ex0 = Math.cos(tMin), ey0 = Math.sin(tMin);
        const ex1 = Math.cos(tMax), ey1 = Math.sin(tMax);
        const dArcs = Math.min(
        Math.hypot(cx - rin * ex0,  cy - rin * ey0),
        Math.hypot(cx - rout * ex0, cy - rout * ey0),
        Math.hypot(cx - rin * ex1,  cy - rin * ey1),
        Math.hypot(cx - rout * ex1, cy - rout * ey1)
        );
        return { hit: false, distance: Math.min(dEdge, dArcs) };
    }

    // If we got here, radial overlap exists AND angular overlap exists.
    // That's enough to guarantee intersection.
    return { hit: true, distance: 0 };
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}