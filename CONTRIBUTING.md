# Contributing to QuViS

Thank you for your interest in contributing to QuViS! This document provides guidelines and information for contributors.

## 🚀 **Getting Started**

### Prerequisites
- **Python 3.8+** with Poetry
- **Node.js 18+** with npm
- **Git** for version control
- **Modern web browser** for testing

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/quvis.git
   cd quvis
   ```

2. **Install Dependencies**
   ```bash
   # Python dependencies
   cd quvis/core
   poetry install
   
   # Web dependencies
   cd ../web
   npm install
   ```

3. **Run Development Environment**
   ```bash
   # Start web development server
   cd quvis/web
   npm run dev
   
   # Test core library
   cd quvis/core
   poetry run python examples/library_usage.py
   ```

## 🎯 **Areas for Contribution**

### 1. **Core Library (`quvis/core/`)**
- **New Algorithms**: Implement support for additional quantum algorithms
- **Hardware Topologies**: Add new device architectures and coupling maps
- **Compilation Optimization**: Improve transpilation and routing algorithms
- **Performance**: Optimize visualization data generation
- **Documentation**: API documentation and examples

### 2. **Web Interface (`quvis/web/`)**
- **UI/UX**: Improve user interface and experience
- **Visualization**: Enhance 3D rendering and controls
- **Performance**: Optimize rendering and responsiveness
- **Accessibility**: Make the interface more accessible
- **Mobile Support**: Improve mobile device compatibility

### 3. **Documentation and Examples**
- **Tutorials**: Create learning materials and walkthroughs
- **API Documentation**: Improve code documentation
- **Examples**: Add more usage examples and use cases
- **Testing**: Add unit tests and integration tests

## 🔧 **Development Guidelines**

### Code Style
- **Python**: Follow PEP 8 style guide
- **JavaScript/TypeScript**: Use the project's ESLint configuration
- **Documentation**: Use clear, concise language with examples

### Testing
- **Python**: Use pytest for unit tests
- **Web**: Use the project's testing framework
- **Integration**: Test cross-package functionality

### Git Workflow
1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a pull request

## 🧪 **Testing Your Changes**

### Core Library Testing
```bash
cd quvis/core

# Run unit tests
poetry run pytest

# Test with different algorithms
poetry run python -c "
from quvis import visualize_circuit
from qiskit.circuit.library import QFT
qft = QFT(4)
visualize_circuit(qft, algorithm_name='Test QFT')
"
```

### Web Interface Testing
```bash
cd quvis/web

# Run unit tests
npm test

# Build and test production version
npm run build
npm run preview
```

## 📝 **Pull Request Process**

1. **Before Submitting**
   - Ensure your code follows the style guidelines
   - Add tests for new functionality
   - Update documentation if needed
   - Test your changes thoroughly

2. **PR Description**
   - Clearly describe what your changes do
   - Explain why the changes are needed
   - Include screenshots for UI changes
   - Reference any related issues

3. **Review Process**
   - Address reviewer feedback promptly
   - Make requested changes in new commits
   - Don't squash commits during review
   - Maintainers will squash when merging

## 🐛 **Reporting Issues**

### Bug Reports
Please include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Exact steps to trigger the bug
- **Expected vs Actual**: What should happen vs what actually happens
- **Environment**: OS, Python version, browser, etc.
- **Code Sample**: Minimal code to reproduce the issue

### Feature Requests
Please include:
- **Description**: What feature you'd like to see
- **Use Case**: Why this feature would be useful
- **Proposed Solution**: How you think it should work
- **Alternatives**: Other approaches you've considered

## 🎓 **Learning Resources**

### Quantum Computing
- [Qiskit Documentation](https://qiskit.org/documentation/)
- [Quantum Computing Fundamentals](https://qiskit.org/textbook/)

### Web Development
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Python Development
- [Poetry Documentation](https://python-poetry.org/docs/)
- [Python Best Practices](https://docs.python-guide.org/)

## 🏆 **Recognition**

Contributors are recognized in:
- **README.md**: Major contributors listed
- **Release Notes**: Contributions acknowledged
- **GitHub**: Contributor statistics and activity

## 📞 **Getting Help**

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Email**: alejandro.gonzalvo.hidalgo@cern.ch for direct contact

## 📄 **License**

By contributing to QuViS, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for helping make QuViS better! Every contribution, no matter how small, is valuable to the project and the quantum computing community. 