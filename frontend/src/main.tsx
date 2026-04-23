import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import About from './About.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/about" element={<About />} />
			</Routes>
		</BrowserRouter>
	</React.StrictMode>,
)
