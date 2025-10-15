import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Utils } from '../utils/Utils';

export class SonarViewController extends GameObject {

    // Life cycle
    Awake()
    {
        this.geometry = new THREE.RingGeometry(0, 1, 32, 1, 0, Math.PI*0.2);
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(0.1, 0.8, 0.2)});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, -0.1);

        this.AddComponent(this.mesh);

        this.angle = 0;
        this.targetAngle = 0;
        this.angleRange = 0.2;
        this.targetangleRange = 0.2;
        this.distance = 0;
        this.targetDistance = 0;
        this.distanceRange = 1;
        this.targetDistanceRange = 1;

        this.angularSize = this.angleRange * Math.PI*2;

    }

    Start()
    {
    }

    OnEnable()
    {
        this.mesh.visible = true;
    }

    OnDisable()
    {
        this.mesh.visible = false;
    }

    OnDestroy()
    {
        if(this.geometry) this.geometry.dispose();

        if(this.material){
            if(this.material.map)
            {
                this.material.map.dispose();
            }

            this.material.dispose();
        }
        
        if(this.mesh) this.RemoveComponent(this.mesh);

        this.mesh = undefined;
    }


    Update(deltaTime)
    {
        //this.SetAngle(this.angle += deltaTime * Math.PI*2);
    }


    // Updating the mesh
    UpdateGeometry()
    {
        this.mesh.geometry.dispose();
        this.angularSize = this.angleRange * Math.PI * 2;
        
        const halfDistanceRange = this.distanceRange * 0.5;
        let effectiveDistance = Utils.instance.Lerp(halfDistanceRange, 1-halfDistanceRange, this.distance);

        let startPoint = Math.max(effectiveDistance - halfDistanceRange, 0);
        let endPoint = Math.min(effectiveDistance + halfDistanceRange, 1);

        const degreesPerSegment = 15;
        const segments = Math.ceil(this.angularSize / (degreesPerSegment * Math.PI/180));

        this.mesh.geometry = new THREE.RingGeometry(startPoint, endPoint, segments, 1, 0, this.angularSize);

        
        this.UpdateRotation();
    }

    UpdateRotation()
    {
        this.transform.setRotationFromAxisAngle(Utils.forward, this.angle - this.angularSize * 0.5);
    }
    
    // Global parameter setters

    SetAngle(angle, forceUpdateTarget = false)
    {
        if(this.angle != angle)
        {
            this.angle = angle;
            this.UpdateRotation();
        }
        
        if(forceUpdateTarget)
        {
            this.SetTargetAngle(angle);
        }

        this.UpdateRotation();
    }

    SetTargetAngle(angle)
    {
        this.targetAngle = angle;
    }


    SetAngleRange(angleRange, forceUpdateTarget = false)
    {
        if(this.angleRange != angleRange)
        {
            this.angleRange = angleRange;
            this.UpdateGeometry();
        }
        
        if(forceUpdateTarget)
        {
            this.SetTargetAngleRange(angleRange);
        }
    }

    SetTargetAngleRange(angleRange)
    {
        this.targetAngleRange = angleRange;
    }

    SetDistance(distance, forceUpdateTarget = false)
    {
        if(this.distance != distance)
        {
            this.distance = distance;
            this.UpdateGeometry();
        }
        
        if(forceUpdateTarget)
        {
            this.SetTargetDistance(distance);
        }
    }

    SetTargetDistance(distance)
    {
        this.targetDistance = distance;
    }

    SetDistanceRange(distanceRange, forceUpdateTarget = false)
    {
        if(this.distanceRange != distanceRange)
        {
            this.distanceRange = distanceRange;
            this.UpdateGeometry();
        }
        
        if(forceUpdateTarget)
        {
            this.SetTargetDistanceRange(distanceRange);
        }
    }

    SetTargetDistanceRange(distanceRange)
    {
        this.targetDistanceRange = distanceRange;
    }


}