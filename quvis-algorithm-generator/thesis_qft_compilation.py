from qiskit import transpile
from qiskit.transpiler import CouplingMap
from qiskit.circuit.library import QFT
from qiskit import qasm3


def create_nxn_grid_coupling_map(n: int) -> list[list[int]]:
    """
    Generates a coupling map for an n x n grid of qubits.
    Qubits are numbered row by row, from 0 to n*n - 1.
    """
    if n <= 0:
        raise ValueError("n must be a positive integer")
    if n == 1:  # Single qubit, no connections
        return []

    coupling_map = []
    num_qubits = n * n
    for i in range(num_qubits):
        row, col = divmod(i, n)

        # Connection to the right neighbor
        if col < n - 1:
            right_neighbor = i + 1
            coupling_map.append([i, right_neighbor])
            coupling_map.append([right_neighbor, i])

        # Connection to the bottom neighbor
        if row < n - 1:
            bottom_neighbor = i + n
            coupling_map.append([i, bottom_neighbor])
            coupling_map.append([bottom_neighbor, i])

    unique_couplings = {frozenset(pair) for pair in coupling_map}
    return [list(pair) for pair in unique_couplings]


def main():
    # --- Configuration ---
    n_grid_size = 2  # Dimension of the n x n grid (4x4)
    m_qft_qubits = 4  # Number of qubits for the QFT circuit
    # ---------------------

    if m_qft_qubits > n_grid_size * n_grid_size:
        print(
            f"Warning: QFT circuit has {m_qft_qubits} qubits, but the grid only has {n_grid_size * n_grid_size} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if m > n*n."
        )

    print(f"Defining a {n_grid_size}x{n_grid_size} quantum processor grid.")
    coupling_map_list = create_nxn_grid_coupling_map(n_grid_size)

    if not coupling_map_list and n_grid_size > 1:
        print(
            f"Generated an empty coupling map for n={n_grid_size}. This might be an issue."
        )
    elif n_grid_size > 1:
        print(f"Generated coupling map: {coupling_map_list}")

    print(
        f"\nCreating a QFT circuit for {m_qft_qubits} qubits using qiskit.circuit.library.QFT."
    )
    qft_qc = QFT(
        num_qubits=m_qft_qubits,
        do_swaps=True,
        approximation_degree=0,
        insert_barriers=False
    )

    logical_circuit = transpile(qft_qc, optimization_level=0, basis_gates=["u1", "u2", "u3", "cx"])

    print("Logical QFT circuit:")
    try:
        logical_circuit.draw(output='mpl', filename='qft_logical.png', style={'name': 'bw'}, scale=0.7)
        print("Saved logical circuit to qft_logical.png")
    except Exception as e:
        print(f"Could not save circuit diagram. Error: {e}")
        print("Please ensure you have matplotlib and pylatexenc installed: pip install matplotlib pylatexenc")


    print("Original QFT circuit:")
    try:
        qft_qc.draw(output='mpl', filename='qft_original.png', style={'name': 'bw'}, scale=0.7)
        print("Saved original circuit to qft_original.png")
    except Exception as e:
        print(f"Could not save circuit diagram. Error: {e}")
        print("Please ensure you have matplotlib and pylatexenc installed: pip install matplotlib pylatexenc")


    print(
        f"\nTranspiling QFT circuit for the {n_grid_size}x{n_grid_size} grid topology..."
    )

    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list)

    transpiled_qc = transpile(
        qft_qc,
        coupling_map=custom_coupling_map,
        basis_gates=["u1", "u2", "u3", "cx"],
        optimization_level=3,
    )

    print("\nTranspiled QFT circuit:")
    try:
        transpiled_qc.draw(output='mpl', filename='qft_transpiled.png', style={'name': 'bw'}, scale=0.7)
        print("Saved transpiled circuit to qft_transpiled.png")
    except Exception as e:
        print(f"Could not save circuit diagram. Error: {e}")
        print("Please ensure you have matplotlib and pylatexenc installed: pip install matplotlib pylatexenc")

    print("\nQASM for the transpiled circuit:")
    print(qasm3.dumps(transpiled_qc))


if __name__ == "__main__":
    main() 