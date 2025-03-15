import { Playground } from "./Playground.js";

const playground = new Playground();

const timeline = document.getElementById('timeline');
timeline.addEventListener('input', function(e) {
    const target = e.currentTarget as HTMLInputElement;
    const timeValue = Math.round(parseInt(target.value)); // Snap to nearest integer
    target.value = String(timeValue); // Update slider position
    playground.grid.loadStateFromSlice(timeValue);
});
