import React from "react";

interface DebugInfoProps {
    fps: number;
    layoutTime: number;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ fps, layoutTime }) => {
    const containerStyle: React.CSSProperties = {
        position: "fixed",
        bottom: "220px", // Positioned above the playback controls
        right: "20px",
        width: "250px",
        padding: "15px",
        boxSizing: "border-box",
        zIndex: 10,
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        color: "white",
        fontFamily: "Arial, sans-serif",
    };

    const titleStyle: React.CSSProperties = {
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: "10px",
    };

    const infoStyle: React.CSSProperties = {
        fontSize: "0.9em",
        lineHeight: "1.5",
    };

    return (
        <div style={containerStyle}>
            <div style={titleStyle}>Debug Info</div>
            <div style={infoStyle}>
                <div>FPS: {fps.toFixed(1)}</div>
                {layoutTime > 0 && (
                    <div>Last layout time: {layoutTime.toFixed(2)} ms</div>
                )}
            </div>
        </div>
    );
};

export default DebugInfo;
