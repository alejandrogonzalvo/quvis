export interface LayoutParameters {
    repelForce: number;
    idealDistance: number;
    iterations: number;
    coolingFactor: number;
}

export class LayoutParameterManager {
    private parameters: LayoutParameters;

    constructor(
        repelForce: number = 0.6,
        idealDistance: number = 1.0,
        iterations: number = 500,
        coolingFactor: number = 1.0,
    ) {
        this.parameters = {
            repelForce,
            idealDistance,
            iterations,
            coolingFactor,
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
}
