import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Utils } from '../../utils/Utils';

export class SonarScreenParticles extends GameObject {
    Awake() {
        this.positionCount = 3000;
        this.positions = new Float32Array(this.positionCount * 3);

        for (let i = 0; i < this.positionCount; i++) {
            const i3 = i * 3;
            this.positions[i3 + 0] = Math.random() - 0.5;
            this.positions[i3 + 1] = Math.random() - 0.5;
            this.positions[i3 + 2] = 0;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(this.positions, 3)
        );
        this.pointsMaterial = new THREE.PointsMaterial(
            {
                size: 5
            });

        this.points = new THREE.Points(this.geometry, this.material);

        this.AddComponent(this.points);
        this.updating = true;
        this.pinging = false;
        this.pingGrowTime = 1;
        this.pingHangTime = 1.5;
        this.pingCountdown = 0;
        this.pingDistance = 0;
        this.pingParticlesPlaced = 0;
    }

    Ping() {
        this.pingCountdown = this.pingGrowTime + this.pingHangTime;
        this.pingParticlesPlaced = 0;
        this.pinging = true;

        const positions = this.points.geometry.attributes.position.array;

        for (let i = 0; i < this.positionCount; i++) {
            const i3 = i * 3;
            positions[i3 + 0] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;
        }
    }

    AnimatePing(deltaTime) {
        this.pingCountdown -= deltaTime;
        const positions = this.points.geometry.attributes.position.array;
        const TAU = Math.PI * 2;
        const targetVisualsList = this.sonarViewController.targetVisualsList;

        if (this.pingCountdown > this.pingHangTime) {
            const growPct = 1 - ((this.pingCountdown - this.pingHangTime) / this.pingGrowTime);
            this.pingDistanceOuter = Utils.instance.Lerp(0.1, 1, growPct);
            this.pingDistanceInner = Utils.instance.Lerp(0, 1, growPct);
            const targetParticlesPlaced = Math.floor(this.positionCount * growPct);
            const difference = targetParticlesPlaced - this.pingParticlesPlaced;

            if (difference > 0) {
                // Build a CDF once for the current ring shell [rInner, rOuter]
                const rInner = this.pingDistanceInner;
                const rOuter = this.pingDistanceOuter;
                const rMid = 0.5 * (rInner + rOuter); // good enough; or rebuild per batch if you want
                const angleCDF = buildOcclusionCDF(targetVisualsList, rMid, /*shadowSpread=*/0.2, /*penumbraWidth=*/0.03);

                for (let i = this.pingParticlesPlaced; i < targetParticlesPlaced; i++) {
                    const i3 = i * 3;

                    // Uniform-by-area radius in the annulus:
                    const u = Math.random();
                    const spawnRadius = Math.sqrt(rInner * rInner + u * (rOuter * rOuter - rInner * rInner));

                    // Angle sampled from visible segments:
                    const angle = sampleAngleFromCDF(angleCDF);

                    positions[i3 + 0] = Math.cos(angle) * spawnRadius;
                    positions[i3 + 1] = Math.sin(angle) * spawnRadius;
                    positions[i3 + 2] = 0;
                }

                this.pingParticlesPlaced = targetParticlesPlaced;
            }
        } else if (this.pingCountdown <= 0) {
            this.pinging = false;
        }

        // small jitter
        for (let i = 0; i < this.pingParticlesPlaced; i++) {
            const i3 = i * 3;
            positions[i3 + 0] += (Math.random() - 0.5) * deltaTime * 0.2;
            positions[i3 + 1] += (Math.random() - 0.5) * deltaTime * 0.2;
            positions[i3 + 2] = 0;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        // Utilities
        function wrapAngle(a) {
            const TAU = Math.PI * 2;
            a = a % TAU;
            return a < 0 ? a + TAU : a;
        }

        function pushInterval(intervals, start, end) {
            const TAU = Math.PI * 2;
            start = wrapAngle(start);
            end = wrapAngle(end);
            if (start <= end) {
                intervals.push([start, end]);
            } else {
                // Wrap-around: split into two
                intervals.push([0, end]);
                intervals.push([start, TAU]);
            }
        }

        // Merge [start, end] intervals on [0, 2π)
        function mergeIntervals(intervals) {
            if (intervals.length === 0) return [];
            intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const merged = [intervals[0].slice()];
            for (let i = 1; i < intervals.length; i++) {
                const last = merged[merged.length - 1];
                if (intervals[i][0] <= last[1]) {
                    last[1] = Math.max(last[1], intervals[i][1]);
                } else {
                    merged.push(intervals[i].slice());
                }
            }
            return merged;
        }

        // Build visible angular segments (complement of merged occlusion)
        function buildVisibleSegments(mergedOcc) {
            const TAU = Math.PI * 2;
            if (mergedOcc.length === 0) return [[0, TAU]];
            const segs = [];
            let prevEnd = 0;
            for (const [s, e] of mergedOcc) {
                if (s > prevEnd) segs.push([prevEnd, s]);
                prevEnd = Math.max(prevEnd, e);
            }
            if (prevEnd < TAU) segs.push([prevEnd, TAU]);
            return segs;
        }

        // Turn visible segments into a CDF for O(1) sampling
        function buildAngleCDF(segments) {
            const lengths = segments.map(([a, b]) => b - a);
            const total = lengths.reduce((a, b) => a + b, 0);
            if (total <= 1e-8) return { segments, cdf: [1], total: 0 }; // fully occluded
            let acc = 0;
            const cdf = lengths.map(L => (acc += L / total));
            return { segments, cdf, total };
        }

        function sampleAngleFromCDF(cdfObj) {
            if (cdfObj.total === 0) return Math.random() * Math.PI * 2; // fallback
            const u = Math.random();
            // binary search
            let lo = 0, hi = cdfObj.cdf.length - 1;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (u <= cdfObj.cdf[mid]) hi = mid; else lo = mid + 1;
            }
            const [a, b] = cdfObj.segments[lo];
            const prev = lo === 0 ? 0 : cdfObj.cdf[lo - 1];
            const t = (u - prev) / (cdfObj.cdf[lo] - prev);
            return a + t * (b - a);
        }

        // Build occlusion for current ring radius r
        function buildOcclusionCDF(targetVisualsList, r, shadowSpread = 0.15 /*rad per unit*/, penumbraWidth = 0) {
            const TAU = Math.PI * 2;
            const intervals = [];
            for (let i = 0; i < targetVisualsList.length; i++) {
                const tv = targetVisualsList[i];
                const cx = tv.sonarTarget.transform.position.x;
                const cy = tv.sonarTarget.transform.position.y;
                const d = Math.hypot(cx, cy);
                if (d < 1e-6) continue; // center: occludes everything behind, skip or clamp
                const theta = Math.atan2(cy, cx);       // angle of the target center
                const R = tv.radius;
                const alphaBase = Math.asin(Math.min(1, R / d));
                const grow = Math.max(0, r - d);        // only behind the target
                const alpha = alphaBase + shadowSpread * grow; // widen with distance
                const start = theta - (alpha + penumbraWidth);
                const end = theta + (alpha + penumbraWidth);
                pushInterval(intervals, start, end);
            }
            const merged = mergeIntervals(intervals);
            const visible = buildVisibleSegments(merged);
            return buildAngleCDF(visible);
        }

    }

    Update(deltaTime) {
        if (this.sonarViewController == null || !this.updating) {
            return;
        }

        if (this.pinging) {
            this.AnimatePing(deltaTime);
            return;
        }

        const targetVisualsList = this.sonarViewController.targetVisualsList;
        const particlesPerTarget = Math.floor((this.positionCount - 20) / targetVisualsList.length);

        const remainingParticles = this.positionCount - particlesPerTarget;

        const positions = this.points.geometry.attributes.position.array;
        var spawnRadius = 1;
        var visibilityPercentage = 0;
        const TAU = Math.PI * 2;
        var offsetX = 0;
        var offsetY = 0;

        var currentPoint = 0;
        const maxRadius = 0.2;
        var minRadius = 0;

        var targetVisual;
        for (let i = 0; i < targetVisualsList.length; i++) {


            targetVisual = targetVisualsList[i];
            /*
            if(targetVisual.discovered || !targetVisual.overlaps)
            {
                continue;
            }
            */

            visibilityPercentage = targetVisual.visibilityPercentage;
            /*
            if (visibilityPercentage > 1) {
                visibilityPercentage = 1 - (visibilityPercentage - 1);
            }
            */

            minRadius = targetVisual.radius;
            visibilityPercentage = Utils.instance.Clamp(visibilityPercentage, 0, 1);
            spawnRadius = Utils.instance.Lerp(maxRadius, minRadius, Math.log(visibilityPercentage));
            offsetX = targetVisual.sonarTarget.transform.position.x;
            offsetY = targetVisual.sonarTarget.transform.position.y;

            for (let j = 0; j < particlesPerTarget; j++) {
                const i3 = currentPoint * 3;
                const angle = Math.random() * TAU;
                const randomSpawnRadius = Math.random() * spawnRadius;
                positions[i3 + 0] = offsetX + Math.cos(angle) * randomSpawnRadius + (Math.random() * minRadius * 2 - minRadius);
                positions[i3 + 1] = offsetY + Math.sin(angle) * randomSpawnRadius + (Math.random() * minRadius * 2 - minRadius);
                positions[i3 + 2] = 0;
                currentPoint++;
            }
        }

        spawnRadius = 1;

        // Randomly scatter remaining particles
        for (let i = 0; i < remainingParticles; i++) {
            const i3 = currentPoint * 3;
            const angle = Math.random() * TAU;
            const randomSpawnRadius = Math.random() * spawnRadius;
            positions[i3 + 0] = Math.cos(angle) * randomSpawnRadius;
            positions[i3 + 1] = Math.sin(angle) * randomSpawnRadius;
            positions[i3 + 2] = 0;
            currentPoint++;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    OnEnable() {
        this.updating = true;
        this.points.visible = true;
    }

    OnDisable() {
        this.updating = false;
        this.points.visible = false;
    }

    SetSonarViewController(sonarViewController) {
        this.sonarViewController = sonarViewController;
    }



}