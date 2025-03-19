## Setup

```
npm install
npm install -g typescript
tsc
```

## Start Application

```
npx vite
```

## Log

Visualization tool specifications:

We are working with three graph levels, from virtual qubits to physical devices:

1. For a given quantum operator (i.e. quantum algorithm) after being decomposed in single & two qubit gates, we can construct a graph with virtual qubits as nodes, and interactions in the circuit as edges connecting nodes. This high-level logical graph is known as the "interaction graph" of the circuit. https://link.springer.com/article/10.1007/s42484-023-00124-1
2. The third graph is known as the "connectivity graph" or "coupling map" of a quantum processor, with physical qubits from the quantum device as nodes, and couplers (i.e. two-qubit gate feasibility) as edges connecting nodes. https://arxiv.org/abs/2007.15671
3. This graph can be defined as "a modified version of the interaction graph satisfying the connectivity graph". Basically, we go from virtual qubits to physical qubits (as in the id of the qubits in the graph) adding new interactions in the circuit (i.e. SWAP gates) to route the qubits that need to interact (given by the interaction graph) into neighbouring positions (given by the connectivity graph). We refer to this graph as the "compiled interaction graph". https://arxiv.org/abs/1809.02573

The visualization tool should be able to display the three levels of graphs described above, and to assess several metrics.
The first (interaction) and second (compiled interaction) graphs can be decomposed into timeslices, which will ease the visualization and metric analysis of the tool.

Tentative list of metrics to be displayed (for a selected set of consecutive slices):

- Burstiness (which qubits are being operated and which are idling)
- Routing vs Computing operations (i.e. the gate we are operating comes from the quantum circuit? or from the routing process?)
- Qubit coherence (loss of fidelity due to the execution of gates)
- Routing heatmaps?
- ... many more to be defined (and probably some that I am forgetting)

The visualization tool should be scalable to allow for qubit-scales of the order of 10.000 qubits.
