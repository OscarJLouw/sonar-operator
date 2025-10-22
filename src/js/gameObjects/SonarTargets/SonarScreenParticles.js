import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { Utils } from '../../utils/Utils';


// --------------------------- main class ---------------------------
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

    this.pointsMaterial = new THREE.PointsMaterial({ size: 1,
        color: 0x51C079
        /*, sizeAttenuation:true*/ });

    // FIX: use the material you created
    this.points = new THREE.Points(this.geometry, this.pointsMaterial);

    this.AddComponent(this.points);
    this.updating = true;
    this.pinging = false;
    this.pingGrowTime = 1;
    this.pingHangTime = 1.5;
    this.pingCountdown = 0;
    this.pingParticlesPlaced = 0;

    // cache for angle CDF across frames while the front moves slowly
    this._angleCDF = null;
    this._cdfRFront = -1;
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

    // reset CDF cache
    this._angleCDF = null;
    this._cdfRFront = -1;
  }

  AnimatePing(deltaTime) {
    this.pingCountdown -= deltaTime;
    const positions = this.points.geometry.attributes.position.array;
    const targetVisualsList = this.sonarViewController.targetVisualsList;

    if (this.pingCountdown > this.pingHangTime) {
      const growPct = 1 - ((this.pingCountdown - this.pingHangTime) / this.pingGrowTime);
      this.pingDistanceOuter = Utils.instance.Lerp(0.1, 1, growPct);
      this.pingDistanceInner = Utils.instance.Lerp(0, 1, growPct);

      const targetParticlesPlaced = Math.floor(this.positionCount * growPct);
      const difference = targetParticlesPlaced - this.pingParticlesPlaced;

      if (difference > 0) {
        // Build CDF for the *front* of the ring so shadows only appear once the wavefront hits
        const rFront = this.pingDistanceInner;
        if (!this._angleCDF || Math.abs(rFront - this._cdfRFront) > 0.002) { // small hysteresis
          this._angleCDF = buildOcclusionCDFFront(
            targetVisualsList,
            rFront,
            /* penumbraWidth */ 0.03,
            /* shadowSpread  */ 0.0   // set >0 to smear shadow behind target
          );
          this._cdfRFront = rFront;
        }

        // Spawn new points uniformly by area in the current annulus
        const rInner = this.pingDistanceInner;
        const rOuter = this.pingDistanceOuter;

        for (let i = this.pingParticlesPlaced; i < targetParticlesPlaced; i++) {
          const i3 = i * 3;

          const u = Math.random();
          const spawnRadius = Math.sqrt(rInner * rInner + u * (rOuter * rOuter - rInner * rInner));

          const angle = sampleAngleFromCDF(this._angleCDF);

          positions[i3 + 0] = Math.cos(angle) * spawnRadius;
          positions[i3 + 1] = Math.sin(angle) * spawnRadius;
          positions[i3 + 2] = 0;
        }

        this.pingParticlesPlaced = targetParticlesPlaced;
      }
    } else if (this.pingCountdown <= 0) {
      this.pinging = false;
    }

    // slight jitter
    for (let i = 0; i < this.pingParticlesPlaced; i++) {
      const i3 = i * 3;
      positions[i3 + 0] += (Math.random() - 0.5) * deltaTime * 0.2;
      positions[i3 + 1] += (Math.random() - 0.5) * deltaTime * 0.2;
      positions[i3 + 2] = 0;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  Update(deltaTime) {
    if (this.sonarViewController == null || !this.updating) return;

    if (this.pinging) {
      this.AnimatePing(deltaTime);
      return;
    }

    // --- your idle scatter logic unchanged ---
    const targetVisualsList = this.sonarViewController.targetVisualsList;
    const particlesPerTarget = Math.floor((this.positionCount - 20) / targetVisualsList.length);
    const remainingParticles = this.positionCount - particlesPerTarget;

    const positions = this.points.geometry.attributes.position.array;
    let spawnRadius = 1;
    let visibilityPercentage = 0;
    let offsetX = 0;
    let offsetY = 0;

    let currentPoint = 0;
    const maxRadius = 0.2;
    let minRadius = 0;

    for (let i = 0; i < targetVisualsList.length; i++) {
      const targetVisual = targetVisualsList[i];

      /*if(targetVisual.discovered || !targetVisual.overlapping)
        continue;*/

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
        positions[i3 + 0] = offsetX + Math.cos(angle) * randomSpawnRadius + (Math.random() * minRadius * 2 - minRadius) * accuracy;
        positions[i3 + 1] = offsetY + Math.sin(angle) * randomSpawnRadius + (Math.random() * minRadius * 2 - minRadius) * accuracy;
        positions[i3 + 2] = 0;
        currentPoint++;
      }
    }

    spawnRadius = 1;
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




// ---------- helpers (module-level; not re-created each frame) ----------
const TAU = Math.PI * 2;

function wrapAngle(a) {
  a = a % TAU;
  return a < 0 ? a + TAU : a;
}

function pushInterval(intervals, start, end) {
  start = wrapAngle(start);
  end   = wrapAngle(end);
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
    const cur  = intervals[i];
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
// penumbraWidth adds a tiny soft edge; shadowSpread can smear further behind the target (set 0 for pure silhouette).
function buildOcclusionCDFFront(targetVisualsList, rFront, penumbraWidth = 0.03, shadowSpread = 0.0) {
  const intervals = [];
  for (let i = 0; i < targetVisualsList.length; i++) {
    const tv = targetVisualsList[i];
    const cx = tv.sonarTarget.transform.position.x;
    const cy = tv.sonarTarget.transform.position.y;
    const d  = Math.hypot(cx, cy);
    const R  = tv.radius;
    const theta = Math.atan2(cy, cx);

    let beta = halfAngleAtRadius(d, R, rFront);
    if (beta <= 0) continue;                      // wavefront hasn't reached this target yet
    beta += penumbraWidth;
    if (shadowSpread > 0) beta += shadowSpread * Math.max(0, rFront - d);

    pushInterval(intervals, theta - beta, theta + beta);
  }
  const merged  = mergeIntervals(intervals);
  const visible = buildVisibleSegments(merged);
  return buildAngleCDF(visible);
}