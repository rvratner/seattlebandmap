from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

# Association table for many-to-many band connections
band_connections = Table(
    "band_connections",
    Base.metadata,
    Column("band1_id", Integer, ForeignKey("bands.id"), primary_key=True),
    Column("band2_id", Integer, ForeignKey("bands.id"), primary_key=True),
    Column("connection_type", String(50)),  # 'member_shared', 'collaboration'
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)


class Band(Base):
    __tablename__ = "bands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    click_count = Column(Integer, default=0)
    website = Column(String, nullable=True)
    bandcamp_url = Column(String, nullable=True)
    spotify_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    members = Column(String, nullable=True)
    last_updated = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    connections = relationship(
        "Band",
        secondary=band_connections,
        primaryjoin=id == band_connections.c.band1_id,
        secondaryjoin=id == band_connections.c.band2_id,
        backref="connected_bands",
    )


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    band1_id = Column(Integer, ForeignKey("bands.id"))
    band2_id = Column(Integer, ForeignKey("bands.id"))
    connection_type = Column(String(50))  # 'member_shared', 'collaboration', 'side_project', 'touring'
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    band1 = relationship("Band", foreign_keys=[band1_id])
    band2 = relationship("Band", foreign_keys=[band2_id])
