import React, { useState, useEffect, useRef } from 'react'

interface Band {
	id: number
	name: string
	connections: number
}

interface SearchBoxProps {
	onBandSelect: (bandId: number) => void
	apiUrl: string
}

const SearchBox: React.FC<SearchBoxProps> = ({ onBandSelect, apiUrl }) => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Band[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [showResults, setShowResults] = useState(false)
	const searchRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
				setShowResults(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	useEffect(() => {
		const searchBands = async () => {
			if (query.length < 2) {
				setResults([])
				setShowResults(false)
				return
			}

			setIsLoading(true)
			try {
				const response = await fetch(`${apiUrl}/api/bands/search?q=${encodeURIComponent(query)}`)
				if (response.ok) {
					const data = await response.json()
					setResults(data.bands)
					setShowResults(true)
				}
			} catch (error) {
				console.error('Search failed:', error)
			} finally {
				setIsLoading(false)
			}
		}

		const timeoutId = setTimeout(searchBands, 300) // Debounce search
		return () => clearTimeout(timeoutId)
	}, [query, apiUrl])

	const handleBandSelect = (band: Band) => {
		onBandSelect(band.id)
		setQuery('')
		setShowResults(false)
	}

	return (
		<div className="search-box" ref={searchRef} style={{ position: 'relative', width: '300px' }}>
			<input
				type="text"
				placeholder="Search for bands..."
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onFocus={() => setShowResults(true)}
				style={{
					width: '100%',
					padding: '8px 12px',
					border: '1px solid #ccc',
					borderRadius: '4px',
					fontSize: '14px'
				}}
			/>

			{showResults && (query.length >= 2) && (
				<div style={{
					position: 'absolute',
					top: '100%',
					left: 0,
					right: 0,
					backgroundColor: 'white',
					border: '1px solid #ccc',
					borderRadius: '4px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					zIndex: 1000,
					maxHeight: '300px',
					overflowY: 'auto'
				}}>
					{isLoading ? (
						<div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
							Searching...
						</div>
					) : results.length > 0 ? (
						results.map((band) => (
							<div
								key={band.id}
								onClick={() => handleBandSelect(band)}
								style={{
									padding: '8px 12px',
									cursor: 'pointer',
									borderBottom: '1px solid #eee',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#f5f5f5'
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'white'
								}}
							>
								<span style={{ fontWeight: 'bold' }}>{band.name}</span>
								<span style={{ color: '#666', fontSize: '12px' }}>
									{band.connections} connections
								</span>
							</div>
						))
					) : (
						<div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
							No bands found
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default SearchBox
