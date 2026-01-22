import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.js';
import PlaygroundPage from './pages/PlaygroundPage.js';

import DocsPage from './pages/DocsPage.js';

// Get base URL from Vite config (injected via define or fallback)
const BASE_URL = import.meta.env.BASE_URL || '/';

const App: React.FC = () => {
    return (
        <BrowserRouter basename={BASE_URL}>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/playground" element={<PlaygroundPage />} />
                <Route path="/docs" element={<DocsPage />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
