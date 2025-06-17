from qiskit.circuit.library import QFT
import matplotlib.pyplot as plt

def generate_qft_diagram(qubits: int, output_filename: str):
    """
    Generates and saves a diagram of a decomposed QFT circuit.
    """
    # 1. Create the QFT circuit
    qft_qc = QFT(
        num_qubits=qubits,
        do_swaps=True,
        approximation_degree=0,
        insert_barriers=False,
    )

    # 2. Decompose the circuit into 1 and 2-qubit gates
    decomposed_qft_qc = qft_qc.decompose()
    print(f"Generated and decomposed QFT circuit with {qubits} qubits.")
    print(f"Circuit depth: {decomposed_qft_qc.depth()}")
    print(f"Number of operations: {decomposed_qft_qc.size()}")

    # 3. Draw the circuit diagram using matplotlib
    fig = decomposed_qft_qc.draw(output='mpl', style='iqp')
    
    # 4. Save the diagram to a file
    plt.savefig(output_filename, dpi=300, bbox_inches='tight')
    print(f"Circuit diagram saved to {output_filename}")
    plt.close(fig) # Close the figure to free up memory

if __name__ == "__main__":
    NUM_QUBITS = 4
    OUTPUT_FILENAME = "qft_4qubit_decomposed.png"
    generate_qft_diagram(NUM_QUBITS, OUTPUT_FILENAME) 