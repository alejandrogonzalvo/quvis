import { colors } from "../../ui/theme/colors.js";

export class HeatmapLegend {
    private container: HTMLElement | null;
    private readonly containerId: string;
    private readonly yellowThreshold: number;
    private stylesApplied: boolean = false;

    private titleElement: HTMLElement;
    private subtitleElement: HTMLElement;
    private textHighElement: HTMLElement;
    private textMedElement: HTMLElement;
    private textLowElement: HTMLElement;

    constructor(containerId: string, yellowThreshold: number) {
        this.containerId = containerId;
        this.yellowThreshold = yellowThreshold;
        this.container = document.getElementById(this.containerId);

        if (!this.container) {
            console.warn(
                `HeatmapLegend: Container with ID '${this.containerId}' not found initially. Legend will be hidden.`,
            );
            this.container = document.createElement("div");
            this.container.id = "heatmap-legend-dummy-container-autogen";
            this.container.style.display = "none";
            this.stylesApplied = false;
        } else {
            this.applyStyles();
            this.stylesApplied = true;
        }
    }

    private applyStyles() {
        this.container.style.padding = "16px";
        this.container.style.background = "rgba(0, 0, 0, 0.6)";
        this.container.style.borderRadius = "12px";
        this.container.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        this.container.style.backdropFilter = "blur(8px)";
        this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        this.container.style.fontSize = "13px";
        this.container.style.color = colors.text.primary;
        this.container.style.minWidth = "200px";
        this.container.style.marginTop = "0px";
        this.container.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
        this.stylesApplied = true;
    }

    public update(
        maxSlicesSetting: number,
        effectiveSlicesInWindow: number,
        maxObservedRawInteractionCount: number,
    ): void {
        if (
            !this.container ||
            this.container.id === "heatmap-legend-dummy-container-autogen"
        ) {
            const realContainer = document.getElementById(this.containerId);
            if (realContainer) {
                this.container = realContainer;
                this.setupDOM(); // Setup DOM if we just found the real container
            } else {
                // console.warn(`HeatmapLegend: Container with ID '${this.containerId}' not found during update.`);
                return;
            }
        }

        // Ensure DOM elements are present (they should be after setupDOM)
        if (
            !this.titleElement ||
            !this.subtitleElement ||
            !this.textHighElement ||
            !this.textMedElement ||
            !this.textLowElement
        ) {
            // console.warn("HeatmapLegend: DOM elements not ready for update.");
            // Attempt to re-setup if elements are missing, might happen if container was found late.
            this.setupDOM();
            if (!this.titleElement) return; // Still not ready, bail.
        }

        console.log(
            `Legend.update called with: maxSlicesSetting=${maxSlicesSetting}, effectiveSlicesInWindow=${effectiveSlicesInWindow}, maxObservedRawInteractionCount=${maxObservedRawInteractionCount.toFixed(2)}`,
        );
        if (this.titleElement) {
            // Check if titleElement exists before logging
            console.log(
                `Legend.update: Current this.titleElement.textContent before update = "${this.titleElement.textContent}"`,
            );
        }

        if (maxSlicesSetting === -1) {
            this.titleElement.textContent = "All slices up to current";
        } else {
            this.titleElement.textContent = `Last ${maxSlicesSetting} slice${maxSlicesSetting === 1 ? '' : 's'}`;
        }

        const actualMaxIntensityRatio =
            effectiveSlicesInWindow > 0
                ? maxObservedRawInteractionCount / effectiveSlicesInWindow
                : 0;
        // maxObservedRawInteractionCount is the raw count of interactions for the "hottest" qubit in the window.

        if (effectiveSlicesInWindow > 0) {
            this.subtitleElement.textContent =
                `Peak: ${(actualMaxIntensityRatio * 100).toFixed(0)}% intensity`;
        } else {
            this.subtitleElement.textContent = "No activity in current window";
        }

        let redText: string;
        let yellowText: string;
        let greenText: string;

        if (effectiveSlicesInWindow === 1) {
            redText = "High";
            yellowText = "Medium";
            greenText = "Low";
        } else if (effectiveSlicesInWindow > 0) {
            // Red represents the maximum observed interactions (100% intensity)
            const interactionsForRed = maxObservedRawInteractionCount;
            // Yellow represents the threshold for yellow color (typically 50% of max)
            const interactionsForYellow = this.yellowThreshold * maxObservedRawInteractionCount;
            // Green represents 25% of maximum interactions
            const interactionsForGreen = 0.25 * maxObservedRawInteractionCount;
            redText = `${interactionsForRed.toFixed(1)}×`;
            yellowText = `${interactionsForYellow.toFixed(1)}×`;
            greenText = `${interactionsForGreen.toFixed(1)}×`;
        } else {
            redText = "No data";
            yellowText = "No data";
            greenText = "No data";
        }

        this.textHighElement.textContent = redText;
        this.textMedElement.textContent = yellowText;
        this.textLowElement.textContent = greenText;
    }

    private setupDOM() {
        if (
            !this.container ||
            this.container.id === "heatmap-legend-dummy-container-autogen"
        )
            return;

        // Apply styles directly here if not already applied or if it's the real container
        if (!this.stylesApplied) {
            this.applyStyles();
        }

        // Unique IDs for internal elements
        const titleId = `${this.containerId}-title`;
        const subtitleId = `${this.containerId}-subtitle`;
        const textLowId = `${this.containerId}-text-low`;
        const textMedId = `${this.containerId}-text-med`;
        const textHighId = `${this.containerId}-text-high`;

        const htmlContent = `
            <div style="margin-bottom: 18px;">
                <div style="font-weight: 600; font-size: 16px; color: ${colors.text.primary}; margin-bottom: 6px;">
                    <span>Heatmap </span>
                    <span id="${titleId}" style="font-weight: 600; font-size: 16px; color: ${colors.text.primary};"></span>
                    <span> interactions:</span>
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 18px;">
                <div style="display: flex; align-items: center;">
                    <div style="width: 16px; height: 16px; background: #00ff00; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);"></div>
                    <span id="${textLowId}" style="font-size: 16px; color: ${colors.text.secondary};"></span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 16px; height: 16px; background: #ffff00; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);"></div>
                    <span id="${textMedId}" style="font-size: 16px; color: ${colors.text.secondary};"></span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 16px; height: 16px; background: #ff0000; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);"></div>
                    <span id="${textHighId}" style="font-size: 16px; color: ${colors.text.secondary};"></span>
                </div>
            </div>

            <div style="padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <div id="${subtitleId}" style="font-size: 13px; color: ${colors.text.muted}; line-height: 1.4;"></div>
            </div>
        `;
        this.container.innerHTML = htmlContent;

        // Assign elements after setting innerHTML
        this.titleElement = document.getElementById(titleId) as HTMLElement;
        this.subtitleElement = document.getElementById(
            subtitleId,
        ) as HTMLElement;
        this.textLowElement = document.getElementById(textLowId) as HTMLElement;
        this.textMedElement = document.getElementById(textMedId) as HTMLElement;
        this.textHighElement = document.getElementById(
            textHighId,
        ) as HTMLElement;

        // Check if elements were found - crucial for preventing errors in update()
        if (
            !this.titleElement ||
            !this.subtitleElement ||
            !this.textLowElement ||
            !this.textMedElement ||
            !this.textHighElement
        ) {
            console.error(
                "HeatmapLegend: Failed to find all internal DOM elements after setup.",
            );
            // Potentially clear them or mark as not ready to prevent update issues
            this.titleElement = null;
            this.subtitleElement = null;
            this.textLowElement = null;
            this.textMedElement = null;
            this.textHighElement = null;
        }
    }
}
