import React, { useState } from 'react'
import BandSearchDropdown from './BandSearchDropdown'
import './SubmissionForm.css'

interface SubmissionFormProps {
	isOpen: boolean
	onClose: () => void
	onSubmit: () => void
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ isOpen, onClose, onSubmit }) => {
	const [formData, setFormData] = useState({
		band1Name: '',
		band2Name: '',
		connectionType: 'member_shared',
		description: '',
		band1Location: '',
		band2Location: ''
	})

	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [message, setMessage] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setMessage('')

		try {
			const response = await fetch(`${apiUrl}/api/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			})

			if (response.ok) {
				setMessage('Success! Your submission has been added to the map.')
				setFormData({
					band1Name: '',
					band2Name: '',
					connectionType: 'member_shared',
					description: '',
					band1Location: '',
					band2Location: ''
				})
				onSubmit() // Refresh the data
				setTimeout(() => {
					onClose()
				}, 2000)
			} else {
				const errorData = await response.json()
				setMessage(`Error: ${errorData.detail || 'Failed to submit'}`)
			}
		} catch (error) {
			setMessage('Error: Failed to connect to server')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		})
	}

	if (!isOpen) return null

	return (
		<div className="submission-overlay" onClick={onClose}>
			<div className="submission-content" onClick={(e) => e.stopPropagation()}>
				<button className="submission-close" onClick={onClose}>
					×
				</button>

				<div className="submission-header">
					<h2>Add Band Connection</h2>
					<p>Submit a new connection between bands</p>
				</div>

				<form onSubmit={handleSubmit} className="submission-form">
					<div className="form-section">
						<h3>Band 1</h3>
						<div className="form-row">
							<BandSearchDropdown
								value={formData.band1Name}
								onChange={(value) => setFormData({ ...formData, band1Name: value })}
								placeholder="Search for existing band or type new band name"
								apiUrl={apiUrl}
								required
							/>
							<input
								type="text"
								name="band1Location"
								value={formData.band1Location}
								onChange={handleChange}
								placeholder="Location (e.g., Seattle, WA)"
							/>
						</div>
					</div>

					<div className="form-section">
						<h3>Band 2</h3>
						<div className="form-row">
							<BandSearchDropdown
								value={formData.band2Name}
								onChange={(value) => setFormData({ ...formData, band2Name: value })}
								placeholder="Search for existing band or type new band name"
								apiUrl={apiUrl}
								required
							/>
							<input
								type="text"
								name="band2Location"
								value={formData.band2Location}
								onChange={handleChange}
								placeholder="Location (e.g., Seattle, WA)"
							/>
						</div>
					</div>

					<div className="form-section">
						<h3>Connection Details</h3>
						<select
							name="connectionType"
							value={formData.connectionType}
							onChange={handleChange}
							required
						>
							<option value="collaboration">Collaboration</option>
							<option value="member_shared">Shared Member</option>
							<option value="side_project">Side Project</option>
							<option value="touring">Touring Together</option>
						</select>

						<textarea
							name="description"
							value={formData.description}
							onChange={handleChange}
							placeholder="Describe the connection (optional)"
							rows={3}
						/>
					</div>

					{message && (
						<div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
							{message}
						</div>
					)}

					<div className="form-actions">
						<button type="button" onClick={onClose} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" disabled={isSubmitting} className="btn-primary">
							{isSubmitting ? 'Submitting...' : 'Submit Connection'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default SubmissionForm
