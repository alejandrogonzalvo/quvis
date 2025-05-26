from qiskit.circuit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager
from

# Any abstract circuit you want:
abstract = QuantumCircuit(2)
abstract.h(0)
abstract.cx(0, 1)

# Any method you like to retrieve the backend you want to run on:
backend = QiskitRuntimeService().backend("some-backend")

# Create the pass manager for the transpilation ...
pm = generate_preset_pass_manager(backend=backend)
# ... and use it (as many times as you like).
physical = pm.run(abstract)
