// Graph visualization using D3.js
class GraphView {
  constructor() {
    this.container = document.getElementById('graph-container');
    this.miniContainer = document.getElementById('mini-graph-container');
    this.svg = null;
    this.miniSvg = null;
    this.width = 400;
    this.height = 400;
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    this.miniSimulation = null;
    
    this.init();
  }
  
  init() {
    if (typeof d3 === 'undefined') {
      console.warn('D3.js not loaded, falling back to basic graph rendering');
      this.initBasicGraph();
      return;
    }
    
    // Initialize main graph container
    if (this.container) {
      this.createSVG(this.container, 'svg');
    }
    
    // Initialize mini graph container
    if (this.miniContainer) {
      this.createSVG(this.miniContainer, 'miniSvg');
    }
    
    this.setupEventListeners();
  }
  
  createSVG(container, svgProperty) {
    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('background-color', 'var(--color-bg-primary)');
    
    // Add zoom and pan behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        svg.select('.graph-content').attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // Create main group for graph content
    const graphContent = svg.append('g').attr('class', 'graph-content');
    
    // Add arrow marker definition
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', svgProperty === 'miniSvg' ? 'arrowhead-mini' : 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-text-muted)');
    
    this[svgProperty] = svg;
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.updateDimensions();
    });
  }
  
  updateDimensions() {
    if (this.container && this.svg) {
      const rect = this.container.getBoundingClientRect();
      this.width = rect.width || 400;
      this.height = rect.height || 400;
      this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
    }
    
    if (this.miniContainer && this.miniSvg) {
      const rect = this.miniContainer.getBoundingClientRect();
      const miniWidth = rect.width || 280;
      const miniHeight = rect.height || 200;
      this.miniSvg.attr('viewBox', `0 0 ${miniWidth} ${miniHeight}`);
    }
  }
  
  loadData(notes, linkGraph) {
    if (!notes || !linkGraph) return;
    
    this.processGraphData(notes, linkGraph);
    this.renderMiniGraph();
  }
  
  processGraphData(notes, linkGraph) {
    // Convert Map to array and process nodes
    this.nodes = Array.from(notes.values()).map(note => ({
      id: note.id,
      title: note.title || note.id,
      degree: (linkGraph.get(note.id) || new Set()).size || 0,
      group: this.categorizeNode(note)
    }));
    
    // Process links
    this.links = [];
    linkGraph.forEach((targets, source) => {
      if (Array.isArray(targets)) {
        targets.forEach(target => {
          if (notes.has(target)) {
            this.links.push({
              source: source,
              target: target
            });
          }
        });
      } else if (targets instanceof Set) {
        targets.forEach(target => {
          if (notes.has(target)) {
            this.links.push({
              source: source,
              target: target
            });
          }
        });
      }
    });
  }
  
  categorizeNode(note) {
    // Simple categorization based on note properties
    if (note.frontMatter?.tags) {
      const tags = Array.isArray(note.frontMatter.tags) 
        ? note.frontMatter.tags 
        : [note.frontMatter.tags];
      
      if (tags.includes('project')) return 'project';
      if (tags.includes('journal')) return 'journal';
      if (tags.includes('research')) return 'research';
    }
    
    // Categorize by path
    if (note.id.includes('journal/')) return 'journal';
    if (note.id.includes('projects/')) return 'project';
    if (note.id.includes('research/')) return 'research';
    if (note.id.includes('drums/')) return 'drums';
    if (note.id.includes('math/')) return 'math';
    
    return 'default';
  }
  
  renderMiniGraph() {
    if (!this.miniSvg || this.nodes.length === 0) return;
    
    const container = this.miniContainer;
    const rect = container.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 200;
    
    // Update viewBox
    this.miniSvg.attr('viewBox', `0 0 ${width} ${height}`);
    
    // Clear previous content
    const graphContent = this.miniSvg.select('.graph-content');
    graphContent.selectAll('*').remove();
    
    // Create simulation for mini graph
    this.miniSimulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(30))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(8));
    
    // Create links
    const links = graphContent.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead-mini)');
    
    // Create nodes
    const nodes = graphContent.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.nodes)
      .enter()
      .append('circle')
      .attr('r', d => Math.max(3, Math.min(8, 3 + d.degree)))
      .attr('fill', d => this.getNodeColor(d.group))
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (window.app && typeof window.app.loadNote === 'function') {
          window.app.loadNote(d.id);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', Math.max(4, Math.min(10, 4 + d.degree)));
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('r', Math.max(3, Math.min(8, 3 + d.degree)));
      });
    
    // Add titles for tooltips
    nodes.append('title').text(d => d.title);
    
    // Update simulation
    this.miniSimulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });
  }
  
  renderGlobalGraph(containerElement) {
    if (!containerElement || !d3) return;
    
    const width = 1000;
    const height = 700;
    
    // Clear container
    d3.select(containerElement).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(containerElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graphContent.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    const graphContent = svg.append('g').attr('class', 'graph-content');
    
    // Add arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead-global')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-text-muted)');
    
    // Create simulation
    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(15));
    
    // Create links
    const links = graphContent.append('g')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead-global)');
    
    // Create nodes
    const nodes = graphContent.append('g')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));
    
    nodes.append('circle')
      .attr('r', d => Math.max(5, Math.min(15, 5 + d.degree * 2)))
      .attr('fill', d => this.getNodeColor(d.group))
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', 2);
    
    nodes.append('text')
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
      .attr('dx', d => Math.max(5, Math.min(15, 5 + d.degree * 2)) + 5)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('fill', 'var(--color-text-secondary)');
    
    nodes.on('click', (event, d) => {
      if (window.app && typeof window.app.loadNote === 'function') {
        window.app.loadNote(d.id);
        // Close modal
        const modal = document.getElementById('global-graph-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    });
    
    // Update simulation
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
  
  renderLocalGraph(containerElement, currentNodeId) {
    if (!containerElement || !d3 || !currentNodeId) return;
    
    // Filter nodes and links for local graph (current node + direct connections)
    const connectedNodeIds = new Set([currentNodeId]);
    
    // Find all directly connected nodes
    this.links.forEach(link => {
      if (link.source === currentNodeId || (typeof link.source === 'object' && link.source.id === currentNodeId)) {
        connectedNodeIds.add(typeof link.target === 'object' ? link.target.id : link.target);
      }
      if (link.target === currentNodeId || (typeof link.target === 'object' && link.target.id === currentNodeId)) {
        connectedNodeIds.add(typeof link.source === 'object' ? link.source.id : link.source);
      }
    });
    
    const localNodes = this.nodes.filter(node => connectedNodeIds.has(node.id));
    const localLinks = this.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId);
    });
    
    const width = 1000;
    const height = 700;
    
    // Clear container
    d3.select(containerElement).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(containerElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graphContent.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    const graphContent = svg.append('g').attr('class', 'graph-content');
    
    // Add arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead-local')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-text-muted)');
    
    // Create simulation
    const simulation = d3.forceSimulation(localNodes)
      .force('link', d3.forceLink(localLinks).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));
    
    // Create links
    const links = graphContent.append('g')
      .selectAll('line')
      .data(localLinks)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead-local)');
    
    // Create nodes
    const nodes = graphContent.append('g')
      .selectAll('g')
      .data(localNodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));
    
    nodes.append('circle')
      .attr('r', d => d.id === currentNodeId ? 20 : Math.max(8, Math.min(18, 8 + d.degree * 2)))
      .attr('fill', d => d.id === currentNodeId ? 'var(--color-primary)' : this.getNodeColor(d.group))
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', 3);
    
    nodes.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('dx', d => (d.id === currentNodeId ? 20 : Math.max(8, Math.min(18, 8 + d.degree * 2))) + 8)
      .attr('dy', '.35em')
      .style('font-size', '12px')
      .style('font-weight', d => d.id === currentNodeId ? 'bold' : 'normal')
      .style('fill', d => d.id === currentNodeId ? 'var(--color-primary)' : 'var(--color-text-secondary)');
    
    nodes.on('click', (event, d) => {
      if (window.app && typeof window.app.loadNote === 'function') {
        window.app.loadNote(d.id);
        // Close modal
        const modal = document.getElementById('local-graph-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    });
    
    // Update simulation
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
  
  getNodeColor(group) {
    const colors = {
      'project': '#8b5cf6',
      'journal': '#06b6d4',
      'research': '#059669',
      'drums': '#dc2626',
      'math': '#7c3aed',
      'default': '#6b7280'
    };
    return colors[group] || colors.default;
  }
  
  // Fallback for when D3 is not available
  initBasicGraph() {
    console.log('Initializing basic graph without D3.js');
    // Basic fallback implementation could go here
    // For now, just log that D3 is not available
  }
}

// Initialize the graph view
window.GraphView = GraphView;
