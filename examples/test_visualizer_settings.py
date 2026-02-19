from qiskit import QuantumCircuit
from quvis import visualize_circuit
from quvis.config import VisualizerSettings

def test_visualizer_settings():
    # Create a simple circuit
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)

    # Define custom settings
    settings = VisualizerSettings(
        # Appearance
        render_bloch_spheres=True,
        connection_thickness=0.1,
        inactive_alpha=1,
        
        # Layout
        core_distance=18.5,
        repel_force=0.25,
        cooling_factor=0.995,
        iterations=5000,
        attract_force=0.2,
        
        # Heatmap
        heatmap_max_slices=40,
        heatmap_base_size=3100,
        
        
        # Fidelity
        one_qubit_fidelity_base=0.95
    )
    
    # Generate visualization data without opening browser
    data = visualize_circuit(
        qc, 
        algorithm_name="Settings Test",
        settings=settings,
        auto_open_browser=False
    )
    
    # Verify settings are in the output
    assert "settings" in data, "Settings not found in output data"
    out_settings = data["settings"]
    
    assert out_settings["qubit_size"] == 1.5
    assert out_settings["render_bloch_spheres"] == True
    assert out_settings["repel_force"] == 1.2
    assert out_settings["cooling_factor"] == 0.99
    assert out_settings["core_distance"] == 50.0
    assert out_settings["heatmap_max_slices"] == 10
    assert out_settings["one_qubit_fidelity_base"] == 0.95
    
    print("✅ Visualizer settings verification passed!")
    print("Settings found in JSON output:")
    import json
    print(json.dumps(out_settings, indent=2))

if __name__ == "__main__":
    test_visualizer_settings()
