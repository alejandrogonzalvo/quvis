# Quvis: Quantum Circuit Visualization Tool

Quvis is a visualization tool designed to display and analyze quantum circuits at various levels of abstraction, from logical interaction graphs to compiled circuits on physical quantum hardware. It aims to provide insights into circuit structure, qubit utilization, and various performance metrics.

## Project Overview

This tool helps visualize and understand the complexities of quantum algorithms and their execution on quantum processors. It focuses on three main graph representations:

1.  **Interaction Graph**: A high-level view of a quantum circuit, where virtual qubits are nodes and their interactions (gates) are edges. This represents the logical structure of the algorithm.
2.  **Compiled Interaction Graph**: A modified version of the interaction graph that accounts for the physical qubit layout and connectivity constraints of a specific quantum device. This involves adding operations like SWAP gates to enable interactions between non-adjacent qubits.
3.  **Connectivity Graph (Coupling Map)**: Represents the physical architecture of a quantum processor, showing physical qubits as nodes and the possible two-qubit gate connections (couplers) as edges.

The tool is designed to decompose the interaction and compiled interaction graphs into timeslices, facilitating detailed visualization and metric analysis. It aims to be scalable for circuits involving up to 10,000 qubits.

Key metrics that can be assessed (for selected timeslices) include:

*   **Burstiness**: Identifying active versus idle qubits.
*   **Routing vs. Computing Operations**: Distinguishing between gates from the original circuit and those added for qubit routing.
*   **Qubit Coherence**: Analyzing fidelity loss due to gate execution.
*   **Routing Heatmaps**: Visualizing routing overhead and patterns.

## Setup and Installation

To set up the project locally, ensure you have Node.js installed (v20.x or higher recommended, use `nvm` if possible) and then run:

```bash
npm install
```

## Running the Application

To start the development server:

```bash
npm run dev
```

This will start the Vite development server. You can typically access the application in your browser at `http://localhost:5173` (or a similar address shown in your terminal).

Alternatively, you can run Vite directly:
```bash
npx vite
```

## Building for Production

To create a production build:

```bash
npm run build
```
This command compiles the TypeScript code and bundles the application using Vite. The output will be in the `dist` directory.

Alternatively, you can run Vite build directly:
```bash
npx vite build
```

## Release Process

This project uses `semantic-release` for automated version management and package publishing. Releases are triggered automatically on pushes to the `main` branch.

*   Commits to the `main` branch that follow the [Conventional Commits specification](https://www.conventionalcommits.org/) will trigger a new release.
*   The GitHub Actions workflow (defined in `.github/workflows/ci.yml`) handles the release process, including:
    *   Determining the next version number based on commit messages.
    *   Generating release notes.
    *   Creating a GitHub release and tag.
*   Successful releases on the `main` branch will automatically trigger a deployment to GitHub Pages.

Prereleases are generated for commits to the `staging` branch.

## Contributing

(Details to be added here - e.g., contribution guidelines, code of conduct, how to submit pull requests)

## License

(Details to be added here - e.g., MIT, Apache 2.0)
