from qiskit import QuantumCircuit
from quvis import Visualizer, VisualizerSettings

# 1. Define global settings (defaults)
global_settings = VisualizerSettings(
    heatmap_intensity_power=0.2, # Low intensity default
    render_bloch_spheres=False   # No spheres default
)

# 2. Define specific settings for Circuit 2
circuit2_settings = VisualizerSettings(
    heatmap_intensity_power=0.8, # High intensity override
    render_bloch_spheres=True,   # Spheres on override
    qubit_size=2.0,              # Large qubits
    heatmap_yellow_threshold=0.5 # Custom threshold
)

# 3. Create circuits
qc1 = QuantumCircuit(3)
qc1.h(0)
qc1.cx(0, 1)
qc1.cx(1, 2)

qc2 = QuantumCircuit(3)
qc2.x(0)
qc2.y(1)
qc2.z(2)

# 4. Initialize Visualizer with global settings
visualizer = Visualizer(settings=global_settings, start_server=False)

# 5. Add Circuit 1 (uses global settings)
visualizer.add_circuit(qc1, algorithm_name="Circuit 1 (Default)")

# 6. Add Circuit 2 (uses specific settings)
visualizer.add_circuit(qc2, algorithm_name="Circuit 2 (Override)", settings=circuit2_settings)

# 7. Generate Data
data = visualizer.visualize()

# 8. Verify Data Structure
print("Verifying generated data...")

c1_data = data["circuits"][0]
c2_data = data["circuits"][1]

# Check Global Settings in Root (if applicable) or assumed default behavior
# The root 'settings' should match global_settings
root_settings = data.get("settings")
print(f"Root Settings (Intensity): {root_settings['heatmap_intensity_power']} (Expected 0.2)")
assert root_settings['heatmap_intensity_power'] == 0.2
assert root_settings['render_bloch_spheres'] == False

# Check Circuit 1 Settings (Should be None or match global if explicitly merged, but logic puts it in root)
# Our implementation adds 'settings' to circuit data ONLY if passed to add_circuit.
# So c1_data['settings'] might be None or missing, implying usage of root settings.
c1_has_settings = "settings" in c1_data and c1_data["settings"] is not None
print(f"Circuit 1 has explicit settings: {c1_has_settings} (Expected False)")

# Check Circuit 2 Settings (Should be present and match circuit2_settings)
c2_settings_data = c2_data.get("settings")
print(f"Circuit 2 Settings (Intensity): {c2_settings_data['heatmap_intensity_power']} (Expected 0.8)")
assert c2_settings_data['heatmap_intensity_power'] == 0.8
assert c2_settings_data['render_bloch_spheres'] == True
assert c2_settings_data['qubit_size'] == 2.0

print("\n✅ Verification Successful!")
