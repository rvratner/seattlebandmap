import React from 'react'
import './BandModal.css'

interface ConnectedBand {
	id: number
	name: string
	connection_type?: string
}

interface Band {
	id: number
	name: string
	description?: string
	click_count: number
	connections: number
	last_updated?: string
	connected_bands?: ConnectedBand[]
}

interface BandModalProps {
	band: Band | null
	isOpen: boolean
	onClose: () => void
	onDeleteBand?: (bandId: number) => void
	onDeleteConnection?: (connectionId: number) => void
}

const BandModal: React.FC<BandModalProps> = ({
	band,
	isOpen,
	onClose,
	onDeleteBand,
	onDeleteConnection
}) => {
	if (!isOpen || !band) return null

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Unknown'
		try {
			return new Date(dateString).toLocaleDateString()
		} catch {
			return 'Unknown'
		}
	}

	const handleDeleteBand = () => {
		if (onDeleteBand) {
			onDeleteBand(band.id)
		}
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<button className="modal-close" onClick={onClose}>
					×
				</button>

				<div className="modal-header">
					<h2>{band.name}</h2>
					{onDeleteBand && (
						<button
							className="delete-band-button"
							onClick={handleDeleteBand}
							title="Delete this band and all its connections"
						>
							🗑️ Delete Band
						</button>
					)}
				</div>

				<div className="modal-body">
					<div className="band-stats">
						<div className="stat-item">
							<span className="stat-label">Connections</span>
							<span className="stat-value">{band.connections}</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Click Count</span>
							<span className="stat-value">{band.click_count}</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Last Updated</span>
							<span className="stat-value">{formatDate(band.last_updated || '')}</span>
						</div>
					</div>

					{band.description && (
						<div className="band-description">
							<h3>Description</h3>
							<p>{band.description}</p>
						</div>
					)}

					{band.connected_bands && band.connected_bands.length > 0 && (
						<div className="connected-bands">
							<h3>Connected Bands ({band.connected_bands.length})</h3>
							<div className="connected-bands-grid">
								{band.connected_bands.map((connectedBand) => (
									<div key={connectedBand.id} className="connected-band-item">
										<div className="connected-band-info">
											<span className="band-name">{connectedBand.name}</span>
											{connectedBand.connection_type && (
												<span className="connection-type">{connectedBand.connection_type}</span>
											)}
										</div>
										{onDeleteConnection && (
											<button
												className="delete-connection-button"
												onClick={() => onDeleteConnection(connectedBand.id)}
												title="Delete this connection"
											>
												×
											</button>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default BandModal
