import React from 'react';
import { colors } from '../theme/colors.js';

// Styles for when this component is embedded
const embeddedContainerStyle: React.CSSProperties = {
    width: '90%', // Match other elements in HeatmapControls
    padding: '10px',
    marginTop: '0px', // Legend container should have marginBottom
    border: `1px solid ${colors.border.light}`,
    borderRadius: '4px',
    color: colors.text.primary,
    fontFamily: 'Arial, sans-serif',
    fontSize: '1em',
    textAlign: 'left',
    backgroundColor: 'rgba(40, 40, 40, 0.5)', // Slight background to differentiate if needed
};

const titleStyle: React.CSSProperties = {
    fontSize: '1.1em',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
    color: colors.text.muted,
};

const controlTextStyle: React.CSSProperties = {
    margin: '4px 0',
};

const arrowStyle: React.CSSProperties = {
    fontSize: '1.5em',
    marginRight: '5px',
};

const HStyle: React.CSSProperties = {
    fontSize: '1.2em',
    marginRight: '10px',
    marginLeft: '5px',
};

const CStyle: React.CSSProperties = {
    fontSize: '1.2em',
    marginRight: '10px',
    marginLeft: '5px',
};

const EStyle: React.CSSProperties = {
    fontSize: '1.2em',
    marginRight: '10px',
    marginLeft: '5px',
};

const KeyboardControlsGuide: React.FC = () => {
    return (
        <div style={embeddedContainerStyle}>
            <div style={titleStyle}>Keyboard Controls</div>
            <div style={controlTextStyle}>
                <span style={arrowStyle}>←</span> : Prev Slice
            </div>
            <div style={controlTextStyle}>
                <span style={arrowStyle}>→</span> : Next Slice
            </div>
            <div style={controlTextStyle}>
                <span style={HStyle}>H</span> : Toggle UI
            </div>
            <div style={controlTextStyle}>
                <span style={CStyle}>C</span> : Collapse All
            </div>
            <div style={controlTextStyle}>
                <span style={EStyle}>E</span> : Expand All
            </div>
        </div>
    );
};

export default KeyboardControlsGuide;
