import { useState, useEffect } from 'react'
import './About.css'

interface Stats {
	total_bands: number
	total_connections: number
}

const PRESS_LINKS = [
	{ name: 'Wired', url: 'https://www.wired.com/2011/03/seattle-band-map/' },
	{ name: 'Bloomberg', url: 'https://www.bloomberg.com/news/articles/2012-10-08/the-seattle-band-map-keeps-getting-more-complicated' },
	{ name: 'Future-ish', url: 'https://www.future-ish.com/2011/04/seattle-band-map-visualizing-local.html' },
	{ name: 'The Vinyl District', url: 'https://www.thevinyldistrict.com/seattle/seattle-is-off-the-charts-on-the-band-map/' },
	{ name: 'KNKX', url: 'https://www.knkx.org/other-news/2020-10-24/seattle-band-map-is-the-six-degrees-of-kevin-bacon-for-northwest-musicians' },
]

function About() {
	const [stats, setStats] = useState<Stats | null>(null)
	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

	useEffect(() => {
		fetch(`${apiUrl}/api/stats`)
			.then(res => res.json())
			.then(data => setStats(data))
			.catch(() => {})
	}, [])

	return (
		<div className="App">
			<header className="App-header">
				<h1><a href="/" className="header-home-link">Seattle Band Map</a></h1>
				<p>Exploring connections between Pacific Northwest bands</p>
			</header>

			<main className="App-main">
				<div className="about-section">
					<h2>About</h2>
					<p className="about-text">
						The Seattle Band Map was founded in 2010 as an art project and collaboration
						between <a href="https://www.rachelratner.com" target="_blank" rel="noopener noreferrer">Rachel Ratner</a> and
						Keith Whiteman. It soon outgrew the confines of poster paper and became a website
						that allowed users to crowdsource information about NW bands and how they're
						connected. Since then it has cataloged over {stats ? stats.total_bands.toLocaleString() : '...'} bands
						and growing.
					</p>
				</div>

				<div className="about-section">
					<h2>Press</h2>
					<ul className="press-list">
						{PRESS_LINKS.map(link => (
							<li key={link.url} className="press-item">
								<a href={link.url} target="_blank" rel="noopener noreferrer" className="press-link">
									{link.name}
								</a>
							</li>
						))}
					</ul>
				</div>
			</main>

			<footer className="App-footer">
				<div className="footer-links">
					<a href="/" className="footer-link">Map</a>
					<span className="footer-divider">/</span>
					<a href="/blog" className="footer-link">Blog</a>
					<span className="footer-divider">/</span>
					<a href="/about" className="footer-link">About</a>
				</div>
				<p>&copy; {new Date().getFullYear()} Seattle Band Map &mdash; Built by <a href="https://www.rachelratner.com" target="_blank" rel="noopener noreferrer" className="footer-credit">Rachel Ratner</a></p>
			</footer>
		</div>
	)
}

export default About
