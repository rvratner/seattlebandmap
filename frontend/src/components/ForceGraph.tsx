import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

interface Band {
	id: number
	name: string
	connections: number
	is_main?: boolean
}

interface Connection {
	source: number | any
	target: number | any
	connection_type?: string
}

interface ForceGraphProps {
	bands: Band[]
	connections: Connection[]
	onNodeClick?: (bandId: number) => void
	onReset?: () => void
}

const CONNECTION_COLORS: Record<string, string> = {
	member_shared: '#e06c9f',
	collaboration: '#6cb4ee',
	side_project: '#f0a04b',
	touring: '#82d982',
}

const DEFAULT_LINK_COLOR = '#888'

function getNodeColor(d: Band): string {
	if (d.is_main) return '#ff6b6b'
	return '#69b3a2'
}

function getNodeRadius(d: Band): number {
	return Math.max(5, Math.min(25, 3 + d.connections * 1.5))
}

const ForceGraph: React.FC<ForceGraphProps> = ({ bands, connections, onNodeClick, onReset }) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const svgRef = useRef<SVGSVGElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)

	const renderGraph = useCallback(() => {
		if (!svgRef.current || !containerRef.current || bands.length === 0) return

		const container = containerRef.current
		const width = container.clientWidth
		const height = Math.max(500, container.clientHeight)

		// Clear previous content
		d3.select(svgRef.current).selectAll('*').remove()

		const svg = d3.select(svgRef.current)
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)

		// Zoom behavior
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 6])
			.on('zoom', (event) => {
				g.attr('transform', event.transform)
			})

		svg.call(zoom)

		const g = svg.append('g')

		// Determine label visibility threshold (top ~15% of nodes by connections)
		const sortedConnections = [...bands].sort((a, b) => b.connections - a.connections)
		const labelThreshold = sortedConnections[Math.min(Math.floor(bands.length * 0.15), bands.length - 1)]?.connections || 3

		// Force simulation
		const simulation = d3.forceSimulation<Band & d3.SimulationNodeDatum>(bands)
			.force('link', d3.forceLink<Band & d3.SimulationNodeDatum, Connection>(connections)
				.id(d => d.id)
				.distance(80))
			.force('charge', d3.forceManyBody().strength(-200))
			.force('center', d3.forceCenter(width / 2, height / 2))
			.force('collision', d3.forceCollide().radius((d: any) => getNodeRadius(d) + 2))

		// Links - color-coded by connection type
		const link = g.append('g')
			.attr('class', 'links')
			.selectAll('line')
			.data(connections)
			.enter().append('line')
			.attr('stroke', d => CONNECTION_COLORS[d.connection_type || ''] || DEFAULT_LINK_COLOR)
			.attr('stroke-opacity', 0.5)
			.attr('stroke-width', 1.5)
			.attr('stroke-dasharray', d => d.connection_type === 'touring' ? '4 2' : null)

		// Nodes
		const node = g.append('g')
			.attr('class', 'nodes')
			.selectAll('circle')
			.data(bands)
			.enter().append('circle')
			.attr('r', d => getNodeRadius(d))
			.attr('fill', d => getNodeColor(d))
			.attr('stroke', '#fff')
			.attr('stroke-width', d => d.is_main ? 3 : 1.5)
			.style('cursor', 'pointer')

		// Drag behavior
		const drag = d3.drag<SVGCircleElement, Band & d3.SimulationNodeDatum>()
			.on('start', (event, d) => {
				if (!event.active) simulation.alphaTarget(0.3).restart()
				d.fx = d.x
				d.fy = d.y
			})
			.on('drag', (event, d) => {
				d.fx = event.x
				d.fy = event.y
			})
			.on('end', (event, d) => {
				if (!event.active) simulation.alphaTarget(0)
				d.fx = null
				d.fy = null
			})

		node.call(drag as any)

		// Tooltip via a persistent div (no append/remove on every hover)
		const tooltip = d3.select(tooltipRef.current)

		node
			.on('mouseover', function (_event, d) {
				d3.select(this)
					.attr('fill', '#ffd93d')
					.attr('stroke-width', 3)

				// Highlight connected links
				link
					.attr('stroke-opacity', l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id || tgt === d.id) ? 1 : 0.15
					})
					.attr('stroke-width', l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id || tgt === d.id) ? 2.5 : 1
					})

				// Dim other nodes
				node.attr('opacity', n => {
					if (n.id === d.id) return 1
					const connected = connections.some(l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id && tgt === n.id) || (tgt === d.id && src === n.id)
					})
					return connected ? 1 : 0.25
				})

				tooltip
					.style('display', 'block')
					.html(`<strong>${d.name}</strong><br/>${d.connections} connections`)
			})
			.on('mousemove', function (event) {
				tooltip
					.style('left', (event.pageX + 12) + 'px')
					.style('top', (event.pageY - 12) + 'px')
			})
			.on('mouseout', function (_event, d) {
				// Restore original color (respects is_main)
				d3.select(this)
					.attr('fill', getNodeColor(d))
					.attr('stroke-width', d.is_main ? 3 : 1.5)

				// Restore links
				link
					.attr('stroke-opacity', 0.5)
					.attr('stroke-width', 1.5)

				// Restore nodes
				node.attr('opacity', 1)

				tooltip.style('display', 'none')
			})
			.on('click', (_event, d) => {
				if (onNodeClick) onNodeClick(d.id)
			})

		// Labels - only show for high-connection nodes and main band
		const label = g.append('g')
			.attr('class', 'labels')
			.selectAll('text')
			.data(bands)
			.enter().append('text')
			.text(d => d.name)
			.attr('font-size', d => d.is_main ? '13px' : '11px')
			.attr('font-weight', d => d.is_main ? 'bold' : 'normal')
			.attr('fill', 'white')
			.attr('text-anchor', 'middle')
			.attr('dy', d => -(getNodeRadius(d) + 6))
			.style('pointer-events', 'none')
			.style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)')
			.style('opacity', d => (d.is_main || d.connections >= labelThreshold) ? 1 : 0)

		// Tick
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

		return () => {
			simulation.stop()
			tooltip.style('display', 'none')
		}
	}, [bands, connections, onNodeClick])

	// Responsive: re-render on container resize
	useEffect(() => {
		const cleanup = renderGraph()
		const container = containerRef.current
		if (!container) return cleanup

		const observer = new ResizeObserver(() => {
			renderGraph()
		})
		observer.observe(container)

		return () => {
			observer.disconnect()
			if (cleanup) cleanup()
		}
	}, [renderGraph])

	return (
		<div className="force-graph-container" ref={containerRef} style={{ width: '100%', minHeight: '500px', position: 'relative' }}>
			{onReset && (
				<button
					className="reset-button"
					onClick={onReset}
					style={{
						position: 'absolute',
						top: '10px',
						right: '10px',
						zIndex: 10,
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
			<div className="graph-legend" style={{
				position: 'absolute',
				bottom: '10px',
				left: '10px',
				zIndex: 10,
				background: 'rgba(0,0,0,0.6)',
				padding: '8px 12px',
				borderRadius: '6px',
				fontSize: '11px',
				lineHeight: '1.6'
			}}>
				{Object.entries(CONNECTION_COLORS).map(([type, color]) => (
					<div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
						<span style={{
							width: '16px',
							height: '3px',
							background: color,
							display: 'inline-block',
							borderRadius: '2px',
							...(type === 'touring' ? { borderTop: `2px dashed ${color}`, background: 'none' } : {})
						}} />
						<span style={{ color: '#ddd' }}>{type.replace('_', ' ')}</span>
					</div>
				))}
			</div>
			<svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
			<div
				ref={tooltipRef}
				style={{
					display: 'none',
					position: 'fixed',
					background: 'rgba(0, 0, 0, 0.85)',
					color: 'white',
					padding: '8px 12px',
					borderRadius: '6px',
					fontSize: '12px',
					pointerEvents: 'none',
					zIndex: 1000,
					maxWidth: '200px'
				}}
			/>
		</div>
	)
}

export default ForceGraph
