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

    CreateConstants()
    {
        Utils.forward    = new THREE.Vector3(0,0,1);
        Utils.up         = new THREE.Vector3(0,1,0);
        Utils.right      = new THREE.Vector3(1,0,0);
    }

    Clamp(x, a, b)
    {
        return Math.max( a, Math.min(x, b) );
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
}

export const utils = new Utils();