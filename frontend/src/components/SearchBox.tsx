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
				placeholder="SEARCH BANDS..."
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onFocus={() => setShowResults(true)}
				style={{
					width: '100%',
					padding: '8px 12px',
					background: '#211e1a',
					border: '1px solid #443f39',
					borderRadius: '2px',
					fontSize: '12px',
					fontFamily: "'Space Mono', monospace",
					fontWeight: 700,
					color: '#e0d6c8',
					letterSpacing: '0.06em',
					textTransform: 'uppercase',
					transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
					outline: 'none',
				}}
				onFocusCapture={(e) => {
					e.currentTarget.style.borderColor = '#c9a84c'
					e.currentTarget.style.boxShadow = '0 0 12px rgba(201,168,76,0.1)'
				}}
				onBlurCapture={(e) => {
					e.currentTarget.style.borderColor = '#443f39'
					e.currentTarget.style.boxShadow = 'none'
				}}
			/>

			{showResults && (query.length >= 2) && (
				<div style={{
					position: 'absolute',
					top: '100%',
					left: 0,
					right: 0,
					backgroundColor: '#2a2622',
					border: '1px solid #443f39',
					borderTop: 'none',
					borderRadius: '0 0 2px 2px',
					boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
					zIndex: 1000,
					maxHeight: '300px',
					overflowY: 'auto',
				}}>
					{isLoading ? (
						<div style={{
							padding: '12px',
							textAlign: 'center',
							color: '#918578',
							fontSize: '11px',
							fontFamily: "'Space Mono', monospace",
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
						}}>
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
									borderBottom: '1px solid #33302b',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									transition: 'all 0.1s ease',
									fontSize: '12px',
									fontFamily: "'Space Mono', monospace",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#33302b'
									const nameSpan = e.currentTarget.querySelector('.result-name') as HTMLElement
									if (nameSpan) nameSpan.style.color = '#c9a84c'
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent'
									const nameSpan = e.currentTarget.querySelector('.result-name') as HTMLElement
									if (nameSpan) nameSpan.style.color = '#e0d6c8'
								}}
							>
								<span className="result-name" style={{ fontWeight: 700, color: '#e0d6c8', transition: 'color 0.1s' }}>{band.name}</span>
								<span style={{
									color: '#665e55',
									fontSize: '10px',
									letterSpacing: '0.04em',
								}}>
									{band.connections} conn
								</span>
							</div>
						))
					) : (
						<div style={{
							padding: '12px',
							textAlign: 'center',
							color: '#665e55',
							fontSize: '11px',
							fontFamily: "'Space Mono', monospace",
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
						}}>
							No bands found
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default SearchBox
