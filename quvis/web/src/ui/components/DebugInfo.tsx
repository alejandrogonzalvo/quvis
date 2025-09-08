import React from "react";
import { colors } from "../theme/colors.js";

interface DebugInfoProps {
    fps: number;
    layoutTime: number;
    bottomPosition: string;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ fps, layoutTime, bottomPosition }) => {
    const containerStyle: React.CSSProperties = {
        position: "fixed",
        bottom: bottomPosition,
        right: "20px",
        width: "250px",
        padding: "15px",
        boxSizing: "border-box",
        zIndex: 10,
        backgroundColor: colors.background.panel,
        borderRadius: "8px",
        color: colors.text.primary,
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
