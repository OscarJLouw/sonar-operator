import { PortalsController } from "./PortalsController";

export class PlayerMovementController extends EventTarget {
    constructor() {
        super();

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

        this.states =
        {
            None:
            {
                taskName: "None"
            },

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

        // Null state, where all arrows are hidden
        this.stateExits.set(this.states.None, []);


        // Entry state
        this.stateExits.set(this.states.Entry,
            [
                {
                    direction: this.directions.Forward,
                    targetState: this.states.SittingAtSonar
                },
                {
                    direction: this.directions.Right,
                    targetState: this.states.Porthole
                },
                {
                    direction: this.directions.Left,
                    targetState: this.states.Desk
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.states.Door
                }
            ]
        );

        // Door 
        this.stateExits.set(this.states.Door,
            [
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.states.Entry
                }
            ]
        );

        // Sitting at sonar
        this.stateExits.set(this.states.SittingAtSonar,
            [
                {
                    direction: this.directions.Forward,
                    targetState: this.states.UsingSonar
                },
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.states.Desk
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.states.FacingRoomFromSitting
                }
            ]
        );

        // Using sonar
        this.stateExits.set(this.states.UsingSonar,
            [
                {
                    direction: this.directions.Back,
                    targetState: this.states.SittingAtSonar
                }
            ]
        );

        // Desk
        this.stateExits.set(this.states.Desk,
            [
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.states.FacingRoomFromSitting
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.states.SittingAtSonar
                }
            ]
        );

        // Facing Room From Sitting
        this.stateExits.set(this.states.FacingRoomFromSitting,
            [
                {
                    direction: this.directions.Left,
                    targetState: this.states.Porthole
                },
                {
                    direction: this.directions.Right,
                    targetState: this.states.Door
                },
                {
                    direction: this.directions.RotateLeft,
                    targetState: this.states.SittingAtSonar
                },
                {
                    direction: this.directions.RotateRight,
                    targetState: this.states.Desk
                }
            ]
        );

        // Porthole
        this.stateExits.set(this.states.Porthole,
            [
                {
                    direction: this.directions.Back,
                    targetState: this.states.FacingRoomFromSitting
                }
            ]
        );

        this.EnterState(this.states.None);
    }

    EnterState(targetState) {
        const previousState = this.currentState;
        this.currentState = targetState;

        if (targetState == this.stateExits.None) {
            this.exits = null;
            return;
        }

        this.exits = this.GetExits(this.currentState);
        this.MoveToCamera(this.currentState);

        const onEnterStateEvent = new CustomEvent("onEnterState",
            {
                detail: {
                    previousState: previousState,
                    newState: targetState
                }
            });

        this.dispatchEvent(onEnterStateEvent);
    }

    GetExits(state) {
        var exits = this.stateExits.get(state);
        if (exits === undefined) {
            console.log("State exits not found for " + state + "!");
            return null;
        }

        return exits;
    }

    Move(direction) {
        var targetState = this.exits.find(x => x.direction == direction).targetState;
        this.EnterState(targetState);
    }

    MoveToCamera(cameraState) {
        PortalsController.instance.SendMessage(cameraState.taskName, PortalsController.instance.TaskStates.AnyToComplete);
    }
}