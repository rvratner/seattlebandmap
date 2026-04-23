import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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
	website?: string
	bandcamp_url?: string
	spotify_url?: string
	instagram_url?: string
	members?: string
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
	const [searchParams, setSearchParams] = useSearchParams()
	const [recentBands, setRecentBands] = useState<Band[]>([])
	const [connectedBands, setConnectedBands] = useState<Band[]>([])
	const [popularBands, setPopularBands] = useState<Band[]>([])
	const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
	const [isNetworkView, setIsNetworkView] = useState(false)
	const [selectedBandName, setSelectedBandName] = useState<string>('')
	const [stats, setStats] = useState<Stats | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<'list' | 'graph'>(
		(searchParams.get('tab') as 'list' | 'graph') || 'graph'
	)

	// Modal states
	const [selectedBand, setSelectedBand] = useState<Band | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)

	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

	const fetchData = async () => {
		try {
			setLoading(true)
			setError(null)

			const [recentRes, connectedRes, popularRes, statsRes, graphRes] = await Promise.all([
				fetch(`${apiUrl}/api/bands/most/recent`),
				fetch(`${apiUrl}/api/bands/most/connections`),
				fetch(`${apiUrl}/api/bands/most/popular`),
				fetch(`${apiUrl}/api/stats`),
				fetch(`${apiUrl}/api/graph?limit=50`)
			])

			if (!recentRes.ok || !connectedRes.ok || !popularRes.ok || !statsRes.ok || !graphRes.ok) {
				throw new Error('Failed to fetch data from API')
			}

			const [recentData, connectedData, popularData, statsData, graphDataRes] = await Promise.all([
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
			setGraphData(graphDataRes)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch data')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [])

	// Handle ?band=123 URL param on load
	useEffect(() => {
		const bandId = searchParams.get('band')
		if (bandId && !loading) {
			const id = parseInt(bandId, 10)
			if (!isNaN(id)) {
				setActiveTab('graph')
				loadBandNetwork(id)
			}
		}
	}, [loading])

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Unknown'
		try {
			return new Date(dateString).toLocaleDateString()
		} catch {
			return 'Unknown'
		}
	}

	const loadBandNetwork = async (bandId: number) => {
		try {
			const response = await fetch(`${apiUrl}/api/bands/${bandId}/network`)
			if (response.ok) {
				const networkData = await response.json()
				setGraphData({
					nodes: networkData.nodes,
					links: networkData.links
				})
				setIsNetworkView(true)
				setSelectedBandName(networkData.main_band.name)
				setSearchParams({ tab: 'graph', band: String(bandId) })
			}
		} catch (error) {
			console.error('Failed to fetch band network:', error)
		}
	}

	const openBandModal = async (bandId: number) => {
		try {
			const response = await fetch(`${apiUrl}/api/bands/${bandId}`)
			if (response.ok) {
				const bandData = await response.json()
				setSelectedBand(bandData)
				setIsModalOpen(true)
			}
		} catch (error) {
			console.error('Failed to fetch band details:', error)
		}
	}

	const handleNodeClick = async (bandId: number) => {
		if (isNetworkView) {
			openBandModal(bandId)
		} else {
			loadBandNetwork(bandId)
		}
	}

	const handleBandSelect = useCallback((bandId: number) => {
		setActiveTab('graph')
		loadBandNetwork(bandId)
	}, [])

	const handleResetGraph = async () => {
		try {
			const response = await fetch(`${apiUrl}/api/graph?limit=50`)
			if (response.ok) {
				const data = await response.json()
				setGraphData(data)
				setIsNetworkView(false)
				setSelectedBandName('')
				setSearchParams({ tab: 'graph' })
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
				await fetchData()
				setIsModalOpen(false)
				setSelectedBand(null)
			} else {
				const errorData = await response.json()
				alert(`Error: ${errorData.detail}`)
			}
		} catch {
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
				await fetchData()
				if (selectedBand) {
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
		} catch {
			alert('Failed to delete connection')
		}
	}

	const handleTabChange = (tab: 'list' | 'graph') => {
		setActiveTab(tab)
		setSearchParams(tab === 'graph' ? { tab: 'graph' } : {})
	}

	// Navigate to a connected band from the modal
	const handleConnectedBandClick = (bandId: number) => {
		setIsModalOpen(false)
		setSelectedBand(null)
		setActiveTab('graph')
		loadBandNetwork(bandId)
	}

	return (
		<div className="App">
			<header className="App-header">
				<h1>Seattle Band Map</h1>
				<p>Exploring connections between Pacific Northwest bands</p>
				<div className="header-actions">
					<SearchBox onBandSelect={handleBandSelect} apiUrl={apiUrl} />
					<div className="header-right">
						<div className="view-tabs">
							<button
								className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
								onClick={() => handleTabChange('graph')}
							>
								Network Graph
							</button>
							<button
								className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
								onClick={() => handleTabChange('list')}
							>
								List View
							</button>
						</div>
						<button
							className="submit-button"
							onClick={() => setIsSubmissionOpen(true)}
						>
							+ Add Connection
						</button>
					</div>
				</div>
			</header>

			<main className="App-main">

				{activeTab === 'graph' && (
					<div className="graph-section">
						<h2>Band Network Graph</h2>
						<div className="graph-container">
							<ForceGraph
								bands={graphData.nodes}
								connections={graphData.links}
								onNodeClick={handleNodeClick}
								onReset={isNetworkView ? handleResetGraph : undefined}
							/>
						</div>
						{isNetworkView ? (
							<p className="graph-description">
								Showing network for <strong>{selectedBandName}</strong> and all connected bands.
								Click on any band to see details. Click "Reset View" to return to the main graph.
							</p>
						) : (
							<p className="graph-description">
								Interactive network showing connections between bands.
								Click on any band to expand and see its full network. Drag nodes to rearrange.
								Showing top {graphData.nodes.length} bands by connection count.
							</p>
						)}
					</div>
				)}

				{activeTab === 'list' && (
					<>
						<div className="bands-section">
							<h2>Most Recently Updated</h2>
							{recentBands.length > 0 ? (
								<ul className="bands-list">
									{recentBands.map((band) => (
										<li key={band.id} className="band-item clickable" onClick={() => handleBandSelect(band.id)}>
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
										<li key={band.id} className="band-item clickable" onClick={() => handleBandSelect(band.id)}>
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
										<li key={band.id} className="band-item clickable" onClick={() => handleBandSelect(band.id)}>
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

				<div className="status-section">
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
			</main>

			<footer className="App-footer">
				<div className="footer-links">
					<a href="/blog" className="footer-link">Blog</a>
					<span className="footer-divider">/</span>
					<a href="https://www.rachelratner.com" className="footer-link" target="_blank" rel="noopener noreferrer">About</a>
				</div>
				<p>&copy; {new Date().getFullYear()} Seattle Band Map &mdash; Built by <a href="https://www.rachelratner.com" target="_blank" rel="noopener noreferrer" className="footer-credit">Rachel Ratner</a></p>
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
				onConnectedBandClick={handleConnectedBandClick}
				onBandUpdated={async () => {
					if (selectedBand) {
						const res = await fetch(`${apiUrl}/api/bands/${selectedBand.id}`)
						if (res.ok) setSelectedBand(await res.json())
					}
					fetchData()
				}}
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
