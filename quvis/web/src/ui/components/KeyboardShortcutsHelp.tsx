import React from "react";
import { colors } from "../theme/colors.js";

interface KeyboardShortcutsHelpProps {
    isVisible: boolean;
    onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};

const popupStyle: React.CSSProperties = {
    backgroundColor: colors.background.panel,
    padding: "30px",
    borderRadius: "12px",
    color: colors.text.primary,
    fontFamily: "Inter, system-ui, sans-serif",
    width: "600px",
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: `0 8px 32px ${colors.shadow.light}`,
    position: "relative",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${colors.border.separator}`,
    paddingBottom: "20px",
    marginBottom: "30px",
};

const titleStyle: React.CSSProperties = {
    margin: "0",
    fontSize: "24px",
    fontWeight: 600,
    color: colors.text.primary,
};

const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: colors.text.secondary,
    fontSize: "24px",
    cursor: "pointer",
    padding: "5px",
    borderRadius: "4px",
    transition: "all 0.2s ease",
};

const contentStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
};

const sectionStyle: React.CSSProperties = {
    marginBottom: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: colors.text.primary,
    marginBottom: "15px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
};

const shortcutListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
};

const shortcutItemStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: `1px solid ${colors.border.subtle}`,
    fontSize: "14px",
};

const keyStyle: React.CSSProperties = {
    backgroundColor: colors.ui.surface,
    color: colors.text.primary,
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    border: `1px solid ${colors.border.separator}`,
    minWidth: "24px",
    textAlign: "center",
    marginLeft: "4px",
};

const descriptionStyle: React.CSSProperties = {
    color: colors.text.primary,
    flex: 1,
};

const footerStyle: React.CSSProperties = {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: colors.ui.surface,
    borderRadius: "8px",
    fontSize: "13px",
    color: colors.text.secondary,
    textAlign: "center",
    gridColumn: "1 / -1",
};

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
    isVisible,
    onClose,
}) => {
    if (!isVisible) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const shortcuts = {
        camera: [
            { keys: ["↑", "W"], description: "Rotate up" },
            { keys: ["↓", "S"], description: "Rotate down" },
            { keys: ["←", "A"], description: "Rotate left" },
            { keys: ["→", "D"], description: "Rotate right" },
            { keys: ["Q"], description: "Roll left" },
            { keys: ["E"], description: "Roll right" },
            { keys: ["+", "="], description: "Zoom in" },
            { keys: ["-"], description: "Zoom out" },
            { keys: ["P"], description: "Pan left" },
            { keys: ["L"], description: "Pan right" },
            { keys: ["J"], description: "Pan down" },
            { keys: ["K"], description: "Pan up" },
        ],
        views: [
            { keys: ["1"], description: "Front view" },
            { keys: ["2"], description: "Right view" },
            { keys: ["3"], description: "Top view" },
            { keys: ["4"], description: "Isometric view" },
            { keys: ["R"], description: "Reset camera" },
        ],
        interface: [
            { keys: ["H"], description: "Toggle this help" },
            { keys: ["Space"], description: "Play/Pause timeline" },
            { keys: ["Esc"], description: "Close dialogs" },
        ],
        sliders: [
            { keys: ["Tab"], description: "Navigate between controls" },
            { keys: ["Enter"], description: "Activate buttons" },
            { keys: ["↑↓"], description: "Adjust slider values" },
        ],
    };

    const renderShortcut = (shortcut: { keys: string[]; description: string }, index: number) => (
        <li key={index} style={shortcutItemStyle}>
            <span style={descriptionStyle}>{shortcut.description}</span>
            <div>
                {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex}>
                        <span style={keyStyle}>{key}</span>
                        {keyIndex < shortcut.keys.length - 1 && (
                            <span style={{ margin: "0 2px", color: colors.text.secondary }}>or</span>
                        )}
                    </span>
                ))}
            </div>
        </li>
    );

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={popupStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Keyboard Shortcuts</h2>
                    <button
                        style={closeButtonStyle}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.ui.surface;
                            e.currentTarget.style.color = colors.text.primary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "none";
                            e.currentTarget.style.color = colors.text.secondary;
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={contentStyle}>
                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>Camera Controls</h3>
                        <ul style={shortcutListStyle}>
                            {shortcuts.camera.map(renderShortcut)}
                        </ul>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>View Presets</h3>
                        <ul style={shortcutListStyle}>
                            {shortcuts.views.map(renderShortcut)}
                        </ul>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>Interface</h3>
                        <ul style={shortcutListStyle}>
                            {shortcuts.interface.map(renderShortcut)}
                        </ul>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>Controls</h3>
                        <ul style={shortcutListStyle}>
                            {shortcuts.sliders.map(renderShortcut)}
                        </ul>
                    </div>
                </div>

                <div style={footerStyle}>
                    <strong>Tip:</strong> Use these keyboard shortcuts for efficient navigation and precise camera positioning when capturing screenshots for papers.
                    <br />
                    <strong>Press H</strong> anytime to toggle this help dialog.
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsHelp;