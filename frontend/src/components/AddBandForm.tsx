import React, { useState } from 'react'
import './SubmissionForm.css'

interface AddBandFormProps {
	isOpen: boolean
	onClose: () => void
	onSubmit: () => void
	apiUrl: string
}

const AddBandForm: React.FC<AddBandFormProps> = ({ isOpen, onClose, onSubmit, apiUrl }) => {
	const [formData, setFormData] = useState({ name: '', location: '' })
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [message, setMessage] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setMessage('')

		try {
			const response = await fetch(`${apiUrl}/api/bands`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formData.name,
					location: formData.location || undefined,
				}),
			})

			if (response.ok) {
				setMessage('Success! The band has been added to the map.')
				setFormData({ name: '', location: '' })
				onSubmit() // Refresh the data
				setTimeout(() => {
					onClose()
				}, 2000)
			} else {
				const errorData = await response.json()
				setMessage(`Error: ${errorData.detail || 'Failed to add band'}`)
			}
		} catch {
			setMessage('Error: Failed to connect to server')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value })
	}

	if (!isOpen) return null

	return (
		<div className="submission-overlay" onClick={onClose}>
			<div className="submission-content" onClick={(e) => e.stopPropagation()}>
				<button className="submission-close" onClick={onClose}>
					×
				</button>

				<div className="submission-header">
					<h2>Add a Band</h2>
					<p>Add a band on its own — you can link it to others later</p>
				</div>

				<form onSubmit={handleSubmit} className="submission-form">
					<div className="form-section">
						<div className="form-row">
							<input
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Band name"
								required
							/>
							<input
								type="text"
								name="location"
								value={formData.location}
								onChange={handleChange}
								placeholder="Location (e.g., Seattle, WA)"
							/>
						</div>
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
							{isSubmitting ? 'Adding...' : 'Add Band'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default AddBandForm
