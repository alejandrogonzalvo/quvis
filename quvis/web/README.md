# Quvis Web Interface

Interactive web client for Quvis quantum circuit visualization built with React and Three.js.

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## 🎯 **Features**

### **Interactive Circuit Generation**

- Real-time parameter selection
- Multiple quantum algorithms (QFT, GHZ, QAOA)
- Various hardware topologies
- Optimization level control

### **3D Visualization**

- **Three.js** powered 3D rendering
- Interactive timeline controls
- Multiple visualization modes
- Customizable appearance

### **Performance Monitoring**

- Real-time FPS display
- Rendering statistics
- Layout calculation timing
- Memory usage tracking

### **Responsive Design**

- Desktop and mobile support
- Collapsible control panels
- Keyboard shortcuts
- Touch interactions

## 🏗️ **Architecture**

```
src/
├── components/                 # React components
│   ├── AppearanceControls.tsx  # Visual customization
│   ├── LayoutControls.tsx      # 3D layout settings
│   ├── TimelineSlider.tsx      # Timeline navigation
│   └── LoadingIndicator.tsx    # Loading states
├── scene/                      # 3D visualization
│   ├── Playground.js           # Main 3D scene
│   ├── QubitGrid.js           # Qubit positioning
│   └── materials/             # Three.js materials
├── ui/                         # User interface
│   ├── App.tsx                # Main application
│   ├── components/            # UI components
│   └── theme/                 # Design system
└── shared/                     # Shared utilities
    ├── types.ts               # TypeScript types
    └── utils.ts               # Helper functions
```

## 🎮 **User Interface**

### **Parameter Selection**

- Circuit type selection (QFT, GHZ, QAOA)
- Qubit count slider (4-1000)
- Topology selection (line, grid, heavy-hex)
- Optimization level control

### **Visualization Controls**

- **Timeline**: Step through circuit execution
- **Appearance**: Customize colors, sizes, transparency
- **Layout**: Adjust 3D positioning algorithms
- **Fidelity**: Simulate quantum noise effects

### **Keyboard Shortcuts**

- `Space`: Play/pause timeline
- `0`: Reset camera view
- `H`: Toggle UI visibility
- `Arrow Keys`: Navigate timeline

## 🔧 **Development**

### **Prerequisites**

- Node.js 18+
- npm or yarn
- Modern web browser

### **Setup**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### **Code Style**

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Git hooks

## 📊 **Performance**

### **Optimization Features**

- **Caching**: Intelligent circuit data caching
- **Lazy Loading**: Component lazy loading
- **Memory Management**: Efficient Three.js cleanup
- **Responsive Rendering**: Adaptive frame rates

### **Monitoring**

- Real-time FPS display
- Memory usage tracking
- Render time statistics
- Layout calculation timing

## 🧪 **Testing**

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:ui
```

## 🌐 **Deployment**

### **Production Build**

```bash
npm run build
```

### **Static Hosting**

The built application can be deployed to any static hosting service:

- GitHub Pages
- Netlify
- Vercel
- AWS S3

## 🔌 **Integration**

### **API Integration**

The web interface communicates with the Quvis core library via:

- `/api/generate-circuit` endpoint
- Real-time circuit compilation
- Cached result retrieval

### **Data Flow**

1. User selects parameters
2. Web interface sends request to core API
3. Core library compiles quantum circuit
4. Visualization data returned to frontend
5. 3D scene updated with new data

## 🤝 **Contributing**

Areas for contribution:

- **UI/UX**: Improve user interface and experience
- **Visualization**: Enhance 3D rendering and effects
- **Performance**: Optimize rendering and memory usage
- **Accessibility**: Improve accessibility features
- **Mobile**: Enhance mobile device support

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 **License**

This project is part of Quvis and is licensed under the MIT License.

---

**Quvis Web** - Making quantum circuits interactive and accessible.
