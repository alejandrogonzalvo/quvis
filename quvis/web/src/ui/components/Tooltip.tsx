import React, { useEffect, useState, useRef } from "react";
import { colors } from "../theme/colors.js";

interface TooltipProps {
    visible: boolean;
    content: string;
    x: number;
    y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ visible, content, x, y }) => {
    const [opacity, setOpacity] = useState(0);
    const [shouldRender, setShouldRender] = useState(false);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        if (visible) {
            setShouldRender(true);
            setOpacity(0);
            fadeTimeoutRef.current = setTimeout(() => setOpacity(1), 50);
        } else {
            setOpacity(0);
            fadeTimeoutRef.current = setTimeout(() => setShouldRender(false), 200);
        }

        return () => {
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
    }, [visible, content, x, y]);

    if (!shouldRender) {
        return null;
    }

    const style: React.CSSProperties = {
        position: "fixed",
        top: y,
        left: x - 50,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: colors.text.primary,
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "0.9em",
        fontFamily: "Arial, sans-serif",
        zIndex: 1000,
        pointerEvents: "none",
        whiteSpace: "pre-line",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        opacity: opacity,
        transform: `translateY(${opacity === 1 ? 0 : 10}px)`,
        transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
    };

    return <div style={style}>{content}</div>;
};

export default Tooltip;
