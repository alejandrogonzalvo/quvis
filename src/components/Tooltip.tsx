import React from "react";

interface TooltipProps {
    visible: boolean;
    content: string;
    x: number;
    y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ visible, content, x, y }) => {
    if (!visible) {
        return null;
    }

    const style: React.CSSProperties = {
        position: "fixed",
        top: y + 10, // Offset slightly from cursor
        left: x + 10, // Offset slightly from cursor
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "0.9em",
        fontFamily: "Arial, sans-serif",
        zIndex: 1000, // Ensure it's on top
        pointerEvents: "none", // So it doesn't interfere with mouse events on other elements
        whiteSpace: "nowrap",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    };

    return <div style={style}>{content}</div>;
};

export default Tooltip;
