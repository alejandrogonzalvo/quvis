from qiskit import QuantumCircuit
from quvis import visualize_circuit
from quvis.config import VisualizerSettings

def test_heatmap_settings():
    # Create a simple circuit
    qc = QuantumCircuit(2)
    qc.h(0)

    # Define custom heatmap settings
    settings = VisualizerSettings(
        heatmap_max_slices=50,
        heatmap_base_size=2000.0,
        heatmap_fade_threshold=0.2,
        heatmap_green_threshold=0.4,
        heatmap_yellow_threshold=0.8,
        heatmap_intensity_power=0.5,
        heatmap_min_intensity=0.05,
        heatmap_border_width=0.1
    )
    
    # Generate visualization data without opening browser
    data = visualize_circuit(
        qc, 
        algorithm_name="Heatmap Settings Test",
        settings=settings,
        auto_open_browser=False,
        start_server=False
    )
    
    # Verify settings are in the output
    assert "settings" in data, "Settings not found in output data"
    out_settings = data["settings"]
    
    # Check heatmap specific settings
    assert out_settings["heatmap_max_slices"] == 50
    assert out_settings["heatmap_base_size"] == 2000.0
    assert out_settings["heatmap_fade_threshold"] == 0.2
    assert out_settings["heatmap_green_threshold"] == 0.4
    assert out_settings["heatmap_yellow_threshold"] == 0.8
    assert out_settings["heatmap_intensity_power"] == 0.5
    assert out_settings["heatmap_min_intensity"] == 0.05
    assert out_settings["heatmap_border_width"] == 0.1
    
    print("✅ Heatmap settings verification passed!")
    print("Settings found in JSON output:")
    import json
    # Filter only heatmap keys for display
    heatmap_keys = {k: v for k, v in out_settings.items() if k.startswith("heatmap_")}
    print(json.dumps(heatmap_keys, indent=2))

if __name__ == "__main__":
    test_heatmap_settings()
