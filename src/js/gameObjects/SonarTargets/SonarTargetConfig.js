import * as THREE from 'three';
export class SonarTargetConfig {
    constructor(
        name, 
        soundKey, 
        {
        radius = 0.2, randomizeRadius = false, minRadius = 0.05, maxRadius = 0.25,
        spawnAtRandomPosition = false, spawnPosition = null,
        moveOverTime = false, randomMovement = false, xVelocity = 0, yVelocity = 0,
        visibleOnActiveSonar = false, activeSonarModelKey,
        }
    )
    {
        this.name = name;
        this.soundKey = soundKey;

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
    }
}