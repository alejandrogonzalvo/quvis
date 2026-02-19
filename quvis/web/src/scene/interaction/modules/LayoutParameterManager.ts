export interface LayoutParameters {
    repelForce: number;
    idealDistance: number;
    iterations: number;
    coolingFactor: number;
    coreDistance: number;
    attractForce: number;
}

export class LayoutParameterManager {
    private parameters: LayoutParameters;

    constructor(
        repelForce: number = 0.6,
        idealDistance: number = 1.0,
        iterations: number = 500,
        coolingFactor: number = 1.0,
        coreDistance: number = 5.0,
        attractForce: number = 0.1,
    ) {
        this.parameters = {
            repelForce,
            idealDistance,
            iterations,
            coolingFactor,
            coreDistance,
            attractForce,
        };
    }

    public getParameters(): LayoutParameters {
        return { ...this.parameters };
    }

    public updateParameters(
        params: Partial<LayoutParameters>,
    ): LayoutParameters {
        if (params.repelForce !== undefined) {
            this.parameters.repelForce = params.repelForce;
        }
        if (params.idealDistance !== undefined) {
            this.parameters.idealDistance = params.idealDistance;
        }
        if (params.iterations !== undefined) {
            this.parameters.iterations = params.iterations;
        }
        if (params.coolingFactor !== undefined) {
            this.parameters.coolingFactor = params.coolingFactor;
        }
        if (params.coreDistance !== undefined) {
            this.parameters.coreDistance = params.coreDistance;
        }
        if (params.attractForce !== undefined) {
            this.parameters.attractForce = params.attractForce;
        }
        return this.getParameters();
    }

    public getRepelForce(): number {
        return this.parameters.repelForce;
    }

    public getIdealDistance(): number {
        return this.parameters.idealDistance;
    }

    public getIterations(): number {
        return this.parameters.iterations;
    }

    public getCoolingFactor(): number {
        return this.parameters.coolingFactor;
    }

    public getAttractForce(): number {
        return this.parameters.attractForce;
    }

    public setRepelForce(value: number): void {
        this.parameters.repelForce = value;
    }

    public setIdealDistance(value: number): void {
        this.parameters.idealDistance = value;
    }

    public setIterations(value: number): void {
        this.parameters.iterations = value;
    }

    public setCoolingFactor(value: number): void {
        this.parameters.coolingFactor = value;
    }

    public setAttractForce(value: number): void {
        this.parameters.attractForce = value;
    }

    public getCoreDistance(): number {
        return this.parameters.coreDistance;
    }

    public setCoreDistance(value: number): void {
        this.parameters.coreDistance = value;
    }
}
