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
        this.container.style.padding = "10px";
        this.container.style.background = colors.background.panel;
        this.container.style.borderRadius = "5px";
        this.container.style.fontFamily = "Arial, sans-serif";
        this.container.style.fontSize = "12px";
        this.container.style.color = colors.text.primary;
        this.container.style.minWidth = "180px";
        this.container.style.marginTop = "0px";
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
            this.titleElement.textContent =
                "Activity (All Slices up to Current)";
        } else {
            this.titleElement.textContent = `Activity (Last ${maxSlicesSetting} Slices)`;
        }

        const actualMaxIntensityRatio =
            effectiveSlicesInWindow > 0
                ? maxObservedRawInteractionCount / effectiveSlicesInWindow
                : 0;
        // maxObservedRawInteractionCount is the raw count of interactions for the "hottest" qubit in the window.

        if (effectiveSlicesInWindow > 0) {
            this.subtitleElement.textContent =
                `Max observed intensity: ${(actualMaxIntensityRatio * 100).toFixed(0)}% ` +
                `(approx. ${maxObservedRawInteractionCount.toFixed(1)} interactions in ${effectiveSlicesInWindow} slices).`;
        } else {
            this.subtitleElement.textContent = "(No activity or window)";
        }

        let redText: string;
        let yellowText: string;
        // Default for Green, covers minimal activity due to the 0.002 intensity floor in Heatmap.ts
        let greenText: string = `Green: > 0 interactions`;

        if (effectiveSlicesInWindow === 1) {
            redText = `Red: Active (1 interaction)`;
            // In a 1-slice window, if a qubit is active, its intensity is 1.0 (making it Red).
            // A distinct Yellow state (intensity 0.5) isn't achieved by interaction count here.
            yellowText = `Yellow: N/A (if active, it's Red)`;
        } else if (effectiveSlicesInWindow > 0) {
            const interactionsForRed = 1.0 * effectiveSlicesInWindow;
            const interactionsForYellow =
                this.yellowThreshold * effectiveSlicesInWindow; // yellowThreshold is 0.5
            redText = `Red: &ge; ${interactionsForRed.toFixed(1)} interactions`;
            yellowText = `Yellow: &approx; ${interactionsForYellow.toFixed(1)} interactions`;
        } else {
            // This case (e.g., effectiveSlicesInWindow = 0) implies no activity or window
            redText = `Red: N/A`;
            yellowText = `Yellow: N/A`;
            greenText = `Green: N/A`; // Or more descriptive like "No activity in window"
        }

        this.textHighElement.innerHTML = redText;
        this.textMedElement.innerHTML = yellowText;
        this.textLowElement.innerHTML = greenText;
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
            <div style="margin-bottom: 5px; font-weight: bold; text-align: center;">Heatmap Legend</div>
            <div id="${titleId}" style="font-size:11px; text-align: center; margin-bottom: 8px;"></div>
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                <div style="width: 100px; height: 15px; background: linear-gradient(to right, ${colors.visualization.heatmapGradient.start}, ${colors.visualization.heatmapGradient.middle}, ${colors.visualization.heatmapGradient.end}); border: 1px solid ${colors.visualization.legendBorder};"></div>
            </div>
            <div style="font-size: 11px; line-height: 1.4; text-align: center;">
                <span id="${textLowId}" style="font-size: 1.2em;"></span><br>
                <span id="${textMedId}" style="font-size: 1.2em;"></span><br>
                <span id="${textHighId}" style="font-size: 1.2em;"></span>
            </div>
            <div id="${subtitleId}" style="font-size: 9px; color: ${colors.text.muted}; margin-top: 5px; text-align: center;"></div>
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
