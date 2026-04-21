import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Band {
	id: number
	name: string
	connections: number
	is_main?: boolean
}

interface Connection {
	source: number
	target: number
	connection_type?: string
}

interface ForceGraphProps {
	bands: Band[]
	connections: Connection[]
	width: number
	height: number
	onNodeClick?: (bandId: number) => void
	onReset?: () => void
}

const ForceGraph: React.FC<ForceGraphProps> = ({ bands, connections, width, height, onNodeClick, onReset }) => {
	const svgRef = useRef<SVGSVGElement>(null)

	useEffect(() => {
		if (!svgRef.current || bands.length === 0) return

		// Clear previous content
		d3.select(svgRef.current).selectAll('*').remove()

		// Create SVG
		const svg = d3.select(svgRef.current)
			.attr('width', width)
			.attr('height', height)

		// Create zoom behavior
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on('zoom', (event) => {
				svg.select('g').attr('transform', event.transform)
			})

		svg.call(zoom)

		// Create main group
		const g = svg.append('g')

		// Create force simulation
		const simulation = d3.forceSimulation<Band & d3.SimulationNodeDatum>(bands)
			.force('link', d3.forceLink<Band & d3.SimulationNodeDatum, Connection>(connections).id(d => d.id).distance(100))
			.force('charge', d3.forceManyBody().strength(-300))
			.force('center', d3.forceCenter(width / 2, height / 2))
			.force('collision', d3.forceCollide().radius((d: any) => Math.max(5, Math.min(20, d.connections * 2))))

		// Create links
		const link = g.append('g')
			.attr('class', 'links')
			.selectAll('line')
			.data(connections)
			.enter().append('line')
			.attr('stroke', '#999')
			.attr('stroke-opacity', 0.6)
			.attr('stroke-width', 1)

		// Create nodes
		const node = g.append('g')
			.attr('class', 'nodes')
			.selectAll('circle')
			.data(bands)
			.enter().append('circle')
			.attr('r', d => Math.max(5, Math.min(20, d.connections * 2)))
			.attr('fill', d => d.is_main ? '#ff6b6b' : '#69b3a2') // Highlight main band in red
			.attr('stroke', '#fff')
			.attr('stroke-width', d => d.is_main ? 3 : 2) // Thicker stroke for main band
			.style('cursor', 'pointer')
			.on('mouseover', function (_event, d) {
				d3.select(this).attr('fill', '#ffd93d')

				// Show tooltip
				const tooltip = d3.select('body').append('div')
					.attr('class', 'tooltip')
					.style('position', 'absolute')
					.style('background', 'rgba(0, 0, 0, 0.8)')
					.style('color', 'white')
					.style('padding', '8px')
					.style('border-radius', '4px')
					.style('font-size', '12px')
					.style('pointer-events', 'none')
					.style('z-index', '1000')

				tooltip.html(`
					<strong>${d.name}</strong><br/>
					${d.connections} connections
				`)
			})
			.on('mousemove', function (event) {
				const tooltip = d3.select('.tooltip')
				tooltip.style('left', (event.pageX + 10) + 'px')
					.style('top', (event.pageY - 10) + 'px')
			})
			.on('mouseout', function () {
				d3.select(this).attr('fill', '#69b3a2')
				d3.select('.tooltip').remove()
			})
			.on('click', (_event, d) => {
				if (onNodeClick) {
					onNodeClick(d.id)
				}
			})

		// Add labels for selected nodes
		const label = g.append('g')
			.attr('class', 'labels')
			.selectAll('text')
			.data(bands)
			.enter().append('text')
			.text(d => d.name)
			.attr('font-size', '12px')
			.attr('dx', 12)
			.attr('dy', 4)
			.style('pointer-events', 'none')
			.style('opacity', 0)

		// Update positions on simulation tick
		simulation.on('tick', () => {
			link
				.attr('x1', d => (d.source as any).x)
				.attr('y1', d => (d.source as any).y)
				.attr('x2', d => (d.target as any).x)
				.attr('y2', d => (d.target as any).y)

			node
				.attr('cx', d => (d as any).x)
				.attr('cy', d => (d as any).y)

			label
				.attr('x', d => (d as any).x)
				.attr('y', d => (d as any).y)
		})

		// Cleanup function
		return () => {
			simulation.stop()
			d3.select('.tooltip').remove()
		}
	}, [bands, connections, width, height, onNodeClick])

	return (
		<div className="force-graph-container">
			{onReset && (
				<button
					className="reset-button"
					onClick={onReset}
					style={{
						position: 'absolute',
						top: '10px',
						right: '10px',
						zIndex: 1000,
						padding: '8px 16px',
						backgroundColor: '#fff',
						border: '1px solid #ccc',
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '14px'
					}}
				>
					Reset View
				</button>
			)}
			<svg ref={svgRef}></svg>
		</div>
	)
}

export default ForceGraph
