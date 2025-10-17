export class ResizeHandler {
    constructor() {
        // Singleton pattern
        if (!ResizeHandler.instance) {
            ResizeHandler.instance = this;

            this.Setup();
        }
        return ResizeHandler.instance;
    }

    Setup() {
        this.resizables = [];
        window.addEventListener('resize', () => this.HandleResize());
        this.HandleResize();
    }

    AddResizable(resizable) {
        // Check object is derived from Resizable
        if (!(resizable instanceof Resizable)) {
            console.error("Object " + resizable + " does not inherit from Resizable.");
            return;
        }

        // Check object is not already stored in resizable list
        for (let i = 0; i < this.resizables.length; i++) {
            if (this.resizables[i] === resizable) {
                return;
            }
        }

        this.resizables.push(resizable);
    }
    

    RemoveResizable(resizable) {
        if (!(resizable instanceof Resizable)) {
            console.error("Object " + resizable + " does not inherit from Resizable.");
            return;
        }

        // Filter out all instances of the object
        this.resizables = this.resizables.filter(function(resizable) {
            return resizable !== value;
        })
    }

    HandleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspectRatio = this.width / this.height;

        this.resizables.forEach(resizable => {
            resizable.width = this.width;
            resizable.height = this.height;
            resizable.aspectRatio = this.aspectRatio;
            resizable.Resize(this.width, this.height, this.aspectRatio);
        });
    }
}

export const resizer = new ResizeHandler();

export class Resizable {
    constructor() {
        ResizeHandler.instance.AddResizable(this);
        this.width = resizer.width;
        this.height = resizer.height;
        this.aspectRatio = resizer.aspectRatio;
    }

    Resize(width, height, aspectRatio) {}

    Cleanup() {
        ResizeHandler.instance.RemoveResizable(this);
    }
}