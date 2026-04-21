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
	member_shared: '#ff2d55',
	collaboration: '#00d4ff',
	side_project: '#ff9500',
	touring: '#39ff14',
}

const DEFAULT_LINK_COLOR = '#333333'

function getNodeColor(d: Band): string {
	if (d.is_main) return '#ff2d55'
	return '#00d4ff'
}

function getNodeGlowFilter(d: Band): string {
	if (d.is_main) return 'url(#glow-pink)'
	return 'url(#glow-blue)'
}

function getNodeRadius(d: Band): number {
	return Math.max(4, Math.min(22, 3 + d.connections * 1.5))
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

		// ===== SVG DEFS: Glow filters =====
		const defs = svg.append('defs')

		// Pink glow
		const glowPink = defs.append('filter').attr('id', 'glow-pink').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
		glowPink.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
		glowPink.append('feFlood').attr('flood-color', '#ff2d55').attr('flood-opacity', '0.6').attr('result', 'color')
		glowPink.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
		const glowPinkMerge = glowPink.append('feMerge')
		glowPinkMerge.append('feMergeNode').attr('in', 'glow')
		glowPinkMerge.append('feMergeNode').attr('in', 'SourceGraphic')

		// Blue glow
		const glowBlue = defs.append('filter').attr('id', 'glow-blue').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
		glowBlue.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur')
		glowBlue.append('feFlood').attr('flood-color', '#00d4ff').attr('flood-opacity', '0.5').attr('result', 'color')
		glowBlue.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
		const glowBlueMerge = glowBlue.append('feMerge')
		glowBlueMerge.append('feMergeNode').attr('in', 'glow')
		glowBlueMerge.append('feMergeNode').attr('in', 'SourceGraphic')

		// Amber glow (for hover)
		const glowAmber = defs.append('filter').attr('id', 'glow-amber').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
		glowAmber.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur')
		glowAmber.append('feFlood').attr('flood-color', '#ff9500').attr('flood-opacity', '0.7').attr('result', 'color')
		glowAmber.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
		const glowAmberMerge = glowAmber.append('feMerge')
		glowAmberMerge.append('feMergeNode').attr('in', 'glow')
		glowAmberMerge.append('feMergeNode').attr('in', 'SourceGraphic')

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
			.attr('stroke-opacity', 0.3)
			.attr('stroke-width', 1)
			.attr('stroke-dasharray', d => d.connection_type === 'touring' ? '4 2' : null)

		// Nodes
		const node = g.append('g')
			.attr('class', 'nodes')
			.selectAll('circle')
			.data(bands)
			.enter().append('circle')
			.attr('r', d => getNodeRadius(d))
			.attr('fill', d => getNodeColor(d))
			.attr('stroke', 'none')
			.attr('filter', d => getNodeGlowFilter(d))
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
					.attr('fill', '#ff9500')
					.attr('filter', 'url(#glow-amber)')

				// Highlight connected links
				link
					.attr('stroke-opacity', l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id || tgt === d.id) ? 0.8 : 0.06
					})
					.attr('stroke-width', l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id || tgt === d.id) ? 2 : 0.5
					})

				// Dim other nodes
				node.attr('opacity', n => {
					if (n.id === d.id) return 1
					const connected = connections.some(l => {
						const src = typeof l.source === 'object' ? l.source.id : l.source
						const tgt = typeof l.target === 'object' ? l.target.id : l.target
						return (src === d.id && tgt === n.id) || (tgt === d.id && src === n.id)
					})
					return connected ? 1 : 0.15
				})

				tooltip
					.style('display', 'block')
					.html(`<strong>${d.name}</strong><br/><span style="color:#ff9500">${d.connections} connections</span>`)
			})
			.on('mousemove', function (event) {
				tooltip
					.style('left', (event.pageX + 12) + 'px')
					.style('top', (event.pageY - 12) + 'px')
			})
			.on('mouseout', function (_event, d) {
				d3.select(this)
					.attr('fill', getNodeColor(d))
					.attr('filter', getNodeGlowFilter(d))

				// Restore links
				link
					.attr('stroke-opacity', 0.3)
					.attr('stroke-width', 1)

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
			.attr('font-size', d => d.is_main ? '12px' : '10px')
			.attr('font-weight', d => d.is_main ? 'bold' : 'normal')
			.attr('font-family', "'Space Mono', monospace")
			.attr('fill', d => d.is_main ? '#ff2d55' : '#888')
			.attr('text-anchor', 'middle')
			.attr('dy', d => -(getNodeRadius(d) + 6))
			.style('pointer-events', 'none')
			.style('text-transform', 'uppercase')
			.style('letter-spacing', '0.04em')
			.style('text-shadow', '0 0 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.7)')
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
						top: '12px',
						right: '12px',
						zIndex: 10,
						padding: '6px 14px',
						backgroundColor: 'transparent',
						border: '1px solid #ff2d55',
						borderRadius: '2px',
						cursor: 'pointer',
						fontSize: '11px',
						fontFamily: "'Space Mono', monospace",
						fontWeight: 700,
						color: '#ff2d55',
						textTransform: 'uppercase' as const,
						letterSpacing: '0.06em',
						transition: 'all 0.15s ease',
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = '#ff2d55'
						e.currentTarget.style.color = '#000'
						e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,85,0.4)'
					}}
					onMouseLeave={e => {
						e.currentTarget.style.backgroundColor = 'transparent'
						e.currentTarget.style.color = '#ff2d55'
						e.currentTarget.style.boxShadow = 'none'
					}}
				>
					Reset View
				</button>
			)}
			<div className="graph-legend" style={{
				position: 'absolute',
				bottom: '12px',
				left: '12px',
				zIndex: 10,
				background: 'rgba(5,5,5,0.85)',
				border: '1px solid #1e1e1e',
				padding: '10px 14px',
				borderRadius: '2px',
				fontSize: '10px',
				lineHeight: '1.8',
				fontFamily: "'Space Mono', monospace",
				letterSpacing: '0.04em',
			}}>
				{Object.entries(CONNECTION_COLORS).map(([type, color]) => (
					<div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{
							width: '16px',
							height: '2px',
							background: type === 'touring' ? 'none' : color,
							display: 'inline-block',
							borderRadius: '0',
							boxShadow: `0 0 6px ${color}`,
							...(type === 'touring' ? { borderTop: `2px dashed ${color}`, background: 'none', boxShadow: 'none' } : {})
						}} />
						<span style={{ color: '#666', textTransform: 'uppercase' }}>{type.replace('_', ' ')}</span>
					</div>
				))}
			</div>
			<svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
			<div
				ref={tooltipRef}
				style={{
					display: 'none',
					position: 'fixed',
					background: 'rgba(10, 10, 10, 0.95)',
					border: '1px solid #222',
					color: '#e0e0e0',
					padding: '8px 12px',
					borderRadius: '2px',
					fontSize: '11px',
					fontFamily: "'Space Mono', monospace",
					pointerEvents: 'none',
					zIndex: 1000,
					maxWidth: '200px',
					letterSpacing: '0.02em',
				}}
			/>
		</div>
	)
}

export default ForceGraph
