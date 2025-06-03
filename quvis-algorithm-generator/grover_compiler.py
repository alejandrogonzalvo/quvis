from qiskit import transpile, QuantumCircuit
from qiskit.transpiler import CouplingMap
from qiskit.circuit.library import GroverOperator, PhaseOracle
from qiskit import qasm3
from qiskit.converters import circuit_to_dag
import json
import argparse


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
    num_qubits_grid = n * n
    for i in range(num_qubits_grid):
        row, col = divmod(i, n)

        if col < n - 1:
            right_neighbor = i + 1
            coupling_map.append([i, right_neighbor])
            coupling_map.append([right_neighbor, i])

        if row < n - 1:
            bottom_neighbor = i + n
            coupling_map.append([i, bottom_neighbor])
            coupling_map.append([bottom_neighbor, i])

    unique_couplings = {frozenset(pair) for pair in coupling_map}
    return [list(pair) for pair in unique_couplings]


def main():
    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Compile a Grover circuit and extract interactions.")
    parser.add_argument(
        "-q", "--grover_qubits",
        type=int,
        default=3,
        help="Number of qubits for the Grover circuit (default: 3)"
    )
    parser.add_argument(
        "-g", "--grid_size",
        type=int,
        default=3,
        help="Dimension of the n x n grid for qubit coupling (default: 3, for a 3x3 grid)"
    )
    args = parser.parse_args()

    # --- Configuration from args ---
    n_grid_size = args.grid_size
    m_grover_qubits = args.grover_qubits
    # ---------------------

    print(f"Config: Grover qubits = {m_grover_qubits}, Grid size = {n_grid_size}x{n_grid_size}")

    if m_grover_qubits > n_grid_size * n_grid_size:
        print(
            f"Warning: Grover circuit has {m_grover_qubits} qubits, but the grid only has {n_grid_size * n_grid_size} qubits."
        )
        print(
            "Compilation might fail or produce a very inefficient circuit if m > n*n."
        )
        # Decide if we should proceed or exit. For now, let's proceed.
        # return

    print(f"Defining a {n_grid_size}x{n_grid_size} quantum processor grid.")
    coupling_map_list = create_nxn_grid_coupling_map(n_grid_size)

    if not coupling_map_list and n_grid_size > 1:
        print(
            f"Generated an empty coupling map for n={n_grid_size}. This might be an issue."
        )
    elif n_grid_size > 1:
        print(f"Generated coupling map: {coupling_map_list}")

    # Create Grover circuit
    print(
        f"\nCreating a Grover circuit for {m_grover_qubits} qubits."
    )
    
    # Define the number of qubits for the Grover algorithm
    num_qubits_grover = m_grover_qubits

    # Create the Grover circuit object
    grover_qc = QuantumCircuit(num_qubits_grover, name="Grover")

    # 1. Initial state preparation (Hadamard on all qubits)
    grover_qc.h(range(num_qubits_grover))

    # 2. Oracle definition (marks the all '1's state)
    # For example, if num_qubits_grover is 3, it marks |111>
    oracle_string = '1' * num_qubits_grover
    oracle = PhaseOracle(oracle_string)

    # 3. Grover operator (one iteration: Oracle + Diffusion)
    # The GroverOperator handles the diffusion part internally.
    # The state_preparation argument within GroverOperator is for the diffuser's construction,
    # not the initial algorithm state preparation. Using None is fine for standard diffusion.
    grover_op = GroverOperator(oracle=oracle)
    
    # Append the Grover operator to the circuit
    grover_qc.compose(grover_op, inplace=True)
    
    # For more Grover iterations, you could append grover_op multiple times:
    # num_iterations = int(np.pi / 4 * np.sqrt(2**num_qubits_grover)) # Optimal iterations
    # for _ in range(num_iterations -1): # -1 because one is already applied
    #     grover_qc.compose(grover_op, inplace=True)


    print("Original Grover circuit (1 iteration, marking all '1's state):")
    print(grover_qc.draw(output="text"))

    # Transpile the Grover circuit for the grid
    custom_coupling_map = CouplingMap(couplinglist=coupling_map_list)

    print(
        f"\nTranspiling Grover circuit for the {n_grid_size}x{n_grid_size} grid topology..."
    )
    transpiled_qc = transpile(
        grover_qc,
        coupling_map=custom_coupling_map,
        basis_gates=["u1", "u2", "u3", "cx"],
        optimization_level=3,
    )

    print("\nTranspiled Grover circuit:")
    print(transpiled_qc.draw(output="text"))

    print("\nQASM for the transpiled circuit:")
    print(qasm3.dumps(transpiled_qc))

    # --- Extract qubit interactions per time slice ---
    print("\nExtracting qubit interactions for visualization...")
    dag = circuit_to_dag(transpiled_qc)
    slices_data_for_json = []
    
    qubit_indices = {qubit: i for i, qubit in enumerate(transpiled_qc.qubits)}

    for i, layer in enumerate(dag.layers()):
        slice_ops = []
        for node in layer['graph'].op_nodes():
            op = node.op
            op_name = op.name
            op_qubit_indices = [qubit_indices[q] for q in node.qargs]
            slice_ops.append({"name": op_name, "qubits": op_qubit_indices})
        
        if slice_ops:
            slices_data_for_json.append(slice_ops)

    num_qubits_for_viz = transpiled_qc.num_qubits
    
    output_data = {
        "num_qubits": num_qubits_for_viz,
        "operations_per_slice": slices_data_for_json
    }

    output_filename = "grover_viz_data.json"

    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=4)

    print(f"Interaction data saved to {output_filename}")
    print(f"  Number of qubits: {num_qubits_for_viz}")
    print(f"  Number of time slices: {len(slices_data_for_json)}")
    # --- End of interaction extraction ---


if __name__ == "__main__":
    main() 