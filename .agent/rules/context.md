---
trigger: always_on
---

# Quvis AI Context & Architectural Overview

This document provides high-level context, architectural details, and development guidelines for AI agents working on the Quvis project.

## 1. Project Overview
**Quvis** is a Quantum Circuit Visualization Platform that bridges Python's quantum computing capabilities (Qiskit) with a high-performance web-based 3D visualization (Three.js/React).

### Tech Stack
- **Frontend**: React 18, TypeScript, Three.js (via `three`), Vite.
- **Backend**: Python 3.12+, Qiskit, FastAPI (for standalone), Native Python Scripts (for local dev middleware).
- **Communication**: HTTP/JSON. In local dev, Vite middleware spawning Python subprocesses.

## 2. Architecture & Data Flow

### Hybrid Architecture
Quvis uses a split architecture where heavy quantum processing happens in Python, and visualization happens in the Browser.

```mermaid
graph TD
    User[User Interaction] --> App[React App (App.tsx)]
    App -->|JSON Request| Middleware[Vite Middleware / API]
    
    subgraph "Frontend (@/quvis/web/src)"
        App --> Playground[Playground.ts (Three.js Orchestrator)]
        Playground --> Scene[Three.js Scene]
        App --> UI[UI Components (Overlay)]
    end
    
    subgraph "Backend (quvis/core)"
        Middleware -->|Spawns| PyScript[python -m quvis.api.playground]
        PyScript --> Qiskit[Qiskit & Circuit Analysis]
        Qiskit -->|Circuit Data| PyScript
    end
    
    PyScript -->|Stdout JSON| Middleware
    Middleware -->|Response| App
    App -->|Updates| Playground
```

### Key Flows
1.  **Circuit Generation**:
    *   User selects algorithm/params in `PlaygroundParameterSelection.tsx`.
    *   `App.tsx` sends POST to `/api/generate-circuit`.
    *   **Local Dev**: `vite.config.ts` intercepts this, spawns `python -m quvis.api.playground`.
    *   **Python**: `PlaygroundAPI.generate_visualization_data` builds logical and compiled circuits using Qiskit.
    *   **Response**: JSON containing `circuits` (Logical & Compiled), `device_info`, and `circuit_stats`.
2.  **Visualization**:
    *   `App.tsx` instantiates `Playground.ts` with the returned JSON.
    *   `CircuitDataManager` parses the JSON.
    *   `QubitGridController` creates 3D objects (Bloch spheres, gates) based on the circuit slices.

## 3. Key Components Map

| Component | Path | Description |
|-----------|------|-------------|
| **Entry (Web)** | `quvis/web/src/ui/App.tsx` | Main React component. Manages UI state, API calls, and Playground lifecycle. |
| **Visualizer** | `quvis/web/src/scene/Playground.ts` | The "Engine" of the 3D view. Manages Three.js scene, camera, and interaction. |
| **API Entry** | `quvis/core/src/quvis/api/playground.py` | CLI/API adapter. Handles arguments, calls Qiskit, returns JSON. |
| **Integration** | `vite.config.ts` | Contains `circuitGeneratorMiddleware` which bridges Web and Python locally. |
| **Data Types** | `quvis/core/src/quvis/compiler/utils.py` | Defines `LogicalCircuitInfo`, `CompiledCircuitInfo` data classes. |

## 4. Development Guidelines for AI

### Modifying the API
If you need to add a new parameter to the circuit generation:
1.  **Update Python**: Modify `playground.py` (`PlaygroundAPI.generate_visualization_data`) and `main()` to accept the new argument.
2.  **Update Qiskit Logic**: Ensure the internal logic (`_create_circuit`, `_create_coupling_map`) uses this parameter.
3.  **Update Frontend**:
    *   Add the parameter to `PlaygroundParams` interface in `PlaygroundParameterSelection.tsx`.
    *   Update `App.tsx` `handleParameterGeneration` to pass the parameter in the fetch body.
    *   Update `vite.config.ts` middleware *if* the parameter is passed as a command-line flag (currently args are passed via CLI flags in the middleware). **CRITICAL**: The middleware manually constructs the CLI args from the JSON body. You MUST update `vite.config.ts` to forward new parameters to the python subprocess.

### Modifying Visualization
*   **Three.js Logic**: Most 3D logic is in `quvis/web/src/scene/`.
*   **React UI**: All HTML overlay UI is in `quvis/web/src/ui/`.
*   **Communication**: If the visualization needs new data from the circuit, you likely need to update `extract_operations_per_slice` or similar in `quvis/core` first.

## 5. Common Pitfalls
*   **Vite Middleware**: The Python script is called via `spawn`. `print()` debugging in Python usually goes to the node server console, but verify `vite.config.ts` handling of stdout/stderr. The middleware expects the *last* line of stdout to be the JSON response.
*   **Path Aliases**: Frontend uses `@/` to point to `quvis/web/src`.
*   **Dependency Management**: 
    *   `npm install` for frontend.
    *   `poetry install` for backend.
    *   `pip install -e .` also works for dev.

## 6. Testing
*   **Frontend**: `npm run test` (Vitest).
*   **End-to-End**: Playwright tests exist in `tests/` or `quvis/web/tests` (check `playwright.config.ts`).
