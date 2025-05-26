from qiskit import QuantumCircuit, QuantumRegister
import numpy as np

def get_qubit_states(circuit):
    """Approximate qubit states using gate propagation rules"""
    qubit_states = {i: [1,0,0] for i in range(25)}  # Initial |0⟩ states (x=1)
    
    for instruction in circuit.data:
        gate = instruction.operation.name
        qubits = [circuit.find_bit(q).index for q in instruction.qubits]
        
        # Apply gate effects locally
        for q in qubits:
            if gate == 'h':
                qubit_states[q] = [0,0,1]  # Z→X basis
            elif gate == 'x':
                qubit_states[q][2] *= -1   # Flip Z
            elif gate == 'y':
                qubit_states[q][2] *= -1
                qubit_states[q][0] *= -1
            elif gate == 'cx' and q == qubits[1]:
                # CNOT target qubit
                qubit_states[q][2] = qubit_states[qubits[0]][2]
    
    return qubit_states

# Example usage
qr = QuantumRegister(25, 'q')
qc = QuantumCircuit(qr)
qc.h(0)
qc.cx(0,1)

states = get_qubit_states(qc)
np.savez('approx_states.npz', **{str(k): v for k, v in states.items()})