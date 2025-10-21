import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';
import { AudioManager } from '../managers/AudioManager';
import { Loop } from 'three/tsl';

export class SonarTarget extends GameObject {
    // Life Cycle
    Awake() {
        this.events = new EventTarget();

        const minRadius = 0.1;
        const maxRadius = 0.05;

        this.radius = Math.random() * (maxRadius - minRadius) + minRadius;

        const minSpawnRange = 0.05 + this.radius;
        const maxSpawnRange = 0.9 - this.radius;

        const randomAngle = Math.random() * Math.PI * 2;
        const randomPointOnUnitCircle = new THREE.Vector3(Math.cos(randomAngle), Math.sin(randomAngle), 0);
        const randomDistance = Math.random() * (maxSpawnRange - minSpawnRange) + minSpawnRange;
        //const randomDistance = Math.random() * ((maxspawnRange - this.radius) - this.radius) + this.radius;

        this.transform.position.copy(randomPointOnUnitCircle);
        this.transform.position.multiplyScalar(randomDistance);

        this.worldTransform = new THREE.Group();
        this.parent.add(this.worldTransform);
        this.worldTransform.position.copy(this.transform.position);

        this.wasOverlapping = false;

        this.dirty = true;

        this.positionLast = new THREE.Vector3(999999, 999999, 999999);
        this.radiusLast = this.radius;

        this.updateTime = 0.05;
        this.updateCountdown = Math.random() * this.updateTime;

        // Debug
        this.debug = false;
        if (this.debug) {
            this.debugGeometry = new THREE.CircleGeometry(1, 16);
            this.debugMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.9, 0.1, 0.1),
            });
            this.debugMesh = new THREE.Mesh(this.debugGeometry, this.debugMaterial);
            this.AddComponent(this.debugMesh);
            this.debugMesh.scale.set(this.radius, this.radius, this.radius);
        }
    }

    Start() {
        const soundList = ["question_004"];

        var randomSound = soundList[Math.floor(Math.random() * soundList.length)];

        this.audioHandle = AudioManager.instance.spawnRingPanned(randomSound, { bus: "sfx", loop: true, R: 1.3, autostart: false });
    }

    OnEnable() {
        this.SetVisible(true);
    }

    OnDisable() {
        this.SetVisible(false);
    }

    SetVisible(visible) {

    }

    OnDestroy() {
        if (this.audioHandle) {
            this.audioHandle.stop();
            this.audioHandle.free();
        }

        this.OnRemoved();
    }

    SetArcParameters(innerRadius, outerRadius, thetaMin, thetaMax, annularSegmentArea) {
        this.dirty = true;
        this.arcInnerRadius = innerRadius;
        this.arcOuterRadius = outerRadius;
        this.arcThetaMin = thetaMin;
        this.arcThetaMax = thetaMax;
        this.annularSegmentArea = annularSegmentArea;
    }

    CheckMovedOrScaled() {
        if (!Utils.instance.VectorEquals(this.positionLast, this.transform.position) || this.radiusLast != this.radius) {
            this.dirty = true;
            this.positionLast.set(this.transform.position.x, this.transform.position.y, this.transform.position.z);
            this.radiusLast = this.radius;
            return true;
        }

        return false;
    }


    Update(deltaTime) {
        // spatial placement
        const dx = this.transform.position.x - AudioManager.instance.listenerRig.position.x;
        const dy = this.transform.position.y - AudioManager.instance.listenerRig.position.y;
        //this.audioHandle.place(dx, dy);

        AudioManager.instance.placeAroundHeadFromObject(this.audioHandle.panner, this.transform /* or this */, { R: 1.3 });

        this.updateCountdown -= deltaTime;
        if (this.updateCountdown <= 0) {
            this.updateCountdown = this.updateTime;
        } else {
            return;
        }

        this.CheckMovedOrScaled();

        if (!this.dirty) {
            return;
        }

        var overlap = this.CalculateOverlapAndDistance(
            this.arcInnerRadius, this.arcOuterRadius, this.arcThetaMin, this.arcThetaMax,
            this.transform.position.x, this.transform.position.y, this.radius);

        const START_T = 0.02;  // start when >2%
        const STOP_T = 0.01;  // stop when <1%
        const RAMP = 0.08;  // 30ms ramp is usually pop-free

        if (overlap.hit) {
            const v = Utils.instance.Clamp(overlap.overlappedCircleAreaPercent, 0, 1);

            if (!this.audioHandle.isPlaying() && v > START_T) {
                this.audioHandle.play(0, RAMP); // fade in from 0
            }
            this.audioHandle.setVolumeSmooth(v, RAMP);

            this.wasOverlapping = true;
            this.OnOverlapUpdated(true, this.wasOverlapping, v, overlap.overlappedArea);
        } else {
            if (this.wasOverlapping) {
                this.audioHandle.setVolumeSmooth(0, RAMP);
                //this.audioHandle.pause(RAMP); // or .stop(RAMP)
                this.wasOverlapping = false;
                this.OnOverlapUpdated(false, true, 0, 0);
            }
        }

        this.dirty = false;
    }

    OnOverlapUpdated(overlapping, wasOverlappingPreviously, overlapPercentage, area) {
        this.dispatchEvent(new CustomEvent("overlapPercentageUpdated",
            {
                detail: {
                    overlapping: overlapping,
                    wasOverlappingPreviously: wasOverlappingPreviously,
                    overlapArea: area,
                    percentage: overlapPercentage,
                    sonarAnnularSegmentArea: this.annularSegmentArea
                }
            }
        ));

        if (this.debug) {
            if (overlapping) {
                this.debugMaterial.color.set(0.0, 1.0, 0.0);
                this.debugMaterial.materialNeedsUpdate = true;
            }
            else {
                this.debugMaterial.color.set(1.0, 0.0, 0.0);
                this.debugMaterial.materialNeedsUpdate = true;
            }
        }
    }

    OnRemoved() {
        this.dispatchEvent(new CustomEvent("onRemoved",
            {
                detail: {
                    target: this,
                }
            }
        ));
    }

    CalculateOverlapAndDistance(innerRadius, outerRadius, thetaMin, thetaMax, circleXPos, circleYPos, circleRadius) {
        const EPS = 1e-10;
        const circleDistanceToCenter = Math.hypot(circleXPos, circleYPos);
        const circleArea = Math.PI * circleRadius * circleRadius;

        // Circle is entirely outside the outer radius or inner radius, so we can exit
        if (circleDistanceToCenter - circleRadius > outerRadius + EPS) {
            return GetReturnValue(false, 0);
        }
        if (circleDistanceToCenter + circleRadius < innerRadius - EPS) {
            return GetReturnValue(false, 0);
        }

        if (circleDistanceToCenter < circleRadius) {
            // If it's touching the boat we'll just treat it as seen I guess
            return GetReturnValue(true, 1);
        }

        let finalArea = circleArea;

        // Store which radiuses we cross
        const circleOverlapsInnerRadius = circleDistanceToCenter - circleRadius < innerRadius + EPS;
        const circleOverlapsOuterRadius = circleDistanceToCenter + circleRadius > outerRadius + EPS;

        // Check if the min and max angles are equivalent, we're dealing with a full 360 donut and can skip the angular tests
        // (assuming we never get an annulus with zero angular size that is)
        if (Math.abs(Utils.instance.NormalizeAngle(thetaMin) - Utils.instance.NormalizeAngle(thetaMax)) < EPS) {
            // Remove the areas of the circle that don't overlap with the donut and return the remaining area
            if (circleOverlapsInnerRadius) {
                finalArea -= CircleOverlapArea(circleXPos, circleYPos, circleRadius, innerRadius)
            }

            if (circleOverlapsOuterRadius) {
                finalArea -= (circleArea - CircleOverlapArea(circleXPos, circleYPos, circleRadius, outerRadius))
            }

            return GetReturnValue(true, finalArea);
        }

        // Now we test against the min and max angles of the annulus
        // Find circle's min and max angles (the angle from the center to the min and max edge of the circle)
        const phi = Math.atan2(circleYPos, circleXPos);
        const alpha = (circleDistanceToCenter <= circleRadius + EPS) ? Math.PI : Math.asin(Math.min(1, Math.max(0, circleRadius / circleDistanceToCenter)));
        const circleMinAngle = phi - alpha
        const circleMaxAngle = phi + alpha;

        // Store intersection comparisons for later
        const thetaMinIntersectsCircle = Utils.instance.AngleInArc(thetaMin, circleMinAngle, circleMaxAngle);
        const thetaMaxIntersectsCircle = Utils.instance.AngleInArc(thetaMax, circleMinAngle, circleMaxAngle);
        const circleMinIntersectsSegment = Utils.instance.AngleInArc(circleMinAngle, thetaMin, thetaMax);
        const circleMaxIntersectsSegment = Utils.instance.AngleInArc(circleMaxAngle, thetaMin, thetaMax);

        if (!(thetaMinIntersectsCircle || thetaMaxIntersectsCircle || circleMinIntersectsSegment || circleMaxIntersectsSegment)) {
            // No angular span intersections, so the circle is not inside the arc
            return GetReturnValue(false, 0);
        }

        if (circleMinIntersectsSegment && circleMaxIntersectsSegment && !circleOverlapsInnerRadius && !circleOverlapsOuterRadius) {
            // Circle is fully enclosed in the segment, so just return circle's area
            return GetReturnValue(true, finalArea);
        }


        // At this point we know the circle is overlapping one of the annular edges (radial or angular)
        // So we need to start figuring out how much of the area is overlapping

        // Start by remove the areas of the circle that don't overlap with the donut defined by the outer radius and inner radius alone, ignoring the angular limits
        var innerRadiusCircleOverlapArea = 0;
        var outerRadiusCircleOverlapArea = 0;

        if (circleOverlapsInnerRadius) {
            innerRadiusCircleOverlapArea = CircleOverlapArea(circleXPos, circleYPos, circleRadius, innerRadius);
            finalArea -= innerRadiusCircleOverlapArea;
        }

        if (circleOverlapsOuterRadius) {
            outerRadiusCircleOverlapArea = (circleArea - CircleOverlapArea(circleXPos, circleYPos, circleRadius, outerRadius));
            finalArea -= outerRadiusCircleOverlapArea;
        }

        // Remove the areas of the circle that fall outside of the pie slice defined by thetaMin and thetaMax
        // Add back the corners that have been subtracted twice
        const circleCenterAngle = Math.atan2(circleYPos, circleXPos);
        const circleCenterIntersectsSegment = Utils.instance.AngleInArc(circleCenterAngle, thetaMin, thetaMax);


        if (thetaMinIntersectsCircle) {
            //console.log("==================")
            //console.log("THETA MIN")
            finalArea += RemoveAreasOutsideOfThetaAngle(thetaMin, circleXPos, circleYPos, circleRadius, circleArea, circleOverlapsInnerRadius, circleOverlapsOuterRadius, circleCenterIntersectsSegment);
            //console.log("==================")
        }

        if (thetaMaxIntersectsCircle) {
            //console.log("==================")
            //console.log("THETA MAX")
            finalArea += RemoveAreasOutsideOfThetaAngle(thetaMax, circleXPos, circleYPos, circleRadius, circleArea, circleOverlapsInnerRadius, circleOverlapsOuterRadius, circleCenterIntersectsSegment);
            //console.log("==================")
        }



        return GetReturnValue(true, finalArea);

        function GetReturnValue(hit, area) {
            if (!hit) {
                return { hit: hit, overlappedArea: 0, overlappedCircleAreaPercent: 0 }
            } else {
                return { hit: hit, overlappedArea: area, overlappedCircleAreaPercent: Utils.instance.Clamp(area / circleArea, 0, 1) };
            }
        }

        function RemoveAreasOutsideOfThetaAngle(theta, circleX, circleY, circleRadius, circleArea, overlapsInner, overlapsOuter, centerInsideSegment) {
            // Cut the circle into two halves
            var splitData = DivideCircleByRay(theta, circleX, circleY, circleRadius);
            var nearestCorner = 0;
            var minorSegment = splitData.minorSegmentArea;
            var majorSegment = circleArea - minorSegment;
            var firstIntersection = splitData.firstIntersection;

            var amountToRemove = 0;


            // Remove the appropriate segment from the final area
            amountToRemove -= (centerInsideSegment ? minorSegment : majorSegment);
            return amountToRemove;

            //console.log(centerInsideSegment ? "Minor: " + minorSegment * 100 : "Major: " + majorSegment * 100);

            // Add back the corners (which have been subtracted twice now)
            // INNER RADIUS
            if (overlapsInner) {
                nearestCorner = FindCornerFromIntersections(
                    circleX, circleY, circleRadius, innerRadius, theta, firstIntersection
                );

                //amountToRemove += nearestCorner;

                amountToRemove += (!centerInsideSegment
                    ? nearestCorner
                    : (innerRadiusCircleOverlapArea - nearestCorner));

                //console.log("----------")
                //console.log("Inner Overlaps, " + (centerInsideSegment ? " Center Inside: " : " Center Outside: "));
                //console.log((centerInsideSegment ? nearestCorner : (innerRadiusCircleOverlapArea - nearestCorner)) * 100);
            }

            // OUTER RADIUS
            if (overlapsOuter) {
                nearestCorner = FindCornerFromIntersections(
                    circleX, circleY, circleRadius, outerRadius, theta, firstIntersection
                );

                //amountToRemove += nearestCorner;

                amountToRemove += (!centerInsideSegment
                    ? (minorSegment - nearestCorner)
                    : (circleArea - outerRadiusCircleOverlapArea - minorSegment + nearestCorner));

                //console.log("----------")
                //console.log("Outer Overlaps, " + (centerInsideSegment ? " Center Inside: " : " Center Outside: "));
                //console.log((centerInsideSegment ? (minorSegment - nearestCorner) : (circleArea - outerRadiusCircleOverlapArea - minorSegment + nearestCorner)) * 100);
            }

            return amountToRemove;
        }

        function DivideCircleByRay(angle, circleX, circleY, circleRadius) {
            // Cut the circle into two halves
            const slope = Math.tan(angle);
            var rayIntersections = Utils.instance.CircleLineIntersections(slope, circleX, circleY, circleRadius);

            if (rayIntersections.Length < 2) {
                // hmm I guess we just ignore this now?
                console.log("Ray circle test failed");
                return {
                    intersected: false,
                    firstIntersection: { x: 0, y: 0 },
                    secondIntersection: { x: 0, y: 0 },
                    minorSegmentArea: 0
                };
            }

            // Order the intersection points
            var firstIntersection;
            var secondIntersection;

            if (rayIntersections[1] < rayIntersections[0]) {
                firstIntersection = { x: rayIntersections[0], y: rayIntersections[0] * slope }
                secondIntersection = { x: rayIntersections[1], y: rayIntersections[1] * slope }
            } else {
                firstIntersection = { x: rayIntersections[1], y: rayIntersections[1] * slope }
                secondIntersection = { x: rayIntersections[0], y: rayIntersections[0] * slope }
            }

            const minorSegment = EarArea(firstIntersection, secondIntersection, circleX, circleY, circleRadius);

            return {
                intersected: true,
                firstIntersection: firstIntersection,
                secondIntersection: secondIntersection,
                minorSegmentArea: minorSegment
            }
        }

        // Area of a triangle defined by 3 points
        function TriangleArea(x1, y1, x2, y2, x3, y3) {
            return 0.5 * Math.abs(
                x1 * (y2 - y3) +
                x3 * (y3 - y1) +
                x2 * (y1 - y2)
            );;
        }

        // Area of a pie slice (or "circle segment") defined by the circle's radius and an angle from it
        function PieSliceArea(radius, angle) {
            const sliceArea = (angle / (2 * Math.PI)) * (Math.PI * radius * radius);
            return sliceArea;
        }

        // Area of the ear of a curviliniear triangle (triangle with with two flat sides and one circular curved side), after you clip off the inner triangle
        function EarArea(A, B, circleX, circleY, circleRadius) {
            const CA = { x: A.x - circleX, y: A.y - circleY }; // Vector from circle to point A
            const CB = { x: B.x - circleX, y: B.y - circleY }; // Vector from circle to point B

            // Get triangle area formed by triangle A -> B -> C
            const T = TriangleArea(circleX, circleY, A.x, A.y, B.x, B.y);

            // Convert them to angles and normalize to get arc angle
            const angle = Math.abs(Utils.instance.GetSignedAngleDifference(Math.atan2(CA.y, CA.x), Math.atan2(CB.y, CB.x)));
            // Get pieArea -> from the radius and angle
            // subtract triangle area from pie area
            return PieSliceArea(circleRadius, angle) - T;
        }

        function CircleOverlapArea(x1, y1, r1, r2) {
            const d = Math.sqrt(x1 * x1 + y1 * y1);
            const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
            const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
            const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));

            return a + b - c;
        }


        function FindCornerFromIntersections(Cx, Cy, Cr, radius, theta, firstIntersection) {
            // First intersection between the circle and the ray
            var Pbl = firstIntersection;

            // Intersection point between theta min and the radius (distance along line)
            var Pal = { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius }

            // Find the intersection points between the circle and the inner radius
            const circleIntersections = Utils.instance.CircleCircleIntersectionPoints(0, 0, radius, Cx, Cy, Cr);

            if (circleIntersections.Length < 2) {
                // They are JUST touching, so I guess we ignore it again
                return 0;
            }

            // Determine which intersection point to use based off angle between point and center of B
            var Pab = circleIntersections[0];

            const angleToCircle = Math.atan2(Cx, Cy);
            const angleToPal = Math.atan2(Pal.x, Pal.y);
            const angleToIntersection = Math.atan2(Pab.x, Pab.y);

            // Use the other circle-circle intersection point if the one we chose is further from the circle
            if (Math.sign(angleToCircle - angleToPal) != Math.sign(angleToCircle - angleToIntersection)) {
                Pab = circleIntersections[1];
            }

            // Find the area of the triangle formed by Pal => Pbl => Pab
            const T = TriangleArea(Pal.x, Pal.y, Pbl.x, Pbl.y, Pab.x, Pab.y);

            // Use ear area function to find the following ears:
            // Ea => circleA, Pab, Pal
            // Eb => circleB, Pab, Pbl

            let Ea = EarArea(Pab, Pal, 0, 0, radius);
            let Eb = EarArea(Pab, Pbl, circleXPos, circleYPos, circleRadius);

            // Final area sums up the triangle with the ears
            return T + Ea + Eb;
        }
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}