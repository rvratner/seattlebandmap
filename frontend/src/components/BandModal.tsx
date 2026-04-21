import React, { useState, useEffect } from 'react'
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
	website?: string
	bandcamp_url?: string
	spotify_url?: string
	instagram_url?: string
	members?: string
}

interface BandModalProps {
	band: Band | null
	isOpen: boolean
	onClose: () => void
	onDeleteBand?: (bandId: number) => void
	onDeleteConnection?: (connectionId: number) => void
	onConnectedBandClick?: (bandId: number) => void
	onBandUpdated?: () => void
}

const BandModal: React.FC<BandModalProps> = ({
	band,
	isOpen,
	onClose,
	onDeleteBand,
	onDeleteConnection,
	onConnectedBandClick,
	onBandUpdated,
}) => {
	const [isEditing, setIsEditing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [editData, setEditData] = useState({
		name: '',
		description: '',
		website: '',
		bandcamp_url: '',
		spotify_url: '',
		instagram_url: '',
		members: '',
	})

	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

	useEffect(() => {
		if (band) {
			setEditData({
				name: band.name || '',
				description: band.description || '',
				website: band.website || '',
				bandcamp_url: band.bandcamp_url || '',
				spotify_url: band.spotify_url || '',
				instagram_url: band.instagram_url || '',
				members: band.members || '',
			})
			setIsEditing(false)
		}
	}, [band])

	if (!isOpen || !band) return null

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Unknown'
		try {
			return new Date(dateString).toLocaleDateString()
		} catch {
			return 'Unknown'
		}
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			const response = await fetch(`${apiUrl}/api/bands/${band.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editData),
			})
			if (response.ok) {
				setIsEditing(false)
				if (onBandUpdated) onBandUpdated()
			} else {
				const err = await response.json()
				alert(`Error: ${err.detail}`)
			}
		} catch {
			alert('Failed to save changes')
		} finally {
			setSaving(false)
		}
	}

	const handleCancel = () => {
		setEditData({
			name: band.name || '',
			description: band.description || '',
			website: band.website || '',
			bandcamp_url: band.bandcamp_url || '',
			spotify_url: band.spotify_url || '',
			instagram_url: band.instagram_url || '',
			members: band.members || '',
		})
		setIsEditing(false)
	}

	const hasLinks = band.website || band.bandcamp_url || band.spotify_url || band.instagram_url

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<button className="modal-close" onClick={onClose}>
					x
				</button>

				<div className="modal-header">
					{isEditing ? (
						<input
							className="edit-name-input"
							value={editData.name}
							onChange={(e) => setEditData({ ...editData, name: e.target.value })}
						/>
					) : (
						<h2>{band.name}</h2>
					)}
					<div className="modal-header-actions">
						{!isEditing && (
							<button className="edit-band-button" onClick={() => setIsEditing(true)}>
								Edit
							</button>
						)}
						{onDeleteBand && !isEditing && (
							<button className="delete-band-button" onClick={() => onDeleteBand(band.id)}>
								Delete
							</button>
						)}
					</div>
				</div>

				<div className="modal-body">
					{/* Stats row */}
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

					{/* Description */}
					<div className="band-detail-section">
						<h3>Description</h3>
						{isEditing ? (
							<textarea
								className="edit-textarea"
								value={editData.description}
								onChange={(e) => setEditData({ ...editData, description: e.target.value })}
								placeholder="Band description, location, genre..."
								rows={3}
							/>
						) : (
							<p className="detail-text">{band.description || 'No description yet'}</p>
						)}
					</div>

					{/* Members */}
					<div className="band-detail-section">
						<h3>Members</h3>
						{isEditing ? (
							<textarea
								className="edit-textarea"
								value={editData.members}
								onChange={(e) => setEditData({ ...editData, members: e.target.value })}
								placeholder="Member names, separated by commas"
								rows={2}
							/>
						) : (
							band.members ? (
								<div className="members-list">
									{band.members.split(',').map((member, i) => (
										<span key={i} className="member-tag">{member.trim()}</span>
									))}
								</div>
							) : (
								<p className="detail-text empty">No members listed</p>
							)
						)}
					</div>

					{/* Links */}
					<div className="band-detail-section">
						<h3>Links</h3>
						{isEditing ? (
							<div className="edit-links-grid">
								<div className="edit-link-row">
									<label>Website</label>
									<input
										type="url"
										value={editData.website}
										onChange={(e) => setEditData({ ...editData, website: e.target.value })}
										placeholder="https://..."
									/>
								</div>
								<div className="edit-link-row">
									<label>Bandcamp</label>
									<input
										type="url"
										value={editData.bandcamp_url}
										onChange={(e) => setEditData({ ...editData, bandcamp_url: e.target.value })}
										placeholder="https://band.bandcamp.com"
									/>
								</div>
								<div className="edit-link-row">
									<label>Spotify</label>
									<input
										type="url"
										value={editData.spotify_url}
										onChange={(e) => setEditData({ ...editData, spotify_url: e.target.value })}
										placeholder="https://open.spotify.com/artist/..."
									/>
								</div>
								<div className="edit-link-row">
									<label>Instagram</label>
									<input
										type="url"
										value={editData.instagram_url}
										onChange={(e) => setEditData({ ...editData, instagram_url: e.target.value })}
										placeholder="https://instagram.com/..."
									/>
								</div>
							</div>
						) : hasLinks ? (
							<div className="links-row">
								{band.website && (
									<a href={band.website} target="_blank" rel="noopener noreferrer" className="link-button">
										Website
									</a>
								)}
								{band.bandcamp_url && (
									<a href={band.bandcamp_url} target="_blank" rel="noopener noreferrer" className="link-button link-bandcamp">
										Bandcamp
									</a>
								)}
								{band.spotify_url && (
									<a href={band.spotify_url} target="_blank" rel="noopener noreferrer" className="link-button link-spotify">
										Spotify
									</a>
								)}
								{band.instagram_url && (
									<a href={band.instagram_url} target="_blank" rel="noopener noreferrer" className="link-button link-instagram">
										Instagram
									</a>
								)}
							</div>
						) : (
							<p className="detail-text empty">No links yet</p>
						)}
					</div>

					{/* Edit actions */}
					{isEditing && (
						<div className="edit-actions">
							<button className="btn-cancel" onClick={handleCancel}>Cancel</button>
							<button className="btn-save" onClick={handleSave} disabled={saving}>
								{saving ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					)}

					{/* Connected bands */}
					{band.connected_bands && band.connected_bands.length > 0 && (
						<div className="connected-bands">
							<h3>Connected Bands ({band.connected_bands.length})</h3>
							<div className="connected-bands-grid">
								{band.connected_bands.map((connectedBand) => (
									<div key={connectedBand.id} className="connected-band-item">
										<div
											className="connected-band-info"
											onClick={() => onConnectedBandClick?.(connectedBand.id)}
											style={{ cursor: onConnectedBandClick ? 'pointer' : 'default' }}
										>
											<span className={`band-name ${onConnectedBandClick ? 'clickable-band' : ''}`}>
												{connectedBand.name}
											</span>
											{connectedBand.connection_type && (
												<span className="connection-type">{connectedBand.connection_type.replace('_', ' ')}</span>
											)}
										</div>
										{onDeleteConnection && (
											<button
												className="delete-connection-button"
												onClick={() => onDeleteConnection(connectedBand.id)}
												title="Delete this connection"
											>
												x
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
