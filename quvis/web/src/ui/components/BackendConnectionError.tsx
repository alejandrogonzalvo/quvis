import React from 'react';
import { colors } from '../theme/colors.js';

interface BackendConnectionErrorProps {
    isVisible: boolean;
    onClose: () => void;
    apiUrl: string;
}

const BackendConnectionError: React.FC<BackendConnectionErrorProps> = ({
    isVisible,
    onClose,
    apiUrl,
}) => {
    if (!isVisible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: colors.background.panelSolid,
                    border: `2px solid ${colors.state.error}`,
                    borderRadius: '8px',
                    padding: '30px',
                    maxWidth: '500px',
                    boxShadow: `0 4px 20px ${colors.shadow.dark}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    style={{
                        color: colors.state.error,
                        marginTop: 0,
                        marginBottom: '20px',
                        fontSize: '24px',
                    }}
                >
                    ⚠️ Backend Connection Error
                </h2>

                <p style={{ color: colors.text.primary, lineHeight: '1.6' }}>
                    Unable to connect to the FastAPI backend at:
                </p>

                <code
                    style={{
                        display: 'block',
                        backgroundColor: colors.shadow.medium,
                        padding: '10px',
                        borderRadius: '4px',
                        color: colors.primary.accent,
                        marginBottom: '20px',
                        wordBreak: 'break-all',
                    }}
                >
                    {apiUrl}
                </code>

                <p style={{ color: colors.text.primary, lineHeight: '1.6' }}>
                    <strong>To fix this, start the backend server:</strong>
                </p>

                <pre
                    style={{
                        backgroundColor: colors.shadow.medium,
                        padding: '15px',
                        borderRadius: '4px',
                        overflowX: 'auto',
                        color: colors.text.primary,
                        fontSize: '13px',
                    }}
                >
                    {`# Start both backend and frontend:
./scripts/start-dev.sh

# Or start backend only:
./scripts/start-backend.sh`}
                </pre>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        backgroundColor: colors.primary.main,
                        color: colors.text.primary,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        width: '100%',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                            colors.primary.dark;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                            colors.primary.main;
                    }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

export default BackendConnectionError;
