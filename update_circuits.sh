#!/bin/bash

# This script updates the pre-generated circuit visualization data in the public/ directory.
# It runs the Python compiler scripts with specific parameters to generate the JSON files.

# Ensure the script is run from the project root
if [ ! -f "package.json" ] || [ ! -d "quvis-algorithm-generator" ]; then
    echo "Error: This script must be run from the project root directory."
    exit 1
fi

# Define paths
PUBLIC_DIR="public"
GENERATOR_DIR="quvis-algorithm-generator"

# Create public directory if it doesn't exist
mkdir -p $PUBLIC_DIR

echo "--- Starting Circuit Generation (using poetry from quvis-algorithm-generator) ---"

# QFT 100 Qubits (using 10x10 grid)
echo "Generating QFT circuit with 100 qubits (10x10 grid)..."
(cd $GENERATOR_DIR && poetry run python3 qft_compiler.py \
    -q 100 \
    -c coupling-maps/grid_10x10.json \
    -o ../$PUBLIC_DIR/qft_viz_data_10x10.json)

# QAOA 100 Qubits (using 10x10 grid)
echo "Generating QAOA circuit with 100 qubits (10x10 grid)..."
(cd $GENERATOR_DIR && poetry run python3 qaoa_compiler.py \
    -q 100 \
    -c coupling-maps/grid_10x10.json \
    -o ../$PUBLIC_DIR/qaoa_viz_data_10x10.json)

# GHZ 2500 Qubits (using 50x50 grid)
echo "Generating GHZ circuit with 2500 qubits (50x50 grid)..."
(cd $GENERATOR_DIR && poetry run python3 ghz_compiler.py \
    -q 2500 \
    -c coupling-maps/grid_50x50.json \
    -o ../$PUBLIC_DIR/ghz_viz_data_50x50.json)

# GHZ 1500 Qubits (using Heavy Hex 35x35)
# Note: The exact qubit count for heavy-hex graphs is complex. 
# We are selecting a large map that should be close to the target.
echo "Generating GHZ circuit for a ~1500 qubit heavy-hex topology (35x35)..."
(cd $GENERATOR_DIR && poetry run python3 ghz_compiler.py \
    -q 1470 \
    -c coupling-maps/heavy_hex_35x35.json \
    -o ../$PUBLIC_DIR/ghz_viz_data_heavy_hex_35x35.json)

echo "--- Circuit Generation Complete ---" 