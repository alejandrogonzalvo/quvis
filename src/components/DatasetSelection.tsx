import React from "react";

interface DatasetSelectionProps {
    onSelect: (datasetName: string | File) => void;
}

const DatasetSelection: React.FC<DatasetSelectionProps> = ({ onSelect }) => {
    const buttonStyle: React.CSSProperties = {
        padding: "20px 40px",
        margin: "20px",
        fontSize: "24px",
        cursor: "pointer",
        backgroundColor: "#333",
        color: "white",
        border: "2px solid #555",
        borderRadius: "10px",
        transition: "background-color 0.3s, transform 0.2s",
    };

    const containerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#121212", // Dark background
        color: "white",
        fontFamily: '"Arial", sans-serif',
        textAlign: "center", // Ensure text is centered
    };

    const mainTitleStyle: React.CSSProperties = {
        fontSize: "72px",
        fontWeight: "bold",
        color: "#61DAFB", // A vibrant, techy blue
        textShadow: "3px 3px 6px #000000",
        marginBottom: "30px",
    };

    const subTitleStyle: React.CSSProperties = {
        fontSize: "28px",
        marginBottom: "10px",
        color: "#eee",
        textShadow: "2px 2px 4px #000000",
    };

    const infoTextStyle: React.CSSProperties = {
        fontSize: "18px",
        color: "#aaa",
        marginTop: "-20px", // Pull it closer to the subtitle
        marginBottom: "50px", // Add space before buttons
    };

    const linkStyle: React.CSSProperties = {
        color: "#61DAFB",
        textDecoration: "none",
    };

    const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = "#444";
        e.currentTarget.style.transform = "scale(1.05)";
    };

    const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = "#333";
        e.currentTarget.style.transform = "scale(1)";
    };

    return (
        <div style={containerStyle}>
            <h1 style={mainTitleStyle}>QuViS</h1>
            <p style={infoTextStyle}>
                Version 0.17.0 <br />
                Made by{" "}
                <a
                    href="https://github.com/alejandrogonzalvo/quvis"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                >
                    @alejandrogonzalvo
                </a>
            </p>
            <h2 style={subTitleStyle}>Select Visualization</h2>
            <div>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("qft")}
                >
                    Quantum Fourier Transform (QFT)
                </button>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("qaoa")}
                >
                    Quantum Approximate Optimization Algorithm (QAOA)
                </button>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("ghz")}
                >
                    Greenberger-Horne-Zeilinger (GHZ)
                </button>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("ghz_viz_data100x100.json")}
                >
                    GHZ 10.000 qubits
                </button>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("ghz_viz_data_heavy_hex.json")}
                >
                    GHZ Heavy Hex
                </button>
                <button
                    style={buttonStyle}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={() => onSelect("ghz_viz_data_3d.json")}
                >
                    GHZ 3D Grid
                </button>
            </div>
        </div>
    );
};

export default DatasetSelection;
