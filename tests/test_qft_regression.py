"""
QFT Circuit Regression Test

This test generates a QFT circuit with 144 qubits on a 2D grid topology,
saves the baseline connection and interaction data, and provides utilities
for future regression testing to ensure implementation consistency.
"""

import json
from math import sqrt, ceil
from pathlib import Path
from typing import Any
import argparse

from qiskit import transpile
from qiskit.circuit.library import QFT
from qiskit.transpiler import CouplingMap
from quvis import Visualizer


def create_2d_grid_coupling_map(num_qubits: int) -> CouplingMap:
    """Create a 2D grid coupling map for the given number of qubits."""
    grid_size = int(ceil(sqrt(num_qubits)))
    return CouplingMap.from_grid(grid_size, grid_size)


def extract_regression_data(visualization_data: dict[str, Any]) -> dict[str, Any]:
    """Extract the key data needed for regression testing."""
    regression_data = {}

    for i, circuit_data in enumerate(visualization_data["circuits"]):
        circuit_name = circuit_data["algorithm_name"]
        circuit_type = circuit_data["circuit_type"]

        # Extract connection and interaction data
        extracted_data = {
            "algorithm_name": circuit_name,
            "circuit_type": circuit_type,
            "num_qubits": circuit_data["circuit_info"]["num_qubits"],
            "circuit_stats": circuit_data["circuit_stats"],
        }

        if circuit_type == "logical":
            extracted_data["operations_per_slice"] = circuit_data["circuit_info"]["interaction_graph_ops_per_slice"]
        else:
            extracted_data["operations_per_slice"] = circuit_data["circuit_info"]["compiled_interaction_graph_ops_per_slice"]

            # Include routing information for compiled circuits
            if "routing_info" in circuit_data:
                extracted_data["routing_info"] = {
                    "routing_ops_per_slice": circuit_data["routing_info"]["routing_ops_per_slice"],
                    "total_swap_count": circuit_data["routing_info"]["total_swap_count"],
                    "routing_depth": circuit_data["routing_info"]["routing_depth"],
                }

        # Extract device connectivity information
        extracted_data["device_info"] = {
            "num_qubits_on_device": circuit_data["device_info"]["num_qubits_on_device"],
            "connectivity_graph_coupling_map": circuit_data["device_info"]["connectivity_graph_coupling_map"],
        }

        regression_data[f"circuit_{i}"] = extracted_data

    return regression_data


def generate_qft_regression_baseline():
    num_qubits = 144
    optimization_level = 0

    coupling_map = create_2d_grid_coupling_map(num_qubits)
    print(f"📐 Created 2D grid coupling map with {coupling_map.size()} qubits")

    qft_circuit = QFT(num_qubits).decompose()
    visualizer = Visualizer(auto_open_browser=False, verbose=True)
    visualizer.add_circuit(
        qft_circuit.copy(),
        coupling_map=None,
        algorithm_name=f"QFT Logical (Q={num_qubits})"
    )

    transpiled_circuit = transpile(
        qft_circuit,
        coupling_map=coupling_map,
        optimization_level=optimization_level
    )
    visualizer.add_circuit(
        transpiled_circuit,
        coupling_map=coupling_map,
        algorithm_name=f"QFT Compiled (Q={num_qubits}, O={optimization_level})"
    )

    visualization_data = {
        "circuits": [circuit.to_dict() for circuit in visualizer.circuits],
        "total_circuits": len(visualizer.circuits),
    }

    regression_data = extract_regression_data(visualization_data)

    regression_data["metadata"] = {
        "num_qubits": num_qubits,
        "optimization_level": optimization_level,
        "grid_size": int(ceil(sqrt(num_qubits))),
        "total_circuits": len(visualizer.circuits),
        "description": f"QFT regression baseline with {num_qubits} qubits on 2D grid, optimization level {optimization_level}",
    }

    return regression_data


def save_regression_baseline(data: dict[str, Any], filename: str = "qft_regression_baseline.json"):
    baseline_path = Path(__file__).parent / filename

    print(f"💾 Saving baseline data to {baseline_path}...")
    with open(baseline_path, "w") as f:
        json.dump(data, f, indent=2, separators=(",", ": "))

    print(f"✅ Baseline data saved ({baseline_path.stat().st_size} bytes)")
    return baseline_path


def load_regression_baseline(filename: str = "qft_regression_baseline.json") -> dict[str, Any]:
    baseline_path = Path(__file__).parent / filename

    if not baseline_path.exists():
        raise FileNotFoundError(f"Baseline file not found: {baseline_path}")

    with open(baseline_path, "r") as f:
        return json.load(f)


def compare_regression_data(current_data: dict[str, Any], baseline_data: dict[str, Any]) -> dict[str, Any]:
    """Compare current regression data with baseline, accounting for routing stochasticity."""
    differences = {}

    # Compare metadata (excluding items that may vary due to routing)
    current_meta = current_data.get("metadata", {})
    baseline_meta = baseline_data.get("metadata", {})

    stable_meta_fields = ["num_qubits", "optimization_level", "grid_size", "total_circuits"]
    for field in stable_meta_fields:
        if current_meta.get(field) != baseline_meta.get(field):
            if "metadata_differences" not in differences:
                differences["metadata_differences"] = {}
            differences["metadata_differences"][field] = {
                "current": current_meta.get(field),
                "baseline": baseline_meta.get(field)
            }

    # Compare each circuit
    for circuit_key in baseline_data.keys():
        if circuit_key == "metadata":
            continue

        if circuit_key not in current_data:
            differences[f"missing_circuit_{circuit_key}"] = f"Circuit {circuit_key} not found in current data"
            continue

        current_circuit = current_data[circuit_key]
        baseline_circuit = baseline_data[circuit_key]

        # Compare deterministic fields
        deterministic_fields = ["num_qubits", "algorithm_name", "circuit_type"]

        for field in deterministic_fields:
            if current_circuit.get(field) != baseline_circuit.get(field):
                if f"{circuit_key}_differences" not in differences:
                    differences[f"{circuit_key}_differences"] = {}
                differences[f"{circuit_key}_differences"][field] = {
                    "current": current_circuit.get(field),
                    "baseline": baseline_circuit.get(field)
                }

        # Special handling for device_info to ignore minor format differences
        current_device = current_circuit.get("device_info", {})
        baseline_device = baseline_circuit.get("device_info", {})

        device_fields_to_compare = ["num_qubits_on_device"]
        for field in device_fields_to_compare:
            if current_device.get(field) != baseline_device.get(field):
                if f"{circuit_key}_differences" not in differences:
                    differences[f"{circuit_key}_differences"] = {}
                differences[f"{circuit_key}_differences"][f"device_{field}"] = {
                    "current": current_device.get(field),
                    "baseline": baseline_device.get(field)
                }

        # Compare coupling map length (connectivity should be the same structure)
        current_coupling = current_device.get("connectivity_graph_coupling_map", [])
        baseline_coupling = baseline_device.get("connectivity_graph_coupling_map", [])

        if len(current_coupling) != len(baseline_coupling):
            if f"{circuit_key}_differences" not in differences:
                differences[f"{circuit_key}_differences"] = {}
            differences[f"{circuit_key}_differences"]["coupling_map_length"] = {
                "current": len(current_coupling),
                "baseline": len(baseline_coupling)
            }

        # For logical circuits, compare operations_per_slice exactly
        if current_circuit.get("circuit_type") == "logical":
            if current_circuit.get("operations_per_slice") != baseline_circuit.get("operations_per_slice"):
                if f"{circuit_key}_differences" not in differences:
                    differences[f"{circuit_key}_differences"] = {}
                differences[f"{circuit_key}_differences"]["operations_per_slice"] = {
                    "current_length": len(current_circuit.get("operations_per_slice", [])),
                    "baseline_length": len(baseline_circuit.get("operations_per_slice", [])),
                    "note": "Full comparison omitted for readability - check saved files for details"
                }

        # For compiled circuits, only compare basic statistics due to routing stochasticity
        if current_circuit.get("circuit_type") == "compiled":
            current_stats = current_circuit.get("circuit_stats", {})
            baseline_stats = baseline_circuit.get("circuit_stats", {})

            # Only compare deterministic stats
            stable_stats = ["qubits"]  # original_gates represents the transpiled circuit, not the original
            for stat in stable_stats:
                if current_stats.get(stat) != baseline_stats.get(stat):
                    if f"{circuit_key}_differences" not in differences:
                        differences[f"{circuit_key}_differences"] = {}
                    if "circuit_stats_differences" not in differences[f"{circuit_key}_differences"]:
                        differences[f"{circuit_key}_differences"]["circuit_stats_differences"] = {}
                    differences[f"{circuit_key}_differences"]["circuit_stats_differences"][stat] = {
                        "current": current_stats.get(stat),
                        "baseline": baseline_stats.get(stat)
                    }

            # Report routing stats for information but don't fail on differences
            current_routing_stats = {
                "transpiled_gates": current_stats.get("transpiled_gates"),
                "depth": current_stats.get("depth"),
                "swap_count": current_stats.get("swap_count"),
            }
            baseline_routing_stats = {
                "transpiled_gates": baseline_stats.get("transpiled_gates"),
                "depth": baseline_stats.get("depth"),
                "swap_count": baseline_stats.get("swap_count"),
            }

            differences[f"{circuit_key}_routing_info"] = {
                "current": current_routing_stats,
                "baseline": baseline_routing_stats,
                "note": "Routing results may vary due to stochastic optimization - this is informational only"
            }

    return differences


def run_regression_test() -> bool:
    """Run the regression test comparing current implementation with baseline."""
    print("🧪 Running QFT regression test...")

    try:
        baseline_data = load_regression_baseline()
        current_data = generate_qft_regression_baseline()
        differences = compare_regression_data(current_data, baseline_data)

        critical_differences = {k: v for k, v in differences.items() if not k.endswith("_routing_info")}
        routing_info = {k: v for k, v in differences.items() if k.endswith("_routing_info")}

        if not critical_differences:
            print("✅ Regression test PASSED - no critical differences found")
            if routing_info:
                print("ℹ️  Routing differences found (expected due to stochastic optimization):")
                for key, info in routing_info.items():
                    print(f"   {key}: Current gates={info['current']['transpiled_gates']}, "
                         f"Baseline gates={info['baseline']['transpiled_gates']}")
            return True
        else:
            print("❌ Regression test FAILED - critical differences found:")
            for key, diff in critical_differences.items():
                print(f"   {key}: {diff}")

            if routing_info:
                print("ℹ️  Additional routing info:")
                for key, info in routing_info.items():
                    print(f"   {key}: {info['note']}")

            # Save current data for analysis
            save_regression_baseline(current_data, "qft_regression_current.json")
            print("💾 Current data saved as qft_regression_current.json for analysis")

            return False

    except FileNotFoundError:
        print("⚠️  No baseline found - generating new baseline...")
        baseline_data = generate_qft_regression_baseline()
        save_regression_baseline(baseline_data)
        print("✅ Baseline generated successfully")
        return True
    except Exception as e:
        print(f"❌ Regression test failed with error: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QFT Circuit Regression Test")
    parser.add_argument("--generate-baseline", action="store_true",
                       help="Generate new baseline data")
    parser.add_argument("--test", action="store_true",
                       help="Run regression test")

    args = parser.parse_args()

    if args.generate_baseline:
        baseline_data = generate_qft_regression_baseline()
        baseline_path = save_regression_baseline(baseline_data)
        print(f"🎯 Baseline generated and saved to {baseline_path}")
    elif args.test:
        success = run_regression_test()
        exit(0 if success else 1)
    else:
        success = run_regression_test()
        exit(0 if success else 1)