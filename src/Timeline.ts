export class Timeline {
    slices: number;
    currentSlice: number;
    slider: HTMLInputElement;
    markers: HTMLDivElement;

    private handleInput: (e: Event) => void;
    private onSliceChange: (sliceIndex: number) => void;

    constructor(onSliceChange: (sliceIndex: number) => void) {
        this.currentSlice = 0;
        this.slices = 0;

        this.onSliceChange = onSliceChange;

        // Add timeline markers container
        this.markers = document.createElement("div");
        this.markers.style.position = "fixed";
        this.markers.style.bottom = "50px";
        this.markers.style.width = "80%";
        this.markers.style.left = "10%";
        this.markers.style.height = "20px";
        document.body.appendChild(this.markers);

        this.slider = document.getElementById("timeline") as HTMLInputElement;

        this.handleInput = (e: Event) => {
            const target = e.currentTarget as HTMLInputElement;
            const timeValue = Math.round(parseInt(target.value));
            target.value = String(timeValue);
            this.currentSlice = timeValue;
            this.onSliceChange(timeValue);
        };

        // Add event listener
        this.slider.addEventListener("input", this.handleInput);
    }

    updateMarkers() {
        // Clear existing markers
        this.markers.innerHTML = "";

        // Create new markers
        for (const index of Array(this.slices).keys()) {
            const marker = document.createElement("div");
            marker.style.position = "absolute";
            marker.style.left = `${(index / (this.slices - 1)) * 100}%`;
            marker.style.width = "2px";
            marker.style.height = "20px";
            marker.style.backgroundColor = "#fff";
            marker.style.transform = "translateX(-1px)";
            this.markers.appendChild(marker);
        }
    }

    setSlice(sliceIndex: number) {
        this.currentSlice = sliceIndex;
        this.updateView();
    }

    addSlice() {
        this.slices += 1;
        this.currentSlice = this.slices;

        this.updateView();
    }

    updateView() {
        this.slider.max = String(this.slices - 1);
        this.slider.value = String(this.currentSlice - 1);

        this.slider.step = "1";

        this.updateMarkers();
    }

    destroy() {
        // Cleanup method to remove event listener
        this.slider.removeEventListener("input", this.handleInput);
        document.body.removeChild(this.markers);
    }
}
