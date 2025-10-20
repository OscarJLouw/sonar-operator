import * as THREE from 'three';

export class Utils {
    constructor() {
        // Singleton pattern
        if (!Utils.instance) {
            Utils.instance = this;

            this.CreateConstants();
        }
        return Utils.instance;
    }

    CreateConstants() {
        Utils.forward = new THREE.Vector3(0, 0, 1);
        Utils.up = new THREE.Vector3(0, 1, 0);
        Utils.right = new THREE.Vector3(1, 0, 0);
    }

    Clamp(x, a, b) {
        return Math.max(a, Math.min(x, b));
    }

    NormalizeAngle(angle) {
        return (angle % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    }

    AngleInArc(angle, start, end) {
        const TAU = Math.PI * 2;
        const mod = (x, m) => ((x % m) + m) % m;
        const a = mod(angle, TAU), s = mod(start, TAU), e = mod(end, TAU);
        const len = (e - s + TAU) % TAU;
        if (len === 0) return start === end ? a === s : true;
        return ((a - s + TAU) % TAU) <= len;
    }

    ClampAngle(angle, start, end) {
        const TAU = Math.PI * 2;

        const mod = (x, m) => ((x % m) + m) % m;

        const a = mod(angle, TAU);
        const s = mod(start, TAU);
        const e = mod(end, TAU);

        const len = (e - s + TAU) % TAU;

        if (len === 0) {
            return start === end ? s : a;
        }

        const rel = (a - s + TAU) % TAU;

        if (rel <= len) return a;

        const toS = Math.min(rel, TAU - rel);
        const relE = (a - e + TAU) % TAU;
        const toE = Math.min(relE, TAU - relE);
        return toS <= toE ? s : e;
    }


    AngleToPercent(angle, start, end) {
        const TAU = Math.PI * 2;
        const EPS = 1e-12;

        const mod = (x, m) => ((x % m) + m) % m;
        const almostZero = (x) => Math.abs(x) <= EPS;

        const a = mod(angle, TAU);
        const s = mod(start, TAU);
        const e = mod(end, TAU);

        let len = mod(e - s, TAU);

        if (almostZero(len)) {
            if (start === end) {
                return 0;
            } else {
                const relFull = mod(a - s, TAU);
                return relFull / TAU;
            }
        }

        const rel = mod(a - s, TAU);

        if (rel <= len + EPS) {
            return Math.min(1, Math.max(0, rel / len));
        }

        const distToStart = Math.min(rel, TAU - rel);
        const relE = mod(a - e, TAU);
        const distToEnd = Math.min(relE, TAU - relE);
        return distToStart <= distToEnd ? 0 : 1;
    }

    PercentToAngle(percent, start, end) {
        const TAU = Math.PI * 2;
        const EPS = 1e-12;
        const mod = (x, m) => ((x % m) + m) % m;
        const almostZero = (x) => Math.abs(x) <= EPS;

        const s = mod(start, TAU);
        const e = mod(end, TAU);
        let len = mod(e - s, TAU);

        // Distinguish degenerate arcs
        if (almostZero(len)) {
            if (start === end) {
                // Single point arc
                return s;
            } else {
                // Full circle: move percent of a full rotation from start
                return mod(s + percent * TAU, TAU);
            }
        }

        // Clamp percent to [0, 1]
        const t = Math.min(Math.max(percent, 0), 1);

        // Linear interpolation along the CCW arc
        return mod(s + t * len, TAU);
    }

    GetSignedAngleDifference(angle1, angle2) {
        const PI = Math.PI;
        const TWO_PI = 2 * PI;
        let diff = angle2 - angle1;

        // Normalize the difference to the range [-PI, PI]
        return ((diff + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    }

    LerpAngle(a1, a2, t) {
        // Normalize angles to be within a 2π range (e.g., -π to π)
        a1 = (a1 % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
        a2 = (a2 % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);

        let diff = a2 - a1;

        // Adjust difference to take the shortest path
        if (diff > Math.PI) {
            diff -= (2 * Math.PI);
        } else if (diff < -Math.PI) {
            diff += (2 * Math.PI);
        }

        // Perform linear interpolation
        let interpolatedAngle = a1 + diff * t;

        // Normalize the result to ensure it stays within the desired range (e.g., 0 to 2π)
        return (interpolatedAngle % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    }

    Lerp(a, b, t) {
        return a + (b - a) * t;
    }

    


    CircleLineIntersections(slope, circleX, circleY, circleRadius) 
    {
        var a = 1 + slope * slope;
        var b = 2 * (slope * (0 - circleY) - circleX);
        var c = circleX * circleX + (0 - circleY) * (0 - circleY) - circleRadius * circleRadius;

        var d = b * b - 4 * a * c;

        if (d === 0) {
            return [(-b + Math.sqrt(d)) / (2 * a)];
        } else if (d > 0) {
            return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
        } 

        return [];
    };

    CircleCircleIntersectionPoints(c1x, c1y, r1, c2x, c2y, r2) {
        const dx = c2x - c1x;
        const dy = c2y - c1y;
        const d = Math.sqrt(dx * dx + dy * dy); // Distance between circle centers

        // Check for various intersection scenarios
        if (d > r1 + r2) {
            // Circles are too far apart, no intersection
            return [];
        }
        if (d < Math.abs(r1 - r2)) {
            // One circle is completely inside the other, no intersection
            return [];
        }
        if (d === 0 && r1 === r2) {
            // Circles are coincident, infinite intersection points (return empty array or handle as needed)
            return [];
        }

        // Calculate the intersection points
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h = Math.sqrt(r1 * r1 - a * a);

        const x2 = c1x + (dx * a) / d;
        const y2 = c1y + (dy * a) / d;

        const intersection1X = x2 + (dy * h) / d;
        const intersection1Y = y2 - (dx * h) / d;

        const intersection2X = x2 - (dy * h) / d;
        const intersection2Y = y2 + (dx * h) / d;

        if (h === 0) {
            // Circles are tangent, only one intersection point
            return [{ x: intersection1X, y: intersection1Y }];
        } else {
            // Two distinct intersection points
            return [
                { x: intersection1X, y: intersection1Y },
                { x: intersection2X, y: intersection2Y }
            ];
        }
    }

    VectorEquals(vector1, vector2, epsilon = Number.EPSILON ) {
        return ( ( Math.abs( vector1.x - vector2.x ) < epsilon ) && ( Math.abs( vector1.y - vector2.y ) < epsilon ) && ( Math.abs( vector1.z - vector2.z ) < epsilon ) );
    }
}

export const utils = new Utils();