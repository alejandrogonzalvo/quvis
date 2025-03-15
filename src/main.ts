import { QubitGrid } from './QubitGrid.js';

const grid = new QubitGrid();

const timeline = document.getElementById('timeline');
timeline.addEventListener('input', function(e) {
    const target = e.currentTarget as HTMLInputElement;
    console.log(target.value);
    const timeValue = Math.round(parseInt(target.value)); // Snap to nearest integer
    target.value = String(timeValue); // Update slider position
    grid.loadStateFromSlice(timeValue);
});
