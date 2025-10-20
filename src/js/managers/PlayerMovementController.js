import { PortalsController } from "./PortalsController";

export class PlayerMovementController {
    constructor() {
        // Singleton pattern
        if (!PlayerMovementController.instance) {
            PlayerMovementController.instance = this;
        }

        return PlayerMovementController.instance;
    }

    Setup() {
        this.directions = {
            Forward: "Forward",
            Back: "Back",
            Left: "Left",
            Right: "Right",
            RotateLeft: "Rotate Left",
            RotateRight: "Rotate Right"
        }

        this.cameraStates =
        {
            Entry:
            {
                taskName: "P01_Entry",
            },

            Door: {
                taskName: "P02_Door",
            },

            SittingAtSonar: {
                taskName: "P05_SittingAtSonar",
            },

            UsingSonar: {
                taskName: "P06_UsingSonar",
            },

            Desk: {
                taskName: "P08_Desk",
            },

            FacingRoomFromSitting: {
                taskName: "P10_FacingRoomFromSitting",
            },

            Porthole: {
                taskName: "P12_Porthole"
            }
        };


        // Define exit arrow directions
        this.stateExits = new Map();

        // Entry state
        this.stateExits.set(this.cameraStates.Entry,
            [
                {
                    direction: this.directions.Forward,
                    targetState: this.cameraStates.SittingAtSonar
                },
                {
                    direction: this.directions.Left,
                    targetState: this.cameraStates.Desk
                },
                {
                    direction: this.directions.Right,
                    targetState: this.cameraStates.Porthole
                },
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.cameraStates.Door
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.cameraStates.Door
                }
            ]
        );

        // Door 
        this.stateExits.set(this.cameraStates.Door,
            [
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.cameraStates.Entry
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.cameraStates.Entry
                }
            ]
        );

        // Sitting at sonar
        this.stateExits.set(this.cameraStates.SittingAtSonar,
            [
                {
                    direction: this.directions.Forward,
                    targetState: this.cameraStates.UsingSonar
                },
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.cameraStates.Desk
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.cameraStates.FacingRoomFromSitting
                }
            ]
        );

        // Using sonar
        this.stateExits.set(this.cameraStates.UsingSonar,
            [
                {
                    direction: this.directions.Back,
                    targetState: this.cameraStates.SittingAtSonar
                }
            ]
        );

        // Desk
        this.stateExits.set(this.cameraStates.Desk,
            [{
                direction: this.directions.RotateLeft,
                targetState: this.cameraStates.FacingRoomFromSitting
            },
            {
                direction: this.directions.RotateRight,
                targetState: this.cameraStates.SittingAtSonar
            }
            ]
        );

        // Facing Room From Sitting
        this.stateExits.set(this.cameraStates.FacingRoomFromSitting,
            [
                {
                    direction: this.directions.Left,
                    targetState: this.cameraStates.Porthole
                },
                {
                    direction: this.directions.Right,
                    targetState: this.cameraStates.Door
                },
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.cameraStates.SittingAtSonar
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.cameraStates.Desk
                }
            ]
        );

        // Porthole
        this.stateExits.set(this.cameraStates.Porthole,
            [
                {
                    direction: this.directions.Back,
                    targetState: this.cameraStates.FacingRoomFromSitting
                }
            ]
        );

        this.currentState = this.cameraStates.Entry;
    }

    Move(direction)
    {
        console.log(direction);
    }

    MoveToCamera(cameraStateName) {
        PortalsController.instance.SendMessage(cameraStateName, PortalsController.TaskStates.AnyToCompleted);
    }
}