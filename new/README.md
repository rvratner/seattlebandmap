# Seattle Band Map - Modern Version

A modern rewrite of the Seattle Band Map using:
- **Backend**: FastAPI with Python
- **Database**: PostgreSQL with SQLAlchemy and Alembic
- **Frontend**: React with TypeScript
- **Visualization**: D3.js Force Graph
- **Containerization**: Docker

## Project Structure

```
new/
├── api/                 # FastAPI backend
├── frontend/           # React TypeScript frontend
├── docker-compose.yml  # Docker orchestration
└── README.md          # This file
```

## Quick Start

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Migrate the data** (first time only):
   ```bash
   # In a new terminal, run the migration script
   docker-compose exec api python migrate_data.py
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Database**:
   - PostgreSQL runs on localhost:5432
   - Database: seattlebandmap
   - Username: postgres
   - Password: password

## Features

### 🎸 Interactive Band Network Graph
- **D3.js Force Graph**: Visual representation of band connections
- **Interactive Nodes**: Click to highlight connections and show band details
- **Zoom & Pan**: Navigate through the network with mouse controls
- **Tooltips**: Hover over nodes to see band information
- **Performance Optimized**: Shows top 50 bands by connection count for smooth interaction

### 📊 Data Visualization
- **List View**: Traditional list showing most recent, connected, and popular bands
- **Network View**: Interactive force-directed graph showing band relationships
- **Real-time Stats**: Live statistics about total bands and connections
- **Responsive Design**: Works on desktop and mobile devices

## Data Migration

The application includes a migration script that transfers data from the original CSV files:

- **Bands**: 9,755 bands with names, locations, click counts, and member information
- **Connections**: 5,484 connections between bands
- **Data Source**: Original CSV files from the old PHP/MySQL system

### Migration Features

- **Timestamp Parsing**: Converts various date formats to proper timestamps
- **Data Cleaning**: Normalizes and validates input data
- **Error Handling**: Graceful handling of malformed data
- **Progress Tracking**: Shows migration progress and statistics

## API Endpoints

The FastAPI backend provides these endpoints:

- `GET /api/bands` - Get all bands with connection counts
- `GET /api/bands/{id}` - Get specific band details
- `GET /api/connections` - Get all connections for graph visualization
- `GET /api/graph` - Get optimized graph data (top bands + connections)
- `GET /api/bands/most/recent` - Most recently updated bands
- `GET /api/bands/most/connections` - Bands with most connections
- `GET /api/bands/most/popular` - Most popular bands (by clicks)
- `GET /api/stats` - Overall statistics

## Development

### Backend (FastAPI)
- Located in `api/`
- Uses SQLAlchemy for ORM
- Alembic for database migrations
- Auto-generates API documentation

### Frontend (React + TypeScript)
- Located in `frontend/`
- Modern React with hooks
- TypeScript for type safety
- Vite for fast development
- D3.js for data visualization

### Database
- PostgreSQL with migrated data
- Alembic migrations for schema changes
- Connection pooling with SQLAlchemy

## Tech Stack

- **Backend**: FastAPI + Python
- **Database**: PostgreSQL + SQLAlchemy
- **Frontend**: React + TypeScript
- **Visualization**: D3.js Force Graph
- **Containerization**: Docker + Docker Compose

## Next Steps

This foundation includes:
1. ✅ **Data Migration** - Complete with 9,755 bands and 5,484 connections
2. ✅ **Basic API** - All endpoints working with real data
3. ✅ **Modern UI** - React frontend with tabbed interface
4. ✅ **Interactive Graph** - D3.js force-directed network visualization

Next phase will involve:
1. Adding user submission functionality
2. Implementing search and filtering
3. Adding band detail pages
4. Enhancing graph interactions (filtering, clustering)
