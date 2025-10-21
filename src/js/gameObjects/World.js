import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarTarget } from './SonarTarget';
import { Utils } from '../utils/Utils';

export class World extends GameObject {

    Awake() {
        this.events = new EventTarget();
        this.spawning = false;

        this.sonarTargets = [];
        this.sonarTargetVisuals = [];
        this.targetCount = 0;
        this.totalTargetsSpawnedSoFar = 0;
        this.velocty = new THREE.Vector3();
        this.rotationSpeed = 0;

        this.worldRoot = new THREE.Group();
        this.AddComponent(this.worldRoot);

        this.shipRoot = new THREE.Group();
        this.worldRoot.add(this.shipRoot);
        
        this.workingVector = new THREE.Vector3(); // vector for doing temporary math operations
    }

    Start() {
        this.sonarTargetsGroup = new THREE.Group();
        this.AddComponent(this.sonarTargetsGroup);
    }

    SpawnTargets(numTargets)
    {
        for (let i = 0; i < numTargets; i++) {
            SpawnSonarTarget();
        }
    }

    SetVelocity(x, y)
    {
        this.velocty.x = x;
        this.velocty.y = y;
    }

    SpawnSonarTarget() {
        var sonarTarget = GameObject.Instantiate(SonarTarget, this.sonarTargetsGroup, "SonarTarget " + this.totalTargetsSpawnedSoFar);
        this.sonarTargets.push(sonarTarget);
        sonarTarget.addEventListener("onRemoved", this.OnTargetRemoved);

        this.dispatchEvent(new CustomEvent("onTargetSpawned",
            {
                detail: {
                    target: sonarTarget,
                    targetsSpawnedSoFar: this.totalTargetsSpawnedSoFar
                }
            }
        ));

        
        this.targetCount++;
        this.totalTargetsSpawnedSoFar++;
    }

    OnTargetRemoved = (event) =>
    {
        RemoveSonarTarget(event.detail.target);
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
        this.spawning = true;
        this.spawnTime = 1;
        this.spawnCountdown = this.spawnTime;
        this.maxTargets = 10;
        this.SetVelocity(0.0, 0.01);
    }

    Update(deltaTime) {
        if(!this.spawning)
            return;

        this.spawnCountdown -= deltaTime;
        if(this.spawnCountdown <= 0)
        {
            this.spawnCountdown = this.spawnTime;
            this.SpawnSonarTarget();
        }

        if(this.targetCount > this.maxTargets)
        {
            this.RemoveSonarTarget(this.sonarTargets[0]);
        }

        this.maxRotationSpeed = Math.PI*0.1;    // 10 seconds to do a full 180

        this.rotationSpeed += (Math.random() - 0.5) * deltaTime;
        this.rotationSpeed = Utils.instance.Clamp(this.rotationSpeed, -this.maxRotationSpeed, this.maxRotationSpeed);

        // Move the ship
        this.shipRoot.rotateZ(this.rotationSpeed * deltaTime);

        this.workingVector.copy(Utils.up);
        this.workingVector.applyMatrix4(this.shipRoot.matrixWorld).normalize();
        this.workingVector.multiplyScalar(this.velocty.y);

        this.shipRoot.position.set(
                this.shipRoot.position.x + this.workingVector.x * deltaTime,
                this.shipRoot.position.y + this.workingVector.y * deltaTime,
                0
        );



        // Move targets
        this.sonarTargets.forEach((sonarTarget) =>
        {
            this.workingVector.copy(sonarTarget.worldTransform.position);

            this.shipRoot.worldToLocal(this.workingVector);

            sonarTarget.transform.position.set(
                this.workingVector.x,
                this.workingVector.y,
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