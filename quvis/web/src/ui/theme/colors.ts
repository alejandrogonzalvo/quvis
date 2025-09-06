// Color Palette for Quvis Web Application
// Centralized color management system

export const colors = {
    // Primary Brand Colors
    primary: {
        main: "#007bff", // Main blue used for buttons, active states, borders
        accent: "#61DAFB", // Cyan accent color for titles and links
        light: "rgba(0, 123, 255, 0.7)",
        dark: "#0056b3",
    },

    // Background Colors
    background: {
        main: "#121212", // Main dark background
        panel: "rgba(50, 50, 50, 0.8)", // Semi-transparent panel background
        panelSolid: "#333333", // Solid panel background
        panelAlt: "rgba(40, 40, 40, 0.9)", // Alternative panel background
        hover: "#444444", // Hover state background
    },

    // Text Colors
    text: {
        primary: "#ffffff", // Primary white text
        secondary: "#eeeeee", // Slightly muted white
        muted: "#cccccc", // Muted text
        disabled: "#aaaaaa", // Disabled/placeholder text
    },

    // Border and UI Element Colors
    border: {
        main: "#555555", // Main border color
        light: "rgba(255, 255, 255, 0.3)", // Light transparent border
        active: "#007bff", // Active/focused border
        separator: "#666666", // Section separators
    },

    // State Colors
    state: {
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545",
        info: "#17a2b8",
    },

    // Loading and Progress Colors
    loading: {
        track: "#f3f3f3", // Loading spinner track
        progress: "#3498db", // Loading spinner progress
    },

    // Shadow and Overlay Colors
    shadow: {
        light: "rgba(0, 0, 0, 0.3)",
        medium: "rgba(0, 0, 0, 0.5)",
        dark: "rgba(0, 0, 0, 0.7)",
        text: "#000000", // Text shadow
    },

    // Interactive Element Colors
    interactive: {
        button: {
            background: "rgba(255, 255, 255, 0.1)",
            border: "rgba(255, 255, 255, 0.3)",
            hover: "rgba(255, 255, 255, 0.2)",
        },
        slider: {
            track: "#555555",
            rail: "#555555",
            handle: "#007bff",
            selected: "#007bff",
        },
    },

    // Transparent Variations (commonly used)
    transparent: {
        white10: "rgba(255, 255, 255, 0.1)",
        white20: "rgba(255, 255, 255, 0.2)",
        white30: "rgba(255, 255, 255, 0.3)",
        black30: "rgba(0, 0, 0, 0.3)",
        black50: "rgba(0, 0, 0, 0.5)",
    },

    // Heatmap and Visualization Colors
    visualization: {
        heatmapGradient: {
            start: "#00FF00", // Green
            middle: "#FFFF00", // Yellow
            end: "#FF0000", // Red
        },
        legendBorder: "#999999",
    },

    // UI Component Colors
    ui: {
        background: "rgba(50, 50, 50, 0.9)",
        surface: "rgba(255, 255, 255, 0.1)",
        accent: "#007bff",
        border: "rgba(255, 255, 255, 0.3)",
    },

    // Circuit Type Colors
    circuit: {
        logical: "#4CAF50",    // Green for logical circuits
        compiled: "#FF9800",   // Orange for compiled circuits
    },
} as const;

// Type definitions for better TypeScript support
export type ColorPalette = typeof colors;
export type PrimaryColors = keyof typeof colors.primary;
export type BackgroundColors = keyof typeof colors.background;
export type TextColors = keyof typeof colors.text;

// Helper functions for common color operations
export const colorHelpers = {
    // Get RGB values from hex
    hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null;
    },

    // Convert CSS color to THREE.js hex format
    cssColorToHex: (cssColor: string): number => {
        // Handle hex colors
        if (cssColor.startsWith("#")) {
            return parseInt(cssColor.replace("#", "0x"));
        }

        // Handle rgba/rgb colors - extract RGB values and convert to hex
        const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            return (r << 16) | (g << 8) | b;
        }

        // Fallback to white if color format is not recognized
        return 0xffffff;
    },

    // Create rgba string with custom opacity
    withOpacity: (color: string, opacity: number): string => {
        if (color.startsWith("rgba")) {
            // Replace existing opacity
            return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
        } else if (color.startsWith("rgb")) {
            // Convert rgb to rgba
            return color.replace("rgb", "rgba").replace(")", `, ${opacity})`);
        } else if (color.startsWith("#")) {
            // Convert hex to rgba
            const rgb = colorHelpers.hexToRgb(color);
            return rgb
                ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
                : color;
        }
        return color;
    },

    // Common color combinations for components
    getButtonStyle: (isActive: boolean = false, disabled: boolean = false) => ({
        backgroundColor: isActive
            ? colors.primary.main
            : colors.interactive.button.background,
        borderColor: isActive
            ? colors.primary.main
            : colors.interactive.button.border,
        color: colors.text.primary,
        opacity: disabled ? 0.5 : 1,
    }),

    getPanelStyle: () => ({
        backgroundColor: colors.background.panel,
        color: colors.text.primary,
        borderRadius: "8px",
        boxShadow: `0 2px 10px ${colors.shadow.light}`,
    }),
};

export default colors;
