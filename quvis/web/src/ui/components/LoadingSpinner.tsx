import React from "react";
import { colors } from "../theme/colors.js";

const LoadingSpinner: React.FC = () => {
    const spinnerStyle: React.CSSProperties = {
        border: `8px solid ${colors.loading.track}`,
        borderTop: `8px solid ${colors.loading.progress}`,
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        animation: "spin 2s linear infinite",
        margin: "20px auto",
        display: "block",
    };

    const keyframesStyle = `
@keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
}
`;

    return (
        <>
            <style>{keyframesStyle}</style>
            <div style={spinnerStyle}></div>
        </>
    );
};

export default LoadingSpinner;
