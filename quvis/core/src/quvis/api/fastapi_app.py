"""
FastAPI Backend for Quvis Quantum Circuit Visualization

This module provides a REST API for quantum circuit generation and visualization.
"""

import logging
from typing import Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn


from .playground import PlaygroundAPI

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CircuitGenerationRequest(BaseModel):
    """Request model for circuit generation endpoint."""

    algorithm: str = Field(
        ...,
        description="Algorithm type: 'qft', 'qaoa', or 'ghz'",
        examples=["qft"]
    )
    num_qubits: int = Field(
        ...,
        ge=2,
        le=1000,
        description="Number of logical qubits",
        examples=[5]
    )
    physical_qubits: Optional[int] = Field(
        None,
        ge=2,
        le=1000,
        description="Number of physical qubits for device topology (defaults to num_qubits)",
        examples=[9]
    )
    topology: str = Field(
        ...,
        description="Device topology: 'line', 'ring', 'grid', 'heavy_hex', 'heavy_square', 'hexagonal', or 'full'",
        examples=["grid"]
    )
    optimization_level: int = Field(
        1,
        ge=0,
        le=3,
        description="Qiskit transpiler optimization level",
        examples=[1]
    )
    reps: Optional[int] = Field(
        None,
        ge=1,
        description="Number of repetitions for QAOA algorithm",
        examples=[2]
    )

    class Config:
        json_schema_extra = {
            "example": {
                "algorithm": "qft",
                "num_qubits": 5,
                "physical_qubits": 9,
                "topology": "grid",
                "optimization_level": 1
            }
        }


class CircuitGenerationResponse(BaseModel):
    """Response model for circuit generation endpoint."""

    circuits: list[dict[str, Any]]
    total_circuits: int
    generation_successful: bool = True


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    generation_successful: bool = False


class HealthCheckResponse(BaseModel):
    """Health check response model."""

    status: str
    version: str
    supported_algorithms: list[str]


# Application lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("🚀 Starting Quvis FastAPI Backend")
    logger.info("✓ PlaygroundAPI initialized")
    yield
    logger.info("👋 Shutting down Quvis FastAPI Backend")


# Create FastAPI application
app = FastAPI(
    title="Quvis API",
    description="Quantum Circuit Visualization API for generating and transpiling quantum circuits",
    version="v0.27.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:4173",  # Vite preview server
        "https://*.github.io",    # GitHub Pages (wildcard)
        "https://*.amazonaws.com", # AWS deployments
        "https://*.cloudfront.net", # CloudFront
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PlaygroundAPI
playground_api = PlaygroundAPI()


# Routes
@app.get("/", response_model=dict)
async def root():
    """Root endpoint."""
    return {
        "service": "Quvis API",
        "version": "v0.27.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint."""
    return HealthCheckResponse(
        status="healthy",
        version="v0.27.0",
        supported_algorithms=playground_api.get_supported_algorithms()
    )


@app.post(
    "/api/generate-circuit",
    response_model=CircuitGenerationResponse,
    responses={
        200: {"description": "Circuit generated successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request parameters"},
        500: {"model": ErrorResponse, "description": "Circuit generation failed"},
    }
)
async def generate_circuit(request: CircuitGenerationRequest):
    """
    Generate quantum circuit visualization data.

    This endpoint creates both logical and compiled versions of a quantum circuit
    based on the specified algorithm, topology, and optimization parameters.
    """
    try:
        logger.info(
            f"📥 Received circuit generation request: "
            f"algorithm={request.algorithm}, qubits={request.num_qubits}, "
            f"topology={request.topology}"
        )

        # Set physical qubits to num_qubits if not provided
        physical_qubits = request.physical_qubits or request.num_qubits

        # Prepare kwargs for algorithm-specific parameters
        kwargs = {"optimization_level": request.optimization_level}
        if request.reps is not None:
            kwargs["reps"] = request.reps

        # Generate circuit data
        result = playground_api.generate_visualization_data(
            algorithm=request.algorithm,
            num_qubits=request.num_qubits,
            physical_qubits=physical_qubits,
            topology=request.topology,
            **kwargs
        )

        logger.info("✅ Circuit generated successfully")

        return CircuitGenerationResponse(
            circuits=result["circuits"],
            total_circuits=result["total_circuits"],
            generation_successful=True
        )

    except ValueError as e:
        logger.error(f"❌ Validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Circuit generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Circuit generation failed: {str(e)}"
        )


if __name__ == "__main__":

    uvicorn.run(
        "quvis.api.fastapi_app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
