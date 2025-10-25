import * as THREE from 'three';
import { GameObject } from './GameObject';
import { SonarViewController } from './SonarViewController';
import { Knob } from './Knob';
import { MeshManager } from '../managers/MeshManager';
import { SonarTarget } from './SonarTargets/SonarTarget';
import { SonarTargetVisual } from './SonarTargets/SonarTargetVisual';
import { SonarTargetAudio } from './SonarTargets/SonarTargetAudio';
import { DialogueManager } from '../managers/DialogueManager';
import { SoundClasses } from './SonarTargets/SonarTargetConfig';
import { Button } from './UI/Button';
import { SceneManager } from '../managers/SceneManager';
import { AudioManager } from '../managers/AudioManager';


export class SonarMachine extends GameObject {

    Awake() {
        this.events = new EventTarget();
        
        this.sonarViewerScale = 0.8;
        this.sonarViewerPositionOffset = new THREE.Vector3(0.45, 0.1);

        this.sonarScreenPanel = MeshManager.instance.models.sonarScreenPanel;
        this.sonarScreenPanel.rotateY(Math.PI);
        //this.sonarScreenPanel.scale.set(0.5, 0.5, 0.5);
        this.sonarScreenPanel.scale.set(this.sonarViewerScale * 0.95, this.sonarViewerScale * 0.95, this.sonarViewerScale * 0.95);
        this.sonarScreenPanel.position.set(this.sonarViewerPositionOffset.x, this.sonarViewerPositionOffset.y, this.sonarViewerPositionOffset.z, 0.5);
        this.AddComponent(this.sonarScreenPanel);

        this.controlPanelOffset = new THREE.Vector3(0.43, 0.08, 0.6);
        this.controlPanelScale = new THREE.Vector3(0.71, 0.71, 0.71);
        this.controlsPanel = MeshManager.instance.models.controlsPanel;
        this.controlsPanel.rotateY(Math.PI);
        this.controlsPanel.scale.set(this.controlPanelScale.x, this.controlPanelScale.y, this.controlPanelScale.z);
        this.controlsPanel.position.set(this.controlPanelOffset.x, this.controlPanelOffset.y, this.controlPanelOffset.z);
        this.AddComponent(this.controlsPanel);

        this.indicatorLight = MeshManager.instance.models.indicatorLight;
        this.indicatorLight.rotateY(Math.PI);
        this.indicatorLight.scale.set(0.71, 0.71, 0.71);
        this.indicatorLight.position.set(this.controlPanelOffset.x, this.controlPanelOffset.y, this.controlPanelOffset.z);
        this.AddComponent(this.indicatorLight);

        // Viewing area ring
        this.viewAreaGeometry = new THREE.CircleGeometry(this.sonarViewerScale);
        this.viewAreaMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x010306) });

        this.viewAreaMesh = new THREE.Mesh(this.viewAreaGeometry, this.viewAreaMaterial);
        this.viewAreaMesh.position.set(this.sonarViewerPositionOffset.x, this.sonarViewerPositionOffset.y, -1);
        this.AddComponent(this.viewAreaMesh);

        // Sonar viewer
        this.sonarViewController = GameObject.Instantiate(SonarViewController, this.transform, "Sonar ViewCone");
        this.sonarViewController.transform.scale.set(this.sonarViewerScale, this.sonarViewerScale, 1);
        this.sonarViewController.transform.position.set(this.sonarViewerPositionOffset.x, this.sonarViewerPositionOffset.y, this.sonarViewerPositionOffset.z);

        // Knob angle indicator base plate meshes
        this.basePlateMesh = MeshManager.instance.models.basePlateFull;
        this.halfBasePlateMesh = MeshManager.instance.models.basePlateHalf;
        this.basePlates = [];

        ////// Knobs
        const fullCircle = Math.PI * 2;

        const knobScale = 0.1;
        const basePlatesScale = 1;

        const extraXOffset = -0.1;

        const angleKnobAngle = 0.83;
        const angleKnobOffset = 1.1;

        const distanceKnobAngle = 0.78;
        const distanceKnobOffset = 1.4;

        const angleRangeKnobAngle = 0.66;
        const angleRangeKnobOffset = 1.1;

        const distanceRangeKnobAngle = 0.71;
        const distanceRangeKnobOffset = 1.4;

        const knobDepth = 1;

        // Angle knob
        this.angleKnob = GameObject.Instantiate(Knob, this.transform, "Angle Knob", false, true, false);
        var distance = angleKnobOffset;
        var offsetAngle = angleKnobAngle * fullCircle;
        this.angleKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance + extraXOffset, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, knobDepth);
        this.angleKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.CreateBasePlate(this.angleKnob, false, basePlatesScale);

        // Angle range knob
        this.angleRangeKnob = GameObject.Instantiate(Knob, this.transform, "Angle Range Knob", true, true, true);
        var distance = angleRangeKnobOffset;
        offsetAngle = angleRangeKnobAngle * fullCircle;
        this.angleRangeKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance + extraXOffset, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, knobDepth);
        this.angleRangeKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.angleRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.angleRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.angleRangeKnob, true, basePlatesScale);

        // Distance knob
        this.distanceKnob = GameObject.Instantiate(Knob, this.transform, "Distance Knob", true, true, true);
        distance = distanceKnobOffset;
        offsetAngle = distanceKnobAngle * fullCircle;
        this.distanceKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance + extraXOffset, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, knobDepth);
        this.distanceKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.distanceKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceKnob, true, basePlatesScale);

        // Distance range knob
        this.distanceRangeKnob = GameObject.Instantiate(Knob, this.transform, "Distance Range Knob", true, true, true);
        var distance = distanceRangeKnobOffset;
        offsetAngle = distanceRangeKnobAngle * fullCircle;
        this.distanceRangeKnob.transform.position.set(this.sonarViewerPositionOffset.x + Math.sin(offsetAngle) * distance + extraXOffset, this.sonarViewerPositionOffset.y + Math.cos(offsetAngle) * distance, knobDepth);
        this.distanceRangeKnob.transform.scale.set(knobScale, knobScale, knobScale);
        this.distanceRangeKnob.SetClampRotation(true, 0, Math.PI);
        //this.distanceRangeKnob.SetRelativeRotationControl(false);
        this.CreateBasePlate(this.distanceRangeKnob, true, basePlatesScale);

        // 
        this.pingButton = GameObject.Instantiate(Button, this.transform, "Ping Button");
        this.pingButton.transform.scale.set(0.55, 0.21, 1);
        this.pingButton.transform.position.set(-0.81, -0.83, 1);
        this.pingButton.SetClickAction(this.Ping.bind(this));    // bind the "this" context to the main menu
        this.pingButton.material.opacity = 0;
        this.pingButton.SetMeshIsForDrawing(false);

        this.sonarButtonMesh = MeshManager.instance.models.sonarButton;
        //this.sonarButtonMesh.scale.set(this.controlPanelScale.x, this.controlPanelScale.y, this.controlPanelScale.z);
        this.sonarButtonMesh.position.set(0.56, 0.17, 1);
        this.sonarButtonMesh.rotateY(Math.PI);
        this.AddComponent(this.sonarButtonMesh);


        this.sonarHousingMesh = MeshManager.instance.models.sonarHousing;
        this.sonarHousingMesh.position.set(0.56, 0.17, 1);
        this.sonarHousingMesh.rotateY(Math.PI);
        this.AddComponent(this.sonarHousingMesh);


        //this.pingButton.material.map = MeshManager.instance.textures.startButtonTexture;

        // Sound sources
        this.sonarTargets = [];
        this.sonarTargetVisuals = [];
        this.sonarTargetAudios = [];

        this.SetActiveSonarAuthorised(false);
        this.SetActiveSonarAvailable(false);
        this.SetActiveSonarCooldown(5);
    }

    SetActiveSonarAuthorised(authorised)
    {
        this.activeSonarAuthorised = authorised;

        if(!authorised && this.activeSonarAvailable)
        {
            this.SetActiveSonarAvailable(false);
        } else if(authorised && !this.activeSonarAvailable)
        {
            this.SetActiveSonarAvailable(true);
        }
    }

    SetActiveSonarAvailable(available)
    {
        this.activeSonarAvailable = available;
        
        this.indicatorLight.material.emissive = available ? new THREE.Color(0xb2d942) : new THREE.Color(0x52c33f);
        this.indicatorLight.material.emissiveIntensity = available ? 5 : 0.1;
    }

    SetActiveSonarCooldown(cooldown)
    {
        this.activeSonarCooldown = cooldown;
    }

    async PressSonarButton(deltaTime)
    {
        this.SetActiveSonarAvailable(false);
        this.sonarButtonMesh.position.z = 0.95;

        await this.#sleep(0.25);
        this.sonarButtonMesh.position.z = 1;

        if(this.activeSonarAuthorised)
        {
            await this.#sleep(this.activeSonarCooldown);
            if(this.activeSonarAuthorised)
            {
                this.SetActiveSonarAvailable(true);
            }
        }
    }

    Ping() {
        if(this.activeSonarAvailable)
        {
            this.dispatchEvent(new Event("onPing"));
            this.PressSonarButton();
            this.sonarViewController.Ping();
            AudioManager.instance.playOneShot("sonarBlip", { bus: 'sfx', volume: 0.9, rate: 1 });
        }
    }

    SetWorld(world) {
        this.world = world;
        this.world.addEventListener("onTargetSpawned", this.OnTargetSpawned);
    }

    CreateBasePlate(knob, halfBasePlate, scaleMultiplier = 1) {
        var basePlate;
        if (halfBasePlate) {
            basePlate = this.halfBasePlateMesh.clone();
        } else {
            basePlate = this.basePlateMesh.clone();
        }

        basePlate.rotation.x = Math.PI * 0.5;
        basePlate.position.set(knob.transform.position.x, knob.transform.position.y, knob.transform.position.z);
        basePlate.scale.set(knob.transform.scale.x * scaleMultiplier, knob.transform.scale.y * scaleMultiplier, knob.transform.scale.z * scaleMultiplier);

        this.AddComponent(basePlate);
        this.basePlates.push(basePlate);
    }

    Start() {
        this.angleKnob.SetAngle(-Math.PI / 2);
        this.angleRangeKnob.SetPercentage(0.2);
        this.distanceKnob.SetPercentage(0.4);
        this.distanceRangeKnob.SetPercentage(0.4);

        const numSources = 10;

        this.sonarVisualsGroup = new THREE.Group();
        this.AddComponent(this.sonarVisualsGroup);

        this.testDelay = 0.05;
        this.testCountdown = this.testDelay;
    }

    AddSonarTarget(sonarTarget, name) {
        this.sonarTargets.push(sonarTarget);

        var sonarTargetVisual = GameObject.Instantiate(SonarTargetVisual, this.sonarVisualsGroup, name);
        sonarTargetVisual.SetSonarViewerProperties(this.sonarViewerPositionOffset, this.sonarViewerScale);
        sonarTargetVisual.Link(sonarTarget);
        this.sonarTargetVisuals.push(sonarTargetVisual);
        this.sonarViewController.AddSonarTargetVisuals(sonarTargetVisual);

        var sonarTargetAudio = GameObject.Instantiate(SonarTargetAudio, this.sonarVisualsGroup, name)
        sonarTargetAudio.Link(sonarTarget);
        this.sonarTargetAudios.push(sonarTargetAudio);

        sonarTarget.addEventListener("onRemoved", this.OnTargetRemoved);
        sonarTarget.addEventListener("discoveredTarget", this.OnDiscoveredTarget);

        const arcParameters = this.sonarViewController.GetArcParameters();
        sonarTarget.SetArcParameters(arcParameters.innerRadius, arcParameters.outerRadius, arcParameters.thetaMin, arcParameters.thetaMax, arcParameters.arcArea);
    }

    RemoveSonarTarget(sonarTarget) {
        const targetIndex = this.sonarTargets.indexOf(sonarTarget);
        if (targetIndex > -1) {
            this.sonarViewController.RemoveSonarTargetVisuals(this.sonarTargetVisuals[targetIndex]);

            //this.sonarTargetVisuals[targetIndex].Unlink();
            this.sonarTargetVisuals.splice(targetIndex, 1);
            this.sonarTargetAudios.splice(targetIndex, 1);
            this.sonarTargets.splice(targetIndex, 1);
            sonarTarget.removeEventListener("onRemoved", this.OnTargetRemoved);
        }
    }

    OnTargetSpawned = (event) => {
        this.AddSonarTarget(event.detail.target, "SonarTargetVisual " + event.detail.targetsSpawnedSoFar);
    }

    OnTargetRemoved = (event) => {
        this.RemoveSonarTarget(event.detail.target);
    }

    OnDiscoveredTarget = (event) => {
        this.DiscoverTarget(event.detail.target);
    }

    async DiscoverTarget(sonarTarget) {
        /*
        const targetIndex = this.sonarTargets.indexOf(sonarTarget);
        const soundClass = sonarTarget.targetConfig.soundClass;

        var dialogueManager = DialogueManager.instance;
        const { selected, isCorrect } = await dialogueManager.sonarIdentify({
            correct: soundClass, // 'Biophony' | 'Geophony' | 'Anthropogenic' | 'Unknown'
            responses: SoundClasses, // { Biophony: '...', Geophony: '...', ... }
            speaker: 'Operator'
        });
        */
    }


    Update(deltaTime) {
        this.testCountdown -= deltaTime;
        if (this.testCountdown <= 0) {
            this.testCountdown = this.testDelay;

            if (!this.sonarViewController.HasArcChangedSinceLastChecked()) {
                // hasn't changed, don't bother updating sound sources
                return;
            }

            const arcParameters = this.sonarViewController.GetArcParameters();

            this.sonarTargets.forEach(sonarTarget => {
                sonarTarget.SetArcParameters(arcParameters.innerRadius, arcParameters.outerRadius, arcParameters.thetaMin, arcParameters.thetaMax, arcParameters.arcArea);
            });
        }
    }

    SetVisible(visible) {
        this.components.forEach(component => {
            component.visible = visible;
            component.layers.set(visible ? 0 : 1);
        });

        // this.mesh.visible = visible;
        // this.mesh.layers.set(visible ? 0 : 1);

        this.angleKnob.SetActive(visible);
        this.angleRangeKnob.SetActive(visible);
        this.distanceKnob.SetActive(visible);
        this.distanceRangeKnob.SetActive(visible);
        this.sonarViewController.SetActive(visible);

        this.sonarTargets.forEach(sonarTarget => {
            sonarTarget.SetVisible(visible);
        });

        this.sonarTargetVisuals.forEach(sonarTargetVisual => {
            sonarTargetVisual.SetVisible(visible);
        });


        visible ? this.pingButton.Show() : this.pingButton.Hide();

    }

    OnEnable() {
        this.SetVisible(true);
        this.angleKnob.addEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.addEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.addEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.addEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
        this.pingButton.Show();
    }

    OnDisable() {
        this.SetVisible(false);
        this.angleKnob.removeEventListener("knobAngleChanged", this.OnAngleChanged);
        this.angleRangeKnob.removeEventListener("knobAngleChanged", this.OnAngleRangeChanged);
        this.distanceKnob.removeEventListener("knobAngleChanged", this.OnDistanceChanged);
        this.distanceRangeKnob.removeEventListener("knobAngleChanged", this.OnDistanceRangeChanged);
    }

    OnAngleChanged = (e) => {
        this.sonarViewController.SetTargetAngle(e.detail.angle);
    }

    OnAngleRangeChanged = (e) => {
        this.sonarViewController.SetTargetAngleRange(1 - e.detail.percentage);
    }

    OnDistanceChanged = (e) => {
        this.sonarViewController.SetTargetDistance(1 - e.detail.percentage);
    }

    OnDistanceRangeChanged = (e) => {
        this.sonarViewController.SetTargetDistanceRange(1 - e.detail.percentage);
    }

    OnDestroy() {
        if (this.geometry) this.geometry.dispose();

        if (this.material) {
            if (this.material.map) {
                this.material.map.dispose();
            }

            this.material.dispose();
        }

        if (this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;

        if (this.angleKnob) {
            this.angleKnob.Destroy();
        }
    }


    #sleep(s) { return new Promise(r => setTimeout(r, s * 1000)); }

    // Events
    addEventListener(...args) { this.events.addEventListener(...args); }
    removeEventListener(...args) { this.events.removeEventListener(...args); }
    dispatchEvent(event) { return this.events.dispatchEvent(event); }
}