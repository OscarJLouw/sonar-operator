import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarTarget } from './SonarTargets/SonarTarget';
import { Utils } from '../utils/Utils';
import { SonarTargetConfig } from './SonarTargets/SonarTargetConfig';

export class World extends GameObject {

    Awake() {
        this.events = new EventTarget();
        this.spawning = false;

        this.sonarTargets = [];
        this.sonarTargetVisuals = [];
        this.targetCount = 0;
        this.totalTargetsSpawnedSoFar = 0;
        this.rotationSpeed = 0;

        this.worldRoot = new THREE.Group();
        this.AddComponent(this.worldRoot);

        this.shipRoot = new THREE.Group();
        this.worldRoot.add(this.shipRoot);
        
        this.startVelocity = new THREE.Vector3(); // vector for doing temporary math operations
        this.currentVelocity = new THREE.Vector3();
        this.targetVelocty = new THREE.Vector3();
        this.accelerationTime = 3;
        this.clock = new THREE.Clock();

        this.tempVector = new THREE.Vector3(); // vector for doing temporary math operations
    }

    Start() {
        this.sonarTargetsGroup = new THREE.Group();
        this.AddComponent(this.sonarTargetsGroup);
    }

    SpawnTargets(numTargets, config)
    {
        let targets = [];
        for (let i = 0; i < numTargets; i++) {
            targets.push(this.SpawnSonarTarget(config));
        }
        return targets;
    }

    SetVelocity(x, y, accelerationTime = 3)
    {
        this.accelerationTime = accelerationTime;
        this.clock.start();
        this.targetVelocty.set(x * 0.1, y * 0.1);
        this.startVelocity.set(this.currentVelocity.x, this.currentVelocity.y, 0);
    }

    SpawnSonarTarget(targetConfig) {
        var sonarTarget = GameObject.Instantiate(SonarTarget, this.sonarTargetsGroup, "SonarTarget " + this.totalTargetsSpawnedSoFar);
        sonarTarget.CreateFromConfig(targetConfig);

        this.sonarTargets.push(sonarTarget);
        sonarTarget.addEventListener("onRemoved", this.OnTargetRemoved);

        this.dispatchEvent(new CustomEvent("onTargetSpawned",
            {
                detail: {
                    target: sonarTarget,
                    targetConfig: targetConfig,
                    targetsSpawnedSoFar: this.totalTargetsSpawnedSoFar
                }
            }
        ));

        
        this.targetCount++;
        this.totalTargetsSpawnedSoFar++;

        return sonarTarget;
    }

    OnTargetRemoved = (event) =>
    {
        this.RemoveSonarTarget(event.detail.target);
    }

    RemoveSonarTarget(sonarTarget)
    {
        const targetIndex = this.sonarTargets.indexOf(sonarTarget); 
        if(targetIndex > -1)
        {
            this.sonarTargets.splice(targetIndex, 1); 
            sonarTarget.removeEventListener("onRemoved", this.OnTargetRemoved);
            this.targetCount--;
            sonarTarget.Destroy();
        }
    }

    StartGame()
    {
        this.spawning = false;
        this.spawnTime = 1;
        this.spawnCountdown = this.spawnTime;
        this.maxTargets = 10;
        this.randomRotate = false;
        this.SetVelocity(0, 0);

        //this.SpawnTargets(10);
    }

    Update(deltaTime) {
        /*
        if(this.spawning)
        {
            this.spawnCountdown -= deltaTime;
            if(this.spawnCountdown <= 0)
            {
                this.spawnCountdown = this.spawnTime;
                this.SpawnSonarTarget();
            }
        }
        */

        if(this.targetCount > this.maxTargets)
        {
            this.RemoveSonarTarget(this.sonarTargets[0]);
        }

        this.maxRotationSpeed = Math.PI*0.1;    // 10 seconds to do a full 180

        if(this.randomRotate)
        {
            this.rotationSpeed += (Math.random() - 0.5) * deltaTime;
            this.rotationSpeed = Utils.instance.Clamp(this.rotationSpeed, -this.maxRotationSpeed, this.maxRotationSpeed);
        } else {
            this.rotationSpeed = 0;
        }

        // Accelerate
        if(this.clock.running)
        {
            if(this.clock.elapsedTime < this.accelerationTime)
            {
            const accelerationPercentage = this.clock.elapsedTime / this.accelerationTime;
            this.currentVelocity.set(
                Utils.instance.Lerp(this.startVelocity.x, this.targetVelocty.x, accelerationPercentage),
                Utils.instance.Lerp(this.startVelocity.y, this.targetVelocty.y, accelerationPercentage),
                0
            );
            } else {
                this.clock.stop();
                this.currentVelocity.set(this.targetVelocty.x, this.targetVelocty.y, 0);
            }
        }

        // Move the ship
        this.shipRoot.rotateZ(this.rotationSpeed * deltaTime);

        this.tempVector.copy(Utils.up);
        this.tempVector.applyMatrix4(this.shipRoot.matrixWorld).normalize();
        this.tempVector.multiplyScalar(this.targetVelocty.y);

        this.shipRoot.position.set(
                this.shipRoot.position.x + this.tempVector.x * deltaTime,
                this.shipRoot.position.y + this.tempVector.y * deltaTime,
                0
        );

        // Move targets
        this.sonarTargets.forEach((sonarTarget) =>
        {
            this.tempVector.copy(sonarTarget.worldTransform.position);

            this.shipRoot.worldToLocal(this.tempVector);

            sonarTarget.transform.position.set(
                this.tempVector.x,
                this.tempVector.y,
                0
            );

            /*
            sonarTarget.transform.position.set(
                sonarTarget.transform.position.x + this.velocty.x * deltaTime,
                sonarTarget.transform.position.y + this.velocty.y * deltaTime,
                0
            )
            */
        })
    }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}