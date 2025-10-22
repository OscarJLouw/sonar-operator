import * as THREE from 'three';

export const SoundClasses = {
    biophony: 'Biophony',
    geophony: 'Geophony',
    anthropogenic: 'Anthropogenic',
    unknown: 'Unknown'
}

export class SonarTargetConfig {
    constructor(
        name,
        soundKey,
        {
            randomizeSoundStartTime = true,
            radius = 0.2, randomizeRadius = false, minRadius = 0.05, maxRadius = 0.25,
            spawnAtRandomPosition = false, spawnPosition = null,
            moveOverTime = false, randomMovement = false, xVelocity = 0, yVelocity = 0,
            visibleOnActiveSonar = false, activeSonarModelKey,
            discoveryThreshold = 0.7,
            soundClass = SoundClasses.biophony
        } = {}
    ) {
        this.name = name;
        this.discoveryThreshold = discoveryThreshold;

        this.soundKey = soundKey;
        this.randomizeSoundStartTime = randomizeSoundStartTime;

        this.radius = radius;
        this.randomizeRadius = randomizeRadius;
        this.minRadius = minRadius;
        this.maxRadius = maxRadius;

        this.spawnAtRandomPosition = spawnAtRandomPosition;
        this.spawnPosition = spawnPosition;

        this.moveOverTime = moveOverTime;
        this.randomMovement = randomMovement;

        this.velocity = new THREE.Vector3(xVelocity, yVelocity, 0);

        this.visibleOnActiveSonar = visibleOnActiveSonar;
        this.activeSonarModelKey = activeSonarModelKey;
        this.SoundClass = soundClass;
    }

}