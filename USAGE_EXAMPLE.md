# Using the Refactored QubitGridController

## Migration from QubitGrid to QubitGridController

The new `QubitGridController` maintains **complete backward compatibility** with the original `QubitGrid` API.

### Before (Original QubitGrid)
```typescript
import { QubitGrid } from "./QubitGrid.js";

const qubitGrid = new QubitGrid(
    scene,
    mouse,
    camera,
    "example_dataset",
    "compiled",
    10, // maxSlicesForHeatmap
    0.3, // kRepel
    5.0, // idealDist
    300, // iterations
    0.95, // coolingFactor
    0.05, // connectionThickness
    0.1, // inactiveElementAlpha
    (count, index) => console.log(`Loaded ${count} slices, starting at ${index}`)
);
```

### After (New QubitGridController)
```typescript
import { QubitGridController } from "./QubitGridController.js";

const qubitGrid = new QubitGridController(
    scene,
    mouse,
    camera,
    "example_dataset",
    "compiled",
    10, // maxSlicesForHeatmap
    0.3, // kRepel
    5.0, // idealDist
    300, // iterations
    0.95, // coolingFactor
    0.05, // connectionThickness
    0.1, // inactiveElementAlpha
    (count, index) => console.log(`Loaded ${count} slices, starting at ${index}`)
);
```

**That's it!** Just change the import and class name. All methods work identically.

## API Compatibility

All these methods work exactly the same:

```typescript
// Slice navigation
qubitGrid.setCurrentSlice(5);
qubitGrid.getActiveSliceCount();
qubitGrid.getActiveCurrentSliceIndex();

// Layout control
qubitGrid.updateLayoutParameters({
    repelForce: 0.5,
    idealDistance: 6.0,
    iterations: 500
});
qubitGrid.applyGridLayout();

// Visual appearance
qubitGrid.updateAppearanceParameters({
    qubitSize: 1.5,
    connectionThickness: 0.08,
    inactiveAlpha: 0.2
});

// Mode switching
qubitGrid.setVisualizationMode("logical");

// Visibility controls
qubitGrid.setBlochSpheresVisible(true);
qubitGrid.setConnectionLinesVisible(false);

// Heatmap
qubitGrid.updateHeatmapSlices(15);

// Performance
qubitGrid.updateLOD(cameraDistance);

// Data access
const gateCount = qubitGrid.getGateCountForQubit(5);
const timeline = qubitGrid.timeline;
const heatmap = qubitGrid.heatmap;

// Cleanup
qubitGrid.dispose();
```

## Advanced Usage - Accessing Subsystems

For advanced use cases, you can access the individual managers:

```typescript
// Access data management
const dataManager = qubitGrid.dataManagerInstance;
const sliceCount = dataManager.getSliceCount();
const isLoaded = dataManager.isFullyLoaded;

// Access layout management
const layoutManager = qubitGrid.layoutManagerInstance;
const positions = layoutManager.positions;
layoutManager.updateIdealDistance(7.0);

// Access rendering
const renderManager = qubitGrid.renderManagerInstance;
renderManager.setQubitScale(2.0);
const qubit = renderManager.getQubit(3);

// Access state management
const stateManager = qubitGrid.stateManagerInstance;
const currentSlice = stateManager.currentSlice;
const summary = stateManager.getStateSummary();

// Access heatmap management
const heatmapManager = qubitGrid.heatmapManagerInstance;
const config = heatmapManager.getConfigSummary();
heatmapManager.forceRefresh();
```

## Benefits of the New Architecture

### 1. **Better Performance**
Each subsystem can be optimized independently:
```typescript
// Only update what changed
renderManager.updateQubitOpacities(sliceData, maxSlices);
layoutManager.updateIdealDistance(6.0);
heatmapManager.clearPositionsCache();
```

### 2. **Easier Testing**
Test individual components:
```typescript
// Test data loading separately
const dataManager = new CircuitDataManager("compiled");
await dataManager.loadFromJSON("test_data.json");
assert(dataManager.getSliceCount() === 100);

// Test layout calculations separately  
const layoutManager = new LayoutManager();
layoutManager.calculateGridLayout(25);
assert(layoutManager.getQubitCount() === 25);
```

### 3. **Better Error Handling**
Errors are contained within specific managers:
```typescript
try {
    await dataManager.loadFromJSON("invalid.json");
} catch (error) {
    // Only data loading failed, rendering still works
    heatmapManager.handleError(camera, 9);
    stateManager.createFallbackState();
}
```

### 4. **Extensibility**
Easy to add new features:
```typescript
// Add new layout algorithm
class CustomLayoutManager extends LayoutManager {
    calculateSphericalLayout(numQubits: number) {
        // New layout implementation
    }
}

// Add new rendering effects
class EnhancedRenderManager extends RenderManager {
    addParticleEffects() {
        // New visual effects
    }
}
```

## Migration Checklist

- [ ] Update imports from `QubitGrid` to `QubitGridController`
- [ ] Run existing tests to verify compatibility
- [ ] Check for any custom modifications to QubitGrid
- [ ] Update TypeScript types if needed
- [ ] Test in all visualization modes (compiled/logical)
- [ ] Verify performance is maintained
- [ ] Update documentation/comments

The refactored code is **production-ready** and maintains full compatibility! 🚀 