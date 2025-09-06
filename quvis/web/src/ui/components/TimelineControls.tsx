import React from "react";
import { colors } from "../theme/colors.js";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
const TimelineControls: React.FC<any> = () => {
    return (
        <div
            style={{
                padding: "10px",
                margin: "5px",
                backgroundColor: "rgba(60,60,60,0.7)", // Keep unmapped color for now
                borderRadius: "4px",
                color: colors.text.primary,
            }}
        >
            Timeline Controls (Placeholder)
        </div>
    );
};

export default TimelineControls;
