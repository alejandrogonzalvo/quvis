[See official docs](https://docs.quantum.ibm.com/guides/transpiler-stages)
[Qiskit Video tutorial](https://www.youtube.com/watch?v=MvX5OUK-tbE)
# Qubit Transpiler Stages

There are 6 stages in the Qiskit SDK transpilation pipeline:

### Init
To include your own initial optimizations, like 3 qubit gate decomposition.

### Layout
One-to-one Mapping from virtual/logical qubits to physical qubits in the quantum device. 

### Routing
Insert/find the minimum number of SWAPS. In most algorithm is performed with the layout phase.

### Translation
Translation from the gates used by the user to the gates available in the target ISA.

### Optimization
Reduction of circuit depth by combining or eliminating gates.

### Scheduling
Insertion of delays to time each circuit instruction.e