export interface AppearanceParameters {
    qubitSize: number;
    connectionThickness: number;
    inactiveAlpha: number;
    baseSize: number;
    areBlochSpheresVisible: boolean;
    areConnectionLinesVisible: boolean;
}

export class AppearanceParameterManager {
    private parameters: AppearanceParameters;

    constructor(
        qubitSize: number = 1.0,
        connectionThickness: number = 0.05,
        inactiveAlpha: number = 0.1,
        baseSize: number = 500.0,
        areBlochSpheresVisible: boolean = false,
        areConnectionLinesVisible: boolean = true,
    ) {
        this.parameters = {
            qubitSize,
            connectionThickness,
            inactiveAlpha,
            baseSize,
            areBlochSpheresVisible,
            areConnectionLinesVisible,
        };
    }

    public getParameters(): AppearanceParameters {
        return { ...this.parameters };
    }

    public updateParameters(
        params: Partial<AppearanceParameters>,
    ): AppearanceParameters {
        if (params.qubitSize !== undefined) {
            this.parameters.qubitSize = params.qubitSize;
        }
        if (params.connectionThickness !== undefined) {
            this.parameters.connectionThickness = params.connectionThickness;
        }
        if (params.inactiveAlpha !== undefined) {
            this.parameters.inactiveAlpha = params.inactiveAlpha;
        }
        if (params.baseSize !== undefined) {
            this.parameters.baseSize = params.baseSize;
        }
        if (params.areBlochSpheresVisible !== undefined) {
            this.parameters.areBlochSpheresVisible =
                params.areBlochSpheresVisible;
        }
        if (params.areConnectionLinesVisible !== undefined) {
            this.parameters.areConnectionLinesVisible =
                params.areConnectionLinesVisible;
        }
        return this.getParameters();
    }

    public getQubitSize(): number {
        return this.parameters.qubitSize;
    }

    public getConnectionThickness(): number {
        return this.parameters.connectionThickness;
    }

    public getInactiveAlpha(): number {
        return this.parameters.inactiveAlpha;
    }

    public getBaseSize(): number {
        return this.parameters.baseSize;
    }

    public areBlochSpheresVisible(): boolean {
        return this.parameters.areBlochSpheresVisible;
    }

    public areConnectionLinesVisible(): boolean {
        return this.parameters.areConnectionLinesVisible;
    }

    public setQubitSize(value: number): void {
        this.parameters.qubitSize = value;
    }

    public setConnectionThickness(value: number): void {
        this.parameters.connectionThickness = value;
    }

    public setInactiveAlpha(value: number): void {
        this.parameters.inactiveAlpha = value;
    }

    public setBaseSize(value: number): void {
        this.parameters.baseSize = value;
    }

    public setBlochSpheresVisible(visible: boolean): void {
        this.parameters.areBlochSpheresVisible = visible;
    }

    public setConnectionLinesVisible(visible: boolean): void {
        this.parameters.areConnectionLinesVisible = visible;
    }
}
