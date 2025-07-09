import React from "react";
import { colors } from "../theme/colors.js";

interface DatasetSelectionProps {
    onSelect: (datasetName: string | File) => void;
}

const DatasetSelection: React.FC<DatasetSelectionProps> = ({ onSelect }) => {
    const buttonStyle: React.CSSProperties = {
        padding: "20px 40px",
        margin: "20px",
        fontSize: "24px",
        cursor: "pointer",
        backgroundColor: colors.background.panelSolid,
        color: colors.text.primary,
        border: `2px solid ${colors.border.main}`,
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
        backgroundColor: colors.background.main,
        color: colors.text.primary,
        fontFamily: '"Arial", sans-serif',
        textAlign: "center",
    };

    const mainTitleStyle: React.CSSProperties = {
        fontSize: "72px",
        fontWeight: "bold",
        color: colors.primary.accent,
        textShadow: `3px 3px 6px ${colors.shadow.text}`,
        marginBottom: "30px",
    };

    const subTitleStyle: React.CSSProperties = {
        fontSize: "28px",
        marginBottom: "10px",
        color: colors.text.secondary,
        textShadow: `2px 2px 4px ${colors.shadow.text}`,
    };

    const infoTextStyle: React.CSSProperties = {
        fontSize: "18px",
        color: colors.text.disabled,
        marginTop: "-20px", // Pull it closer to the subtitle
        marginBottom: "50px", // Add space before buttons
    };

    const linkStyle: React.CSSProperties = {
        color: colors.primary.accent,
        textDecoration: "none",
    };

    const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = colors.background.hover;
        e.currentTarget.style.transform = "scale(1.05)";
    };

    const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = colors.background.panelSolid;
        e.currentTarget.style.transform = "scale(1)";
    };

    return (
        <div style={containerStyle}>
            <h1 style={mainTitleStyle}>QuViS</h1>
            <p style={infoTextStyle}>
                Version 0.17.1 <br />
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
