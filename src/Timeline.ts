export class Timeline {
    slices: number;
    currentSlice: number;
    // slider: HTMLInputElement; // Commented out - will be a React component
    // markers: HTMLDivElement; // Commented out - will be part of React component

    private handleInput: (e: Event) => void;
    private onSliceChange: (sliceIndex: number) => void;

    constructor(onSliceChange: (sliceIndex: number) => void) {
        this.currentSlice = 0;
        this.slices = 0;
        this.onSliceChange = onSliceChange;

        // // Add timeline markers container - This will be handled by React
        // this.markers = document.createElement("div");
        // this.markers.style.position = "fixed";
        // this.markers.style.bottom = "50px";
        // this.markers.style.width = "80%";
        // this.markers.style.left = "10%";
        // this.markers.style.height = "20px";
        // document.body.appendChild(this.markers);

        // this.slider = document.getElementById("timeline") as HTMLInputElement;
        // if (!this.slider) {
        //     console.warn("Timeline slider element not found. Timeline UI will be non-functional until implemented in React.");
        // }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.handleInput = (_e: Event) => {
            // This logic will be in the React component
            // const target = e.currentTarget as HTMLInputElement;
            // const timeValue = Math.round(parseInt(target.value));
            // target.value = String(timeValue);
            // this.currentSlice = timeValue;
            // this.onSliceChange(timeValue);
        };

        // // Add event listener - This will be handled by React component
        // if (this.slider) {
        //     this.slider.addEventListener("input", this.handleInput);
        // }
    }

    updateMarkers() {
        // This logic will be in the React component
        // // Clear existing markers
        // if (this.markers) this.markers.innerHTML = "";
        // // Create new markers
        // if (this.markers && this.slices > 1) { // Ensure slices > 1 to avoid division by zero
        //     for (const index of Array(this.slices).keys()) {
        //         const marker = document.createElement("div");
        //         marker.style.position = "absolute";
        //         marker.style.left = `${(index / (this.slices - 1)) * 100}%`;
        //         marker.style.width = "2px";
        //         marker.style.height = "20px";
        //         marker.style.backgroundColor = colors.text.primary;
        //         marker.style.transform = "translateX(-1px)";
        //         this.markers.appendChild(marker);
        //     }
        // }
    }

    setSlice(sliceIndex: number) {
        this.currentSlice = sliceIndex;
        // this.updateView(); // View update will be handled by React state
        // Call the callback directly if the intention is to process the slice change immediately
        this.onSliceChange(this.currentSlice);
    }

    addSlice() {
        this.slices += 1;
        // this.currentSlice = this.slices; // Typically current slice is 0-indexed for an array of N slices
        // Let QubitGrid or React logic decide the new currentSlice
        // this.updateView();
    }

    updateView() {
        // This logic will be in the React component
        // if (this.slider) {
        //     this.slider.max = String(this.slices > 0 ? this.slices - 1 : 0);
        //     this.slider.value = String(this.currentSlice);
        //     this.slider.step = "1";
        // }
        // this.updateMarkers();
    }

    setSliceCount(count: number) {
        this.slices = count;
        // Current slice should be within bounds [0, count-1]
        // Resetting to 0 is a safe default if count > 0.
        this.currentSlice = count > 0 ? 0 : 0;
        // if (this.slider) {
        //     this.slider.value = String(this.currentSlice);
        // }
        // this.updateView();
    }

    dispose() {
        // Cleanup method to remove event listener if it was attached
        // if (this.slider) {
        //     this.slider.removeEventListener("input", this.handleInput);
        // }
        // if (this.markers && this.markers.parentElement) {
        //    document.body.removeChild(this.markers);
        // }
        // console.log("Timeline instance internals cleaned (DOM parts were already commented out)");
    }
}
