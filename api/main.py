from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Band, Connection


# Pydantic models for request validation
class BandSubmission(BaseModel):
    band1Name: str
    band2Name: str
    connectionType: str
    description: str = ""
    band1Location: str = ""
    band2Location: str = ""


class BandCreate(BaseModel):
    name: str
    description: str | None = None
    location: str | None = None


class BandUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None


class ConnectionCreate(BaseModel):
    band1_id: int
    band2_id: int
    connection_type: str = "member_shared"
    description: str | None = None


class ConnectionUpdate(BaseModel):
    connection_type: str | None = None
    description: str | None = None


# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Seattle Band Map API",
    description="Modern API for the Seattle Band Map project",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to Seattle Band Map API"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "seattle-band-map-api"}


# Band CRUD endpoints
@app.post("/api/bands")
async def create_band(band_data: BandCreate, db: Session = Depends(get_db)) -> dict:
    """Create a new band"""
    try:
        # Check if band already exists
        existing_band = db.query(Band).filter(Band.name.ilike(band_data.name)).first()
        if existing_band:
            raise HTTPException(status_code=400, detail="Band already exists")

        description = None
        if band_data.location:
            description = f"Location: {band_data.location}"
        elif band_data.description:
            description = band_data.description

        band = Band(
            name=band_data.name,
            description=description,
            click_count=0,
            last_updated=datetime.now(),
            created_at=datetime.now(),
        )

        db.add(band)
        db.commit()
        db.refresh(band)

        return {
            "message": "Band created successfully",
            "band": {
                "id": band.id,
                "name": band.name,
                "description": band.description,
                "click_count": band.click_count,
                "last_updated": band.last_updated.isoformat()
                if band.last_updated
                else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.put("/api/bands/{band_id}")
async def update_band(
    band_id: int, band_data: BandUpdate, db: Session = Depends(get_db)
) -> dict:
    """Update an existing band"""
    try:
        band = db.query(Band).filter(Band.id == band_id).first()
        if not band:
            raise HTTPException(status_code=404, detail="Band not found")

        if band_data.name is not None:
            # Check if new name conflicts with existing band
            existing_band = (
                db.query(Band)
                .filter(Band.name.ilike(band_data.name) & (Band.id != band_id))
                .first()
            )
            if existing_band:
                raise HTTPException(status_code=400, detail="Band name already exists")
            band.name = band_data.name  # type: ignore

        if band_data.description is not None:
            band.description = band_data.description  # type: ignore

        if band_data.location is not None:
            band.description = f"Location: {band_data.location}"  # type: ignore

        band.last_updated = datetime.now()  # type: ignore
        db.commit()

        return {
            "message": "Band updated successfully",
            "band": {
                "id": band.id,
                "name": band.name,
                "description": band.description,
                "click_count": band.click_count,
                "last_updated": band.last_updated.isoformat()
                if band.last_updated
                else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.delete("/api/bands/{band_id}")
async def delete_band(band_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    """Delete a band and all its connections"""
    try:
        band = db.query(Band).filter(Band.id == band_id).first()
        if not band:
            raise HTTPException(status_code=404, detail="Band not found")

        # Delete all connections involving this band
        db.query(Connection).filter(
            (Connection.band1_id == band_id) | (Connection.band2_id == band_id)
        ).delete()

        # Delete the band
        db.delete(band)
        db.commit()

        return {"message": "Band and all connections deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


# Connection CRUD endpoints
@app.post("/api/connections")
async def create_connection(
    connection_data: ConnectionCreate, db: Session = Depends(get_db)
) -> dict:
    """Create a new connection between bands"""
    try:
        # Verify both bands exist
        band1 = db.query(Band).filter(Band.id == connection_data.band1_id).first()
        band2 = db.query(Band).filter(Band.id == connection_data.band2_id).first()

        if not band1 or not band2:
            raise HTTPException(status_code=404, detail="One or both bands not found")

        if band1.id == band2.id:
            raise HTTPException(
                status_code=400, detail="Cannot connect a band to itself"
            )

        # Check if connection already exists
        existing_connection = (
            db.query(Connection)
            .filter(
                ((Connection.band1_id == band1.id) & (Connection.band2_id == band2.id))
                | (
                    (Connection.band1_id == band2.id)
                    & (Connection.band2_id == band1.id)
                )
            )
            .first()
        )

        if existing_connection:
            raise HTTPException(status_code=400, detail="Connection already exists")

        connection = Connection(
            band1_id=connection_data.band1_id,
            band2_id=connection_data.band2_id,
            connection_type=connection_data.connection_type,
            description=connection_data.description,
            created_at=datetime.now(),
        )

        db.add(connection)
        db.commit()
        db.refresh(connection)

        return {
            "message": "Connection created successfully",
            "connection": {
                "id": connection.id,
                "band1_id": connection.band1_id,
                "band2_id": connection.band2_id,
                "connection_type": connection.connection_type,
                "description": connection.description,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.put("/api/connections/{connection_id}")
async def update_connection(
    connection_id: int, connection_data: ConnectionUpdate, db: Session = Depends(get_db)
) -> dict:
    """Update an existing connection"""
    try:
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")

        if connection_data.connection_type is not None:
            connection.connection_type = connection_data.connection_type  # type: ignore

        if connection_data.description is not None:
            connection.description = connection_data.description  # type: ignore

        db.commit()

        return {
            "message": "Connection updated successfully",
            "connection": {
                "id": connection.id,
                "band1_id": connection.band1_id,
                "band2_id": connection.band2_id,
                "connection_type": connection.connection_type,
                "description": connection.description,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.delete("/api/connections/{connection_id}")
async def delete_connection(
    connection_id: int, db: Session = Depends(get_db)
) -> dict[str, str]:
    """Delete a connection"""
    try:
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")

        db.delete(connection)
        db.commit()

        return {"message": "Connection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.post("/api/submit")
async def submit_connection(
    submission: BandSubmission, db: Session = Depends(get_db)
) -> dict:
    """Submit a new band connection - automatically adds to database"""
    try:
        # Find or create band 1
        band1 = db.query(Band).filter(Band.name.ilike(submission.band1Name)).first()
        if not band1:
            band1 = Band(
                name=submission.band1Name,
                description=f"Location: {submission.band1Location}"
                if submission.band1Location
                else None,
                click_count=0,
                last_updated=datetime.now(),
                created_at=datetime.now(),
            )
            db.add(band1)
            db.flush()  # Get the ID

        # Find or create band 2
        band2 = db.query(Band).filter(Band.name.ilike(submission.band2Name)).first()
        if not band2:
            band2 = Band(
                name=submission.band2Name,
                description=f"Location: {submission.band2Location}"
                if submission.band2Location
                else None,
                click_count=0,
                last_updated=datetime.now(),
                created_at=datetime.now(),
            )
            db.add(band2)
            db.flush()  # Get the ID

        # Check if connection already exists
        existing_connection = (
            db.query(Connection)
            .filter(
                ((Connection.band1_id == band1.id) & (Connection.band2_id == band2.id))
                | (
                    (Connection.band1_id == band2.id)
                    & (Connection.band2_id == band1.id)
                )
            )
            .first()
        )

        if existing_connection:
            raise HTTPException(status_code=400, detail="Connection already exists")

        # Create the connection
        connection = Connection(
            band1_id=band1.id,
            band2_id=band2.id,
            connection_type=submission.connectionType,
            description=submission.description if submission.description else None,
            created_at=datetime.now(),
        )

        db.add(connection)
        db.commit()

        return {
            "message": "Connection submitted successfully",
            "band1_id": band1.id,
            "band2_id": band2.id,
            "connection_id": connection.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands")
async def get_bands(db: Session = Depends(get_db)) -> dict:
    """Get all bands with their connection counts"""
    try:
        bands = db.query(Band).all()
        result = []

        for band in bands:
            # Count connections for this band
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == band.id) | (Connection.band2_id == band.id)
                )
                .count()
            )

            result.append(
                {
                    "id": band.id,
                    "name": band.name,
                    "description": band.description,
                    "click_count": band.click_count,
                    "connections": connection_count,
                    "last_updated": band.last_updated.isoformat()
                    if band.last_updated
                    else None,
                }
            )

        return {"bands": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/connections")
async def get_connections(db: Session = Depends(get_db)) -> dict:
    """Get all connections formatted for D3 force graph"""
    try:
        connections = db.query(Connection).all()
        result = []

        for conn in connections:
            result.append(
                {
                    "source": conn.band1_id,
                    "target": conn.band2_id,
                    "connection_type": conn.connection_type,
                    "description": conn.description,
                }
            )

        return {"connections": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/graph")
async def get_graph_data(db: Session = Depends(get_db), limit: int = 50) -> dict:
    """Get graph data with top bands by connections and their connections"""
    try:
        # Get all connections first
        all_connections = db.query(Connection).all()
        
        # Count connections per band
        band_connection_counts = {}
        for conn in all_connections:
            band_connection_counts[conn.band1_id] = band_connection_counts.get(conn.band1_id, 0) + 1
            band_connection_counts[conn.band2_id] = band_connection_counts.get(conn.band2_id, 0) + 1
        
        # Get top bands by connection count
        sorted_bands = sorted(band_connection_counts.items(), key=lambda x: x[1], reverse=True)
        top_band_ids = [band_id for band_id, _ in sorted_bands[:limit]]
        
        # Get the actual band data for top bands
        top_bands = db.query(Band).filter(Band.id.in_(top_band_ids)).all()
        
        # Create nodes list
        nodes = []
        for band in top_bands:
            nodes.append({
                "id": band.id,
                "name": band.name,
                "connections": band_connection_counts.get(band.id, 0),
            })
        
        # Get connections between top bands only (for performance)
        connections = (
            db.query(Connection)
            .filter(
                (Connection.band1_id.in_(top_band_ids))
                & (Connection.band2_id.in_(top_band_ids))
            )
            .all()
        )
        
        connections_data = []
        for conn in connections:
            connections_data.append(
                {
                    "source": conn.band1_id,
                    "target": conn.band2_id,
                    "connection_type": conn.connection_type,
                }
            )

        return {
            "nodes": nodes,
            "links": connections_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands/search")
async def search_bands(db: Session = Depends(get_db), q: str = "") -> dict:
    """Search for bands by name"""
    try:
        if not q or len(q) < 2:
            return {"bands": []}
            
        bands = (
            db.query(Band)
            .filter(Band.name.ilike(f"%{q}%"))
            .limit(10)
            .all()
        )
        
        result = []
        for band in bands:
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == band.id) | (Connection.band2_id == band.id)
                )
                .count()
            )
            
            result.append({
                "id": band.id,
                "name": band.name,
                "connections": connection_count,
            })
            
        return {"bands": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands/{band_id}")
async def get_band(band_id: int, db: Session = Depends(get_db)) -> dict:
    """Get a specific band by ID"""
    try:
        band = db.query(Band).filter(Band.id == band_id).first()
        if not band:
            raise HTTPException(status_code=404, detail="Band not found")

        # Get connections for this band
        connections = (
            db.query(Connection)
            .filter((Connection.band1_id == band.id) | (Connection.band2_id == band.id))
            .all()
        )

        # Get connected bands
        connected_bands = []
        for conn in connections:
            if conn.band1_id == band.id:
                connected_band = db.query(Band).filter(Band.id == conn.band2_id).first()
            else:
                connected_band = db.query(Band).filter(Band.id == conn.band1_id).first()

            if connected_band:
                connected_bands.append(
                    {
                        "id": connected_band.id,
                        "name": connected_band.name,
                        "connection_type": conn.connection_type,
                    }
                )

        return {
            "id": band.id,
            "name": band.name,
            "description": band.description,
            "click_count": band.click_count,
            "connections": len(connected_bands),
            "connected_bands": connected_bands,
            "last_updated": band.last_updated.isoformat()
            if band.last_updated
            else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands/{band_id}/network")
async def get_band_network(band_id: int, db: Session = Depends(get_db)) -> dict:
    """Get a band's full network - the band and all its connected bands"""
    try:
        # Get the main band
        band = db.query(Band).filter(Band.id == band_id).first()
        if not band:
            raise HTTPException(status_code=404, detail="Band not found")

        # Get all connections involving this band
        connections = (
            db.query(Connection)
            .filter((Connection.band1_id == band.id) | (Connection.band2_id == band.id))
            .all()
        )

        # Get all unique band IDs in the network
        network_band_ids = {band_id}
        for conn in connections:
            network_band_ids.add(conn.band1_id)
            network_band_ids.add(conn.band2_id)

        # Get all bands in the network
        network_bands = db.query(Band).filter(Band.id.in_(network_band_ids)).all()
        
        # Create nodes list with connection counts
        nodes = []
        for network_band in network_bands:
            # Count total connections for this band
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == network_band.id) | (Connection.band2_id == network_band.id)
                )
                .count()
            )
            
            # Check if this is the main band (for highlighting)
            is_main = network_band.id == band_id
            
            nodes.append({
                "id": network_band.id,
                "name": network_band.name,
                "connections": connection_count,
                "is_main": is_main,
            })

        # Create links list
        links = []
        for conn in connections:
            links.append({
                "source": conn.band1_id,
                "target": conn.band2_id,
                "connection_type": conn.connection_type,
            })

        return {
            "nodes": nodes,
            "links": links,
            "main_band": {
                "id": band.id,
                "name": band.name,
                "connections": len(connections),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands/most/recent")
async def get_most_recent_bands(db: Session = Depends(get_db), limit: int = 6) -> dict:
    """Get most recently updated bands"""
    try:
        bands = db.query(Band).order_by(Band.last_updated.desc()).limit(limit).all()
        result = []

        for band in bands:
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == band.id) | (Connection.band2_id == band.id)
                )
                .count()
            )

            result.append(
                {
                    "id": band.id,
                    "name": band.name,
                    "connections": connection_count,
                    "last_updated": band.last_updated.isoformat()
                    if band.last_updated
                    else None,
                }
            )

        return {"bands": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/bands/most/connections")
async def get_most_connected_bands(
    db: Session = Depends(get_db), limit: int = 6
) -> dict:
    """Get bands with most connections"""
    try:
        # This is a more complex query - for now, we'll get all bands and sort by connection count
        bands = db.query(Band).all()
        bands_with_connections = []

        for band in bands:
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == band.id) | (Connection.band2_id == band.id)
                )
                .count()
            )

            bands_with_connections.append(
                {
                    "id": band.id,
                    "name": band.name,
                    "connections": connection_count,
                }
            )

        # Sort by connection count and return top results
        bands_with_connections.sort(key=lambda x: x["connections"], reverse=True)  # type: ignore
        return {"bands": bands_with_connections[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e





@app.get("/api/bands/most/popular")
async def get_most_popular_bands(db: Session = Depends(get_db), limit: int = 6) -> dict:
    """Get most popular bands (by click count)"""
    try:
        bands = db.query(Band).order_by(Band.click_count.desc()).limit(limit).all()
        result = []

        for band in bands:
            connection_count = (
                db.query(Connection)
                .filter(
                    (Connection.band1_id == band.id) | (Connection.band2_id == band.id)
                )
                .count()
            )

            result.append(
                {
                    "id": band.id,
                    "name": band.name,
                    "click_count": band.click_count,
                    "connections": connection_count,
                }
            )

        return {"bands": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)) -> dict:
    """Get overall statistics"""
    try:
        total_bands = db.query(Band).count()
        total_connections = db.query(Connection).count()

        return {
            "total_bands": total_bands,
            "total_connections": total_connections,
            "average_connections_per_band": round(total_connections / total_bands, 2)
            if total_bands > 0
            else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
