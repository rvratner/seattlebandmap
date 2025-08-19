import { useState, useEffect } from 'react'
import ForceGraph from './components/ForceGraph'
import BandModal from './components/BandModal'
import SubmissionForm from './components/SubmissionForm'
import SearchBox from './components/SearchBox'
import './App.css'

interface Band {
	id: number
	name: string
	description?: string
	click_count: number
	connections: number
	last_updated?: string
	connected_bands?: ConnectedBand[]
}

interface ConnectedBand {
	id: number
	name: string
	connection_type?: string
}

interface Connection {
	source: number
	target: number
	connection_type?: string
}

interface GraphData {
	nodes: Band[]
	links: Connection[]
}

interface Stats {
	total_bands: number
	total_connections: number
	average_connections_per_band: number
}

function App() {
	const [recentBands, setRecentBands] = useState<Band[]>([])
	const [connectedBands, setConnectedBands] = useState<Band[]>([])
	const [popularBands, setPopularBands] = useState<Band[]>([])
	const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
	const [isNetworkView, setIsNetworkView] = useState(false)
	const [selectedBandName, setSelectedBandName] = useState<string>('')
	const [stats, setStats] = useState<Stats | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<'list' | 'graph'>('list')

	// Modal states
	const [selectedBand, setSelectedBand] = useState<Band | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)

	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

	const fetchData = async () => {
		try {
			setLoading(true)
			setError(null)

			// Fetch all data in parallel
			const [recentRes, connectedRes, popularRes, statsRes, graphRes] = await Promise.all([
				fetch(`${apiUrl}/api/bands/most/recent`),
				fetch(`${apiUrl}/api/bands/most/connections`),
				fetch(`${apiUrl}/api/bands/most/popular`),
				fetch(`${apiUrl}/api/stats`),
				fetch(`${apiUrl}/api/graph?limit=50`) // Limit to top 50 bands for performance
			])

			// Check for errors
			if (!recentRes.ok || !connectedRes.ok || !popularRes.ok || !statsRes.ok || !graphRes.ok) {
				throw new Error('Failed to fetch data from API')
			}

			// Parse responses
			const [recentData, connectedData, popularData, statsData, graphData] = await Promise.all([
				recentRes.json(),
				connectedRes.json(),
				popularRes.json(),
				statsRes.json(),
				graphRes.json()
			])

			setRecentBands(recentData.bands)
			setConnectedBands(connectedData.bands)
			setPopularBands(popularData.bands)
			setStats(statsData)
			setGraphData(graphData)

		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch data')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [])

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Unknown'
		try {
			return new Date(dateString).toLocaleDateString()
		} catch {
			return 'Unknown'
		}
	}

	const handleNodeClick = async (bandId: number) => {
		try {
			// If we're in network view, show the modal
			if (isNetworkView) {
				const response = await fetch(`${apiUrl}/api/bands/${bandId}`)
				if (response.ok) {
					const bandData = await response.json()
					setSelectedBand(bandData)
					setIsModalOpen(true)
				}
			} else {
				// If we're in the main graph view, expand to show the band's network
				const response = await fetch(`${apiUrl}/api/bands/${bandId}/network`)
				if (response.ok) {
					const networkData = await response.json()
					setGraphData({
						nodes: networkData.nodes,
						links: networkData.links
					})
					setIsNetworkView(true)
					setSelectedBandName(networkData.main_band.name)
				}
			}
		} catch (error) {
			console.error('Failed to fetch band details:', error)
		}
	}

	const handleResetGraph = async () => {
		try {
			// Fetch the original graph data
			const response = await fetch(`${apiUrl}/api/graph?limit=50`)
			if (response.ok) {
				const data = await response.json()
				setGraphData(data)
				setIsNetworkView(false)
				setSelectedBandName('')
			}
		} catch (error) {
			console.error('Failed to reset graph:', error)
		}
	}

	const handleBandDelete = async (bandId: number) => {
		if (!confirm('Are you sure you want to delete this band? This will also delete all its connections.')) {
			return
		}

		try {
			const response = await fetch(`${apiUrl}/api/bands/${bandId}`, {
				method: 'DELETE'
			})

			if (response.ok) {
				// Refresh data
				await fetchData()
				setIsModalOpen(false)
				setSelectedBand(null)
			} else {
				const errorData = await response.json()
				alert(`Error: ${errorData.detail}`)
			}
		} catch (error) {
			alert('Failed to delete band')
		}
	}

	const handleConnectionDelete = async (connectionId: number) => {
		if (!confirm('Are you sure you want to delete this connection?')) {
			return
		}

		try {
			const response = await fetch(`${apiUrl}/api/connections/${connectionId}`, {
				method: 'DELETE'
			})

			if (response.ok) {
				// Refresh data
				await fetchData()
				if (selectedBand) {
					// Refresh band details
					const bandResponse = await fetch(`${apiUrl}/api/bands/${selectedBand.id}`)
					if (bandResponse.ok) {
						const bandData = await bandResponse.json()
						setSelectedBand(bandData)
					}
				}
			} else {
				const errorData = await response.json()
				alert(`Error: ${errorData.detail}`)
			}
		} catch (error) {
			alert('Failed to delete connection')
		}
	}

	return (
		<div className="App">
			<header className="App-header">
				<h1>🎸 Seattle Band Map</h1>
				<p>Exploring connections between Pacific Northwest bands</p>
				<button
					className="submit-button"
					onClick={() => setIsSubmissionOpen(true)}
				>
					+ Add Connection
				</button>
			</header>

			<main className="App-main">
				<div className="status-section">
					<h2>System Status</h2>
					{loading && <p>Loading data...</p>}
					{error && <p className="error">Error: {error}</p>}
					{!loading && !error && (
						<div className="stats-grid">
							<div className="stat-item">
								<h3>Total Bands</h3>
								<p>{stats?.total_bands || 0}</p>
							</div>
							<div className="stat-item">
								<h3>Total Connections</h3>
								<p>{stats?.total_connections || 0}</p>
							</div>
							<div className="stat-item">
								<h3>Avg Connections</h3>
								<p>{stats?.average_connections_per_band || 0}</p>
							</div>
						</div>
					)}
				</div>

				<div className="view-tabs">
					<button
						className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
						onClick={() => setActiveTab('list')}
					>
						List View
					</button>
					<button
						className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
						onClick={() => setActiveTab('graph')}
					>
						Network Graph
					</button>
				</div>

				{activeTab === 'list' && (
					<>
						<div className="bands-section">
							<h2>Most Recently Updated</h2>
							{recentBands.length > 0 ? (
								<ul className="bands-list">
									{recentBands.map((band) => (
										<li key={band.id} className="band-item">
											<div className="band-info">
												<strong>{band.name}</strong>
												<span className="band-date">{formatDate(band.last_updated || '')}</span>
											</div>
											<span className="band-connections">{band.connections} connections</span>
										</li>
									))}
								</ul>
							) : (
								<p>No recent bands found</p>
							)}
						</div>

						<div className="bands-section">
							<h2>Most Connections</h2>
							{connectedBands.length > 0 ? (
								<ul className="bands-list">
									{connectedBands.map((band) => (
										<li key={band.id} className="band-item">
											<div className="band-info">
												<strong>{band.name}</strong>
											</div>
											<span className="band-connections">{band.connections} connections</span>
										</li>
									))}
								</ul>
							) : (
								<p>No bands found</p>
							)}
						</div>

						<div className="bands-section">
							<h2>Most Popular</h2>
							{popularBands.length > 0 ? (
								<ul className="bands-list">
									{popularBands.map((band) => (
										<li key={band.id} className="band-item">
											<div className="band-info">
												<strong>{band.name}</strong>
												<span className="band-clicks">{band.click_count} clicks</span>
											</div>
											<span className="band-connections">{band.connections} connections</span>
										</li>
									))}
								</ul>
							) : (
								<p>No popular bands found</p>
							)}
						</div>
					</>
				)}

				{activeTab === 'graph' && (
					<div className="graph-section">
						<h2>Band Network Graph</h2>
						<div style={{ marginBottom: '20px' }}>
							<SearchBox onBandSelect={handleNodeClick} apiUrl={apiUrl} />
						</div>
						{isNetworkView ? (
							<p className="graph-description">
								Showing network for <strong>{selectedBandName}</strong> and all connected bands.
								Click on any band to see details. Click "Reset View" to return to the main graph.
							</p>
						) : (
							<p className="graph-description">
								Interactive network showing connections between bands.
								Click on any band to expand and see its full network.
								Showing top {graphData.nodes.length} bands by connection count.
							</p>
						)}
						<div className="graph-container">
							<ForceGraph
								bands={graphData.nodes}
								connections={graphData.links}
								width={800}
								height={600}
								onNodeClick={handleNodeClick}
								onReset={isNetworkView ? handleResetGraph : undefined}
							/>
						</div>
					</div>
				)}

				<div className="tech-stack">
					<h2>Tech Stack</h2>
					<div className="tech-grid">
						<div className="tech-item">
							<h3>Backend</h3>
							<p>FastAPI + Python</p>
						</div>
						<div className="tech-item">
							<h3>Database</h3>
							<p>PostgreSQL + SQLAlchemy</p>
						</div>
						<div className="tech-item">
							<h3>Frontend</h3>
							<p>React + TypeScript</p>
						</div>
						<div className="tech-item">
							<h3>Visualization</h3>
							<p>D3.js Force Graph</p>
						</div>
						<div className="tech-item">
							<h3>Containerization</h3>
							<p>Docker + Docker Compose</p>
						</div>
					</div>
				</div>
			</main>

			<footer className="App-footer">
				<p>Seattle Band Map - Modern Version | Data migrated from original project</p>
			</footer>

			{/* Modals */}
			<BandModal
				band={selectedBand}
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false)
					setSelectedBand(null)
				}}
				onDeleteBand={handleBandDelete}
				onDeleteConnection={handleConnectionDelete}
			/>

			<SubmissionForm
				isOpen={isSubmissionOpen}
				onClose={() => setIsSubmissionOpen(false)}
				onSubmit={fetchData}
			/>
		</div>
	)
}

export default App
