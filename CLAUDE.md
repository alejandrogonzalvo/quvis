# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development (Vite + React)
- `npm run dev` - Start development server on port 5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage

### Python Backend Integration
The project integrates with Python scripts through Vite middleware:
- Circuit generation API available at `/api/generate-circuit` (POST)
- Python scripts execute via `python3 -m quvis.api.playground`

## Architecture Overview

### Project Structure
This is a quantum circuit visualization platform with a **dual-language architecture**:

- **Frontend**: React + TypeScript + Three.js for 3D visualization
- **Backend**: Python (Qiskit) for quantum circuit processing
- **Integration**: Vite middleware bridges frontend and Python scripts

### Key Directories
- `quvis/web/src/` - React/TypeScript frontend source
- `quvis/core/` - Python quantum computing logic
- `public/` - Static assets and temporary data files

### Frontend Architecture (quvis/web/src/)

#### Core Application Flow
1. **App.tsx** - Main React component managing UI state and playground lifecycle
2. **scene/Playground.ts** - Central orchestrator for 3D visualization
3. **data/managers/** - Data management and processing
4. **scene/objects/** - Three.js 3D objects and controllers
5. **ui/components/** - React UI controls and panels

#### Key Classes
- **Playground** - Main visualization class that coordinates all modules
- **QubitGridController** - Manages 3D qubit visualization and layout
- **ThreeSceneSetup** - Initializes Three.js scene, camera, renderer
- **VisualizationStateManager** - Manages visualization modes and state
- **CircuitDataManager** - Processes quantum circuit data

#### Module System
The codebase uses a modular architecture with managers for:
- **Layout**: Force-directed positioning algorithms
- **Appearance**: Visual styling and rendering parameters  
- **Animation**: Frame loop and performance monitoring
- **Interaction**: Mouse handling and tooltips
- **Events**: Keyboard shortcuts and controls

### Data Flow
1. **Circuit Generation**: User selects parameters → API call to Python → Circuit data returned
2. **Visualization**: Circuit data → QubitGridController → Three.js scene
3. **Interaction**: User controls → State managers → Visual updates

### Quantum Circuit Visualization Modes
- **Logical Mode**: Shows idealized quantum circuits
- **Compiled Mode**: Shows circuits transpiled for specific hardware topologies
- **Multi-Circuit**: Side-by-side comparison of logical vs compiled

## Development Guidelines

### Code Organization
- TypeScript files use `.js` imports (ES modules)
- Modules are organized by functionality (scene, data, ui)
- React components are in `ui/components/`
- Three.js objects are in `scene/objects/`

### State Management
- No external state management library - uses React hooks
- State flows from App.tsx down to child components  
- Playground instance passed via refs to UI controls

### Styling
- Uses CSS-in-JS with inline styles
- Color theming centralized in `ui/theme/colors.ts`
- Responsive design with collapsible panels

### Testing
- Vitest for unit testing
- Tests located in `test/` directory
- Run tests before committing changes

### Code Style
- Prettier configuration in `.prettierrc` 
- ESLint configuration in `eslint.config.js`
- 4-space indentation, single quotes, semicolons