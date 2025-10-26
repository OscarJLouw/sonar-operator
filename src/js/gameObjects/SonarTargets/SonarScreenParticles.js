import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Utils } from '../../utils/Utils';
import { MeshSurfaceSampler } from 'three/examples/jsm/Addons.js';

export class SonarScreenParticles extends GameObject {
    Awake() {
        this.positionCount = 2000;
        this.positions = new Float32Array(this.positionCount * 3);

        for (let i = 0; i < this.positionCount; i++) {
            const i3 = i * 3;
            this.positions[i3 + 0] = Math.random() - 0.5;
            this.positions[i3 + 1] = Math.random() - 0.5;
            this.positions[i3 + 2] = 0;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

        this.pointsMaterial = new THREE.PointsMaterial({
            size: 2,
            color: 0x40985e
            //color: 0x51C079
            /*, sizeAttenuation:true*/
        });

        this.points = new THREE.Points(this.geometry, this.pointsMaterial);
        this.points.position.z = -0.5;
        this.AddComponent(this.points);
        this.updating = true;
        this.pinging = false;
        this.pingOrigin = new THREE.Vector2(0, 0);
        this.pingMaxRadius = 2;
        this.pingGrowTime = 1;
        this.pingHangTime = 1.5;
        this.pingCountdown = 0;
        this.pingParticlesPlaced = 0;

        // cache for angle CDF across frames while the front moves slowly
        this._angleCDF = null;
        this._cdfRFront = -1;

        // const surfaceSampler = new MeshSurfaceSampler(surfaceMesh)
        //     .setWeightAttribute('color')
        //     .build();

        this.tentacles = [];
        this.showHorrorInPing = false;
        this._ignoreOccluders = null;

        // ---- Face (3D) ----
        this.faceParticleBudget = 800;                  // face uses the top slice of the buffer
        this.faceActive = false;
        this.faceSeeds3D = null;                        // Float32Array of length faceParticleBudget*3
        this.faceCenter = new THREE.Vector2(0, 0);      // where the face sits on the sonar plane
        this.faceScale = 0.9;                           // overall XY scale on the sonar
        this.faceDepthScale = 0.9;                      // how much Z “pops” out
        this.faceYawSpeed = 0.25;                       // rad/s
        this.facePitchSpeed = 0.1;
        this.faceRollSpeed = 0.0;
        this.faceJitter = 0.004;                        // subtle sparkle
        this.faceRot = new THREE.Euler(0, 0, 0, 'XYZ');
        this._faceQuat = new THREE.Quaternion();
        this._tmpV3 = new THREE.Vector3();

        // Reserve particle ranges (no overlap with tentacles)
        this.faceStartIndex = Math.max(0, this.positionCount - this.faceParticleBudget);
        this.tentacleParticleBudget = this.faceStartIndex; // tentacles use [0 .. faceStartIndex-1]

        // ---- Tentacles lifetime independent of ping ----
        this.tentaclesActive = false;
        this.tentaclesTime = 0;
        this.tentaclesGrowTime = 1.0;
        this.tentaclesHangTime = 1.5;

    }

    PingAt(origin, { radius = 2, showHorror = this.showHorrorInPing, ignore = [] } = {}) {
        this.pingOrigin.x = origin.x;
        this.pingOrigin.y = origin.y;
        this.pingMaxRadius = radius;
        this.showHorrorInPing = showHorror;
        this._ignoreOccluders = new Set(ignore);
        this.Ping(origin); // reuse your existing setup logic
    }

    Ping(origin = new THREE.Vector2(0, 0)) {
        if (origin) this.pingOrigin.set(origin.x, origin.y); // accept Vector2/Vector3

        this.pingCountdown = this.pingGrowTime + this.pingHangTime;
        this.pingParticlesPlaced = 0;
        this.pinging = true;

        const positions = this.points.geometry.attributes.position.array;

        if (this.showHorrorInPing) {
            this.PingWithHorror();
            return;
        }

        // Reset to the ping origin, not (0,0)
        for (let i = 0; i < this.positionCount; i++) {
            const i3 = i * 3;
            positions[i3 + 0] = this.pingOrigin.x;
            positions[i3 + 1] = this.pingOrigin.y;
            positions[i3 + 2] = 0;
        }

        // reset CDF cache
        this._angleCDF = null;
        this._cdfRFront = -1;
        this._cdfOrigin = new THREE.Vector2(this.pingOrigin.x, this.pingOrigin.y);
    }

    PingWithHorror() {
        this.CreateTentacles();
        this.tentaclesActive = true;
        this.tentaclesTime = 0;
    }
    PrepareFaceSeedsFromMesh3D(mesh, count = this.faceParticleBudget) {
        if (!mesh || !mesh.isMesh) { console.warn("Expected THREE.Mesh"); return false; }
        const geom = mesh.geometry;
        geom.computeBoundingSphere();
        const bs = geom.boundingSphere;
        const center = bs.center, radius = bs.radius || 1;

        // Build sampler
        this.faceSampler = new MeshSurfaceSampler(mesh).build();

        const seeds = new Float32Array(count * 3);
        const v = this._tmpV3;

        for (let i = 0; i < count; i++) {
            this.faceSampler.sample(v); // local-space point on the mesh
            // normalize to unit sphere around mesh center (keeps Z!)
            const nx = (v.x - center.x) / radius;
            const ny = (v.y - center.y) / radius;
            const nz = (v.z - center.z) / radius;
            seeds[i * 3 + 0] = nx;
            seeds[i * 3 + 1] = ny;
            seeds[i * 3 + 2] = nz;
        }
        this.faceSeeds3D = seeds;
        return true;
    }

    StartFaceFromMesh(mesh, {
        center = new THREE.Vector2(0, 0),
        scale = 0.9,
        depthScale = 0.9,
        yawSpeed = 0.25,
        pitchSpeed = 0.1,
        rollSpeed = 0.0,
        jitter = 0.004,
    } = {}) {
        if (mesh && !this.PrepareFaceSeedsFromMesh3D(mesh, this.faceParticleBudget)) return;
        this.faceCenter.copy(center);
        this.faceScale = scale;
        this.faceDepthScale = depthScale;
        this.faceYawSpeed = yawSpeed;
        this.facePitchSpeed = pitchSpeed;
        this.faceRollSpeed = rollSpeed;
        this.faceJitter = jitter;
        this.faceRot.set(0, 0, 0);
        this.faceActive = true;
    }

    // Per-frame writer into the reserved face slice (keeps running after ping ends)
    UpdateFace3D(deltaTime) {
        if (!this.faceActive || !this.faceSeeds3D) return;

        // advance rotation
        this.faceRot.y += this.faceYawSpeed * deltaTime; // yaw
        this.faceRot.x += this.facePitchSpeed * deltaTime; // pitch
        this.faceRot.z += this.faceRollSpeed * deltaTime; // roll
        this._faceQuat.setFromEuler(this.faceRot);

        const positions = this.points.geometry.attributes.position.array;
        const start = this.faceStartIndex;
        const count = this.faceParticleBudget;
        const sXY = this.faceScale, sZ = this.faceDepthScale;

        const v = this._tmpV3;

        for (let i = 0; i < count; i++) {
            const i3 = (start + i) * 3;

            v.set(
                this.faceSeeds3D[i * 3 + 0],
                this.faceSeeds3D[i * 3 + 1],
                this.faceSeeds3D[i * 3 + 2]
            ).applyQuaternion(this._faceQuat);

            // map to sonar space; keep Z for true 3D shape
            const x = this.faceCenter.x + v.x * sXY;
            const y = this.faceCenter.y + v.y * sXY;
            const z = v.z * sZ; // local z; added to this.points.position.z in world

            const jx = (Math.random() * 2 - 1) * this.faceJitter;
            const jy = (Math.random() * 2 - 1) * this.faceJitter;
            const jz = (Math.random() * 2 - 1) * (this.faceJitter * 0.5);

            positions[i3 + 0] = x + jx;
            positions[i3 + 1] = y + jy;
            positions[i3 + 2] = z + jz;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }
    CreateTentacles({
        spawnAngleMin = 0.5, spawnAngleMax = 0.8,
        endpointSpread = 0.1,
        tentacleLengthMin = 0.3, tentacleLengthMax = 0.5,
        animScaleMin = 0, animScaleMax = 0.5
    } = {}) {
        const TAU = Math.PI * 2;
        this.numTentaces = 20;
        this.tentacles.length = 0;

        this.particlesPerTentacle = Math.floor(this.tentacleParticleBudget / this.numTentaces);


        for (let i = 0; i < this.numTentaces; i++) {

            const spawnAngle = randomBetween(spawnAngleMin, spawnAngleMax) * Math.PI * 2;
            const startPointX = Math.cos(spawnAngle);
            const startPointY = Math.sin(spawnAngle);
            const angleToCenter = Math.atan2(-startPointY, -startPointX)
            const endpointAngle = angleToCenter + randomBetween(-endpointSpread, endpointSpread) * Math.PI * 2;
            const tentacleLength = randomBetween(tentacleLengthMin, tentacleLengthMax);

            this.tentacles.push(
                {
                    startIndex: i * this.particlesPerTentacle,
                    startPosition: new THREE.Vector2(startPointX, startPointY),
                    endPosition: new THREE.Vector2(startPointX + Math.cos(endpointAngle) * tentacleLength, startPointY + Math.sin(endpointAngle) * tentacleLength),
                    noiseTimeA: Math.random(),
                    noiseTimeB: Math.random(),
                    noiseFreqencyA: randomBetween(2, 5),
                    noiseFreqencyB: randomBetween(10, 20),
                    noiseSpeedA: randomBetween(0.5, 1),
                    noiseSpeedB: randomBetween(2, 5),
                    noiseAmplitudeA: Math.random() * 3,
                    noiseAmplitudeB: Math.random() * 1.5,
                    noiseAmplitudeAtBase: 1,
                    noiseAmplitudeAtTip: 5,
                    noisePow: 1,
                    widthAtBase: 0.05,
                    widthAtTip: 0.01,
                    targetPos: randomPointInUnitCircle(),
                    targetDistance: 0.8,
                    animScale: randomBetween(animScaleMin, animScaleMax)
                }
            );
        }
    }

    UpdateTentacles(deltaTime) {
        // Drive horror wavefront by the ping timer (restores your old behavior)
        this.pingCountdown -= deltaTime;

        const positions = this.points.geometry.attributes.position.array;
        const totalPingTime = (this.pingGrowTime + this.pingHangTime);
        const animPercent = totalPingTime > 0 ? (this.pingCountdown / totalPingTime) : 0;

        // 1) Draw tentacle strands (as before)
        if (this.pingCountdown > 0) {
            const noiseAmplitudeGlobal = 0.01;

            for (let i = 0; i < this.tentacles.length; i++) {
                const tentacle = this.tentacles[i];

                const lerpedEndPosX = Utils.instance.Lerp(
                    tentacle.endPosition.x,
                    tentacle.targetPos.x * 0.6,
                    (1 - animPercent) * tentacle.animScale
                );
                const lerpedEndPosY = Utils.instance.Lerp(
                    tentacle.endPosition.y,
                    tentacle.targetPos.y * 0.6,
                    (1 - animPercent) * tentacle.animScale
                );

                tentacle.noiseTimeA += deltaTime * tentacle.noiseSpeedA;
                tentacle.noiseTimeB += deltaTime * tentacle.noiseSpeedB;

                const tangentX = -(lerpedEndPosY - tentacle.startPosition.y);
                const tangentY = (lerpedEndPosX - tentacle.startPosition.x);

                const jStart = tentacle.startIndex;
                const jEnd = jStart + this.particlesPerTentacle;

                for (let j = jStart; j < jEnd; j++) {
                    const j3 = j * 3;
                    const u = (j - jStart) / this.particlesPerTentacle;

                    const width = Utils.instance.Lerp(tentacle.widthAtBase, tentacle.widthAtTip, u);
                    const ampPoint = Utils.instance.Lerp(tentacle.noiseAmplitudeAtBase, tentacle.noiseAmplitudeAtTip, u);

                    const noiseA = Math.sin(tentacle.noiseTimeA + u * tentacle.noiseFreqencyA) * tentacle.noiseAmplitudeA * noiseAmplitudeGlobal;
                    const noiseB = Math.sin(tentacle.noiseTimeB + u * tentacle.noiseFreqencyB) * tentacle.noiseAmplitudeB * noiseAmplitudeGlobal;

                    let noise = Math.pow(noiseA + noiseB, tentacle.noisePow);
                    noise = Utils.instance.Clamp(noise, -1, 1) * ampPoint;

                    const rndW = randomBetween(-width, width);

                    positions[j3 + 0] = Utils.instance.Lerp(tentacle.startPosition.x, lerpedEndPosX, u) + tangentX * (noise + rndW);
                    positions[j3 + 1] = Utils.instance.Lerp(tentacle.startPosition.y, lerpedEndPosY, u) + tangentY * (noise + rndW);
                    positions[j3 + 2] = 0;
                }
            }
        }

        // 2) Ring-based respawn + fuzz (ONLY over the tentacle slice)
        //    This is what makes the ping “paint behind” and then shimmer/fade.
        const growPercentage = Utils.instance.Clamp(
            1 - ((this.pingCountdown - this.pingHangTime) / this.pingGrowTime), 0, 1
        );

        const pingFuzzSize = 0.5;
        const pingMin = Utils.instance.Lerp(-pingFuzzSize * 0.5, this.pingMaxRadius, growPercentage);
        const pingMax = Utils.instance.Lerp(0, this.pingMaxRadius + pingFuzzSize * 0.5, growPercentage);

        const fuzzinessAmplitude = 0.05;
        const fadeoutTime = 1 - Math.min(this.pingCountdown / this.pingHangTime, 1);
        const fadeoutTimeExponential = Math.pow(fadeoutTime, 4);

        for (let i = 0; i < this.tentacleParticleBudget; i++) {
            const i3 = i * 3;

            // distance from ping ORIGIN (not world origin)
            const dx = positions[i3 + 0] - this.pingOrigin.x;
            const dy = positions[i3 + 1] - this.pingOrigin.y;
            const dist = Math.hypot(dx, dy);

            if (dist > pingMax) {
                // Not yet swept by the annulus → pull into the current ring
                const u = Math.random();
                const spawnRadius = Math.sqrt(
                    pingMin * pingMin + u * (pingMax * pingMax - pingMin * pingMin)
                );
                const angle = Math.random() * Math.PI * 2;

                positions[i3 + 0] = this.pingOrigin.x + Math.cos(angle) * spawnRadius;
                positions[i3 + 1] = this.pingOrigin.y + Math.sin(angle) * spawnRadius;
                positions[i3 + 2] = 0;
            } else {
                // Already swept → shimmer/fuzz with a fade over hang time
                const fuzziness = Utils.instance.Clamp(
                    Utils.instance.InverseLerp(pingMin, pingMax, dist), 0, 1
                ) * fuzzinessAmplitude;

                positions[i3 + 0] += randomBetween(-fuzziness, fuzziness) + randomBetween(-fadeoutTimeExponential, fadeoutTimeExponential);
                positions[i3 + 1] += randomBetween(-fuzziness, fuzziness) + randomBetween(-fadeoutTimeExponential, fadeoutTimeExponential);
                // z stays 0
            }
        }

        // 3) Wrap-up when the ping completes
        if (this.pingCountdown <= 0) {
            this.pinging = false;          // stop driving the horror ping branch
            this.tentaclesActive = false;  // allow passive scatter to resume after this frame
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    AnimatePing(deltaTime) {
        this.pingCountdown -= deltaTime;
        const positions = this.points.geometry.attributes.position.array;
        const targets = this.sonarViewController.targetVisualsList;

        //const growPct = 1 - ((this.pingCountdown - this.pingHangTime) / this.pingGrowTime);

        const growPct = Utils.instance.Clamp(
            1 - ((this.pingCountdown - this.pingHangTime) / this.pingGrowTime),
            0, 1
        );

        // Fixed-radius ping scaled by pingMaxRadius
        const rFront = this.pingMaxRadius * Utils.instance.Lerp(0, 1, growPct); // wavefront
        const rOuter = this.pingMaxRadius * Utils.instance.Lerp(0.1, 1, growPct); // outer sweep

        // how many particles are "active" so far
        const activeCount = Math.min(this.positionCount, Math.floor(this.positionCount * growPct));

        // (Re)build swept-area sampler each frame (cheap: O(bins * targets))
        const sampler = buildSweptAreaSampler(targets, this.pingOrigin, rFront, rOuter, /*bins*/512, this._ignoreOccluders);

        // Re-sample ALL active particles within already-swept, unshadowed area
        // Optional blend for smoother shimmer
        const BLEND = 1.0; // try 0.3 for smoother motion

        for (let i = 0; i < activeCount; i++) {
            const i3 = i * 3;
            const { ang, r } = sampleFromSweptSampler(sampler);
            const tx = this.pingOrigin.x + Math.cos(ang) * r;
            const ty = this.pingOrigin.y + Math.sin(ang) * r;

            if (BLEND === 1.0) {
                positions[i3 + 0] = tx;
                positions[i3 + 1] = ty;
            } else {
                positions[i3 + 0] = Utils.instance.Lerp(positions[i3 + 0], tx, BLEND);
                positions[i3 + 1] = Utils.instance.Lerp(positions[i3 + 1], ty, BLEND);
            }
            positions[i3 + 2] = 0;
        }

        // Park any not-yet-active particles at the origin point (or leave as-is)
        for (let i = activeCount; i < this.positionCount; i++) {
            const i3 = i * 3;
            positions[i3 + 0] = this.pingOrigin.x;
            positions[i3 + 1] = this.pingOrigin.y;
            positions[i3 + 2] = 0;
        }

        this.pingParticlesPlaced = activeCount;

        if (this.pingCountdown <= 0) {
            this.pinging = false;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    Update(deltaTime) {
        if (this.sonarViewController == null || !this.updating) return;

        // Face always updates if active (independent of ping)
        if (this.faceActive) this.UpdateFace3D?.(deltaTime);

        if (this.pinging) {
            // Horror ping: update tentacles during ping
            if (this.showHorrorInPing) {
                this.UpdateTentacles(deltaTime);
            } else {
                this.AnimatePing(deltaTime);
                return;
            }

            return;
        }

        // Optional: while face/tentacles are active, skip passive scatter
        if (this.faceActive || this.tentaclesActive) return;

        const positions = this.points.geometry.attributes.position.array;
        const targetVisualsList = this.sonarViewController.targetVisualsList;
        const positionFudge = 0.5;

        const randomParticlesCount = 300;
        const maxParticlesPerTarget = 300;

        var currentPoint = 0;
        var spawnRadius = 1;

        // Scatter random particles around
        for (let i = 0; i < randomParticlesCount; i++) {
            const i3 = currentPoint * 3;
            const angle = Math.random() * TAU;
            const randomSpawnRadius = Math.random() * spawnRadius;
            positions[i3 + 0] = Math.cos(angle) * randomSpawnRadius;
            positions[i3 + 1] = Math.sin(angle) * randomSpawnRadius;
            positions[i3 + 2] = 0;
            currentPoint++;
        }

        // Check how many targets we need to actually look at
        const eligibleTargets = [];
        for (let i = 0; i < targetVisualsList.length; i++) {
            const targetVisual = targetVisualsList[i];
            if (!targetVisual) continue;
            if (targetVisual.discovered || !targetVisual.overlapping) continue; // ignore if discovered or not in cone
            eligibleTargets.push(targetVisual);
        }

        const eligibleTargetsCount = eligibleTargets.length;

        if (eligibleTargetsCount == 0) {
            // no need to scatter anything more
            // reset the rest of the particles and exit early

            for (let i = randomParticlesCount; i < this.positionCount; i++) {
                const i3 = currentPoint * 3;
                positions[i3 + 0] = 0;
                positions[i3 + 1] = 0;
                positions[i3 + 2] = 0;
                currentPoint++;
            }

            this.points.geometry.attributes.position.needsUpdate = true;
            return;
        }

        // Position the remaining particles in clouds around the overlapping targets
        // based off the accuracy of your arc
        var remainingParticles = this.positionCount - randomParticlesCount;

        const particlesPerTarget = Math.min(Math.floor(remainingParticles / eligibleTargetsCount), maxParticlesPerTarget);

        let visibilityPercentage = 0;
        let offsetX = 0;
        let offsetY = 0;

        const maxRadius = 0.2;
        let minRadius = 0;

        for (let i = 0; i < targetVisualsList.length; i++) {
            const targetVisual = targetVisualsList[i];

            if (targetVisual.discovered || !targetVisual.overlapping)
                continue;

            visibilityPercentage = Utils.instance.Clamp(targetVisual.visibilityPercentage, 0, 1);
            minRadius = targetVisual.radius;

            const accuracy = Math.log(visibilityPercentage || 1e-6);
            spawnRadius = Utils.instance.Lerp(maxRadius, minRadius, accuracy);
            offsetX = targetVisual.sonarTarget.transform.position.x;
            offsetY = targetVisual.sonarTarget.transform.position.y;


            for (let j = 0; j < particlesPerTarget; j++) {
                const i3 = currentPoint * 3;
                const angle = Math.random() * TAU;
                const randomSpawnRadius = Math.random() * spawnRadius;
                positions[i3 + 0] = offsetX + Math.cos(angle) * randomSpawnRadius + positionFudge * (Math.random() * minRadius * 2 - minRadius) * accuracy;
                positions[i3 + 1] = offsetY + Math.sin(angle) * randomSpawnRadius + positionFudge * (Math.random() * minRadius * 2 - minRadius) * accuracy;
                positions[i3 + 2] = 0;
                currentPoint++;
            }
        }

        // reset remaining particles
        for (let i = currentPoint; i < this.positionCount; i++) {
            const i3 = currentPoint * 3;
            positions[i3 + 0] = 0;
            positions[i3 + 1] = 0
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




// ---------- helpers (module-level; not re-created each frame) ----------
const TAU = Math.PI * 2;

function wrapAngle(a) {
    a = a % TAU;
    return a < 0 ? a + TAU : a;
}

function pushInterval(intervals, start, end) {
    start = wrapAngle(start);
    end = wrapAngle(end);
    if (start <= end) {
        intervals.push([start, end]);
    } else {
        // Wrap-around split
        intervals.push([0, end]);
        intervals.push([start, TAU]);
    }
}

function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [intervals[0].slice()];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const cur = intervals[i];
        if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
        else merged.push(cur.slice());
    }
    return merged;
}

function buildVisibleSegments(mergedOcc) {
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

function buildAngleCDF(segments) {
    const lengths = segments.map(([a, b]) => b - a);
    const total = lengths.reduce((a, b) => a + b, 0);
    if (total <= 1e-8) return { segments, cdf: [1], total: 0 }; // fully occluded
    let acc = 0;
    const cdf = lengths.map(L => (acc += L / total));
    return { segments, cdf, total };
}

function sampleAngleFromCDF(cdfObj) {
    if (cdfObj.total === 0) return Math.random() * TAU; // fallback
    const u = Math.random();
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

// Half-angle of occlusion at wavefront radius rFront.
// Shadow starts at rStart = d - R (front of target), grows to alpha at rFull = sqrt(d^2 - R^2).
function halfAngleAtRadius(d, R, rFront) {
    if (d < 1e-6) return Math.PI; // target at origin → block everything behind
    const alpha = Math.asin(Math.min(1, R / d));
    const rStart = Math.max(0, d - R);
    if (rFront <= rStart) return 0;
    const rFull = Math.sqrt(Math.max(0, d * d - R * R));
    if (!(rFull > 0) || rFront >= rFull) return alpha;
    // law of cosines
    const x = (rFront * rFront + d * d - R * R) / (2 * rFront * d);
    const clamped = Math.min(1, Math.max(-1, x));
    return Math.acos(clamped);
}

// Build occlusion for the *front* of the expanding ring.
// Now takes `origin` to compute angles/distances relative to the ping source.
function buildOcclusionCDFFront(targetVisualsList, rFront, origin, penumbraWidth = 0.03, shadowSpread = 0.0, ignoreSet = null) {
    const intervals = [];
    for (let i = 0; i < targetVisualsList.length; i++) {
        const tv = targetVisualsList[i];
        if (shouldIgnoreOccluder(tv, origin, ignoreSet)) continue;

        // relative to pingOrigin:
        const cx = tv.sonarTarget.transform.position.x - origin.x;
        const cy = tv.sonarTarget.transform.position.y - origin.y;
        const d = Math.hypot(cx, cy);
        const R = tv.radius;
        const theta = Math.atan2(cy, cx);

        let beta = halfAngleAtRadius(d, R, rFront);
        if (beta <= 0) continue;
        beta += penumbraWidth;
        if (shadowSpread > 0) beta += shadowSpread * Math.max(0, rFront - d);

        pushInterval(intervals, theta - beta, theta + beta);
    }
    const merged = mergeIntervals(intervals);
    const visible = buildVisibleSegments(merged);
    return buildAngleCDF(visible);
}


function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function randomPointInUnitCircle() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random();
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

// --- Swept-area sampler (angle → allowed r up to rVisible(φ)) ---
function rayCircleNear(origin, cx, cy, R, ang) {
    // Ray from origin in direction ang → distance to first hit (t >= 0) or +Inf if none.
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const dx = cx - origin.x, dy = cy - origin.y;
    const b = dx * ux + dy * uy;
    const d2 = dx * dx + dy * dy;
    const perp2 = d2 - b * b;
    const rad2 = R * R;
    const m = rad2 - perp2;
    if (m < 0) return Infinity;               // miss
    const s = Math.sqrt(m);
    const t0 = b - s;
    const t1 = b + s;
    if (t1 < 0) return Infinity;              // both behind
    if (t0 <= 0) return 0;                    // origin inside or grazing
    return t0;                                // near intersection in front of origin
}

// Build a per-angle sampler over the *already-swept* region.
// For each angle bin φ, allowed radius is:
//   rVisible(φ) = rOuter           if rFront < s_near(φ)
//               = min(rOuter, s_near(φ)) otherwise.
// Weight per bin ∝ rVisible(φ)^2 so sampling is uniform-by-area.
function buildSweptAreaSampler(targets, origin, rFront, rOuter, bins = 512, ignoreSet = null) {
    const dphi = (Math.PI * 2) / bins;
    const rmax = new Float32Array(bins);
    const weights = new Float32Array(bins);
    let total = 0;

    for (let i = 0; i < bins; i++) {
        const ang = (i + 0.5) * dphi; // bin center
        // nearest blocker along this ray
        let sNear = Infinity;
        for (let t = 0; t < targets.length; t++) {
            const tv = targets[t];
            if (shouldIgnoreOccluder(tv, origin, ignoreSet)) continue;

            const cx = tv.sonarTarget.transform.position.x;
            const cy = tv.sonarTarget.transform.position.y;
            const R = tv.radius;
            const d = rayCircleNear(origin, cx, cy, R, ang);
            if (d < sNear) sNear = d;
        }

        let rVis = rOuter;
        if (rFront >= sNear) rVis = Math.min(rVis, sNear);

        rmax[i] = Math.max(0, rVis);
        const w = rmax[i] * rmax[i]; // ∝ area (½ cancels out across bins)
        weights[i] = w;
        total += w;
    }

    // build CDF
    const cdf = new Float32Array(bins);
    if (total <= 1e-12) {
        for (let i = 0; i < bins; i++) cdf[i] = (i + 1) / bins; // degenerate fallback
        return { bins, dphi, rmax, cdf, total: 0, origin: origin.clone() };
    }
    let acc = 0;
    for (let i = 0; i < bins; i++) {
        acc += weights[i] / total;
        cdf[i] = acc;
    }
    return { bins, dphi, rmax, cdf, total, origin: origin.clone() };
}

function sampleFromSweptSampler(s) {
    // pick bin
    const u = Math.random();
    let lo = 0, hi = s.cdf.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (u <= s.cdf[mid]) hi = mid; else lo = mid + 1;
    }
    // angle within bin
    const ang = (lo + Math.random()) * s.dphi;
    const rMax = s.rmax[lo];
    // radius uniform by area
    const r = Math.sqrt(Math.random()) * rMax;
    return { ang, r };
}

function shouldIgnoreOccluder(tv, origin, ignoreSet, eps = 1e-6) {
    // explicit ignores (can be tv, tv.sonarTarget, or its transform)
    if (ignoreSet) {
        if (ignoreSet.has(tv) ||
            ignoreSet.has(tv.sonarTarget) ||
            ignoreSet.has(tv.sonarTarget?.transform)) return true;
    }
    // auto-ignore if the ping origin lies inside the target circle
    const cx = tv.sonarTarget.transform.position.x;
    const cy = tv.sonarTarget.transform.position.y;
    const R = tv.radius;
    const d0 = Math.hypot(cx - origin.x, cy - origin.y);
    return d0 <= R + eps;
}