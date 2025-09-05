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
    this.notes = new Map();
    this.tags = new Map();
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
  
  loadData(notes, linkGraph, tags = new Map()) {
    if (!notes || !linkGraph) return;
    
    this.notes = notes;
    this.tags = tags;
    this.processGraphData(notes, linkGraph);
    // Don't render mini graph here - it will be rendered when a note is selected
  }
  
  processGraphData(notes, linkGraph) {
    // Convert Map to array and process nodes
    this.nodes = Array.from(notes.values()).map(note => ({
      id: note.id,
      title: note.title || note.id,
      degree: (linkGraph.get(note.id) || new Set()).size || 0,
      group: this.categorizeNode(note)
    }));
    
    // Add tag nodes if tags exist
    if (this.tags && this.tags.size > 0) {
      this.tags.forEach((tagNotes, tagName) => {
        // Create tag node with safe degree calculation
        const degree = (tagNotes && typeof tagNotes.size === 'number') ? tagNotes.size : 
                      (Array.isArray(tagNotes) ? tagNotes.length : 1);
        this.nodes.push({
          id: `tag:${tagName}`,
          title: `#${tagName}`,
          degree: degree,
          group: 'tag'
        });
      });
    }
    
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
    
    // Add note-to-tag relationships
    if (this.tags && this.tags.size > 0) {
      this.tags.forEach((tagNotes, tagName) => {
        const tagId = `tag:${tagName}`;
        tagNotes.forEach(noteId => {
          if (notes.has(noteId)) {
            this.links.push({
              source: noteId,
              target: tagId
            });
          }
        });
      });
    }
    
    console.log(`Graph: Processed ${this.nodes.length} nodes and ${this.links.length} links`);
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
  
  renderMiniGraph(currentNodeId = null) {
    if (!this.miniSvg) return;
    
    let nodesToRender = this.nodes;
    let linksToRender = this.links;
    
    // If currentNodeId is provided, show local graph (current node + connections)
    if (currentNodeId && this.nodes.length > 0) {
      const connectedNodeIds = this.getLocalGraphNodes(currentNodeId);
      
      // Filter nodes and links for local graph
      nodesToRender = this.nodes.filter(node => 
        connectedNodeIds.has(node.id) && !node.id.startsWith('tag:')
      );
      linksToRender = this.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId) && 
               !sourceId.startsWith('tag:') && !targetId.startsWith('tag:');
      });
    } else {
      // When no currentNodeId is provided, show empty graph (will be populated when note loads)
      nodesToRender = [];
      linksToRender = [];
    }
    
    // If no nodes to render, show empty graph
    if (nodesToRender.length === 0) {
      // Clear the graph but keep the SVG structure
      const graphContent = this.miniSvg.select('.graph-content');
      graphContent.selectAll('*').remove();
      return;
    }

    const container = this.miniContainer;
    const rect = container.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 200;
    
    // Update viewBox
    this.miniSvg.attr('viewBox', `0 0 ${width} ${height}`);
    
    // Clear previous content
    const graphContent = this.miniSvg.select('.graph-content');
    graphContent.selectAll('*').remove();

    // Create simulation for mini graph - adjust forces for better layout
    this.miniSimulation = d3.forceSimulation(nodesToRender)
      .force('link', d3.forceLink(linksToRender).id(d => d.id).distance(30))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(8))
      .alphaDecay(0.05) // Faster simulation decay
      .alphaMin(0.01);  // Lower alpha minimum for quicker end
    
    // Create links
    const links = graphContent.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linksToRender)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-graph-edge)')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead-mini)');
      
    console.log(`Mini graph: Rendering ${linksToRender.length} links, ${links.size()} elements created`);
    
    // Create nodes
    const nodes = graphContent.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesToRender)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (window.app && typeof window.app.loadNote === 'function') {
          window.app.loadNote(d.id);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('circle')
          .transition().duration(200)
          .attr('r', d => {
            const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
            const baseRadius = currentNodeId && d.id === currentNodeId ? 8 : Math.max(3, Math.min(8, 3 + degree));
            return baseRadius + 1;
          });
        
        // Highlight connected edges and fade others
        graphContent.selectAll('.links line')
          .attr('stroke-opacity', edge => {
            const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
            return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
          })
          .attr('marker-opacity', edge => {
            const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
            return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
          })
          .attr('stroke', edge => {
            const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
            return (sourceId === d.id || targetId === d.id) ? 'var(--color-graph-highlight)' : 'var(--color-graph-edge)';
          });
        
        // Fade non-connected nodes
        graphContent.selectAll('.node-group')
          .style('opacity', node => {
            if (node.id === d.id) return 1.0; // Keep hovered node fully visible
            // Check if this node is directly connected to the hovered node
            const isDirectlyConnected = linksToRender.some(link => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
            });
            return isDirectlyConnected ? 1.0 : 0.2;
          });
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('circle')
          .transition().duration(200)
          .attr('r', d => {
            const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
            return currentNodeId && d.id === currentNodeId ? 8 : Math.max(3, Math.min(8, 3 + degree));
          });
        
        // Reset edge highlighting
        graphContent.selectAll('.links line')
          .attr('stroke-opacity', 0.8)
          .attr('marker-opacity', 0.8)
          .attr('stroke', 'var(--color-graph-edge)');
        
        // Reset node opacity
        graphContent.selectAll('.node-group')
          .style('opacity', 1.0);
      });

    // Add circles
    nodes.append('circle')
      .attr('r', d => {
        // Highlight current node with larger size
        if (currentNodeId && d.id === currentNodeId) {
          return 8;
        }
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        return Math.max(3, Math.min(8, 3 + degree));
      })
      .attr('fill', d => {
        // Highlight current node with primary color
        if (currentNodeId && d.id === currentNodeId) {
          return 'var(--color-graph-highlight)';
        }
        return d.group === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-node)';
      })
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', d => currentNodeId && d.id === currentNodeId ? 2 : 1);

    // Add labels for nodes
    nodes.append('text')
      .text(d => this.truncateTitle(d.title, 12))
      .attr('dx', d => {
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        const radius = currentNodeId && d.id === currentNodeId ? 8 : Math.max(3, Math.min(8, 3 + degree));
        return radius + 4;
      })
      .attr('dy', '.35em')
      .style('font-size', '9px')
      .style('font-weight', d => currentNodeId && d.id === currentNodeId ? 'bold' : 'normal')
      .style('fill', 'var(--color-text-secondary)')
      .style('pointer-events', 'none');

    // Add tooltips
    nodes.append('title').text(d => d.title);
    
    // Update simulation with zoom-to-fit
    this.miniSimulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom to fit after simulation stabilizes
    this.miniSimulation.on('end', () => {
      this.zoomToFitMiniGraph(graphContent, width, height);
    });
  }

  // Helper method to get all nodes connected to the current node
  getLocalGraphNodes(currentNodeId) {
    const connectedNodeIds = new Set([currentNodeId]);
    
    // Get current note to check its properties
    const currentNote = Array.from(this.notes.values()).find(note => note.id === currentNodeId);
    if (!currentNote) return connectedNodeIds;

    // 1. Add outgoing links (current node -> other nodes)
    if (currentNote.links) {
      currentNote.links.forEach(linkId => {
        connectedNodeIds.add(linkId);
      });
    }

    // 2. Add backlinks (other nodes -> current node)  
    if (currentNote.backlinks) {
      currentNote.backlinks.forEach(backlinkId => {
        connectedNodeIds.add(backlinkId);
      });
    }

    // 3. Add tag-based connections
    if (currentNote.frontMatter && currentNote.frontMatter.tags) {
      const currentTags = Array.isArray(currentNote.frontMatter.tags) 
        ? currentNote.frontMatter.tags 
        : [currentNote.frontMatter.tags];
      
      // Find other notes with shared tags
      this.notes.forEach((note, noteId) => {
        if (noteId === currentNodeId) return;
        
        if (note.frontMatter && note.frontMatter.tags) {
          const noteTags = Array.isArray(note.frontMatter.tags) 
            ? note.frontMatter.tags 
            : [note.frontMatter.tags];
          
          // Check for tag overlap
          const hasSharedTag = currentTags.some(tag => noteTags.includes(tag));
          if (hasSharedTag) {
            connectedNodeIds.add(noteId);
          }
        }
      });
    }

    // 4. Also check the linkGraph for additional connections
    this.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === currentNodeId) {
        connectedNodeIds.add(targetId);
      }
      if (targetId === currentNodeId) {
        connectedNodeIds.add(sourceId);
      }
    });
    
    return connectedNodeIds;
  }

  // Helper method to truncate long titles
  truncateTitle(title, maxLength) {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  // Zoom to fit functionality for mini graph
  zoomToFitMiniGraph(graphContent, width, height) {
    try {
      const bounds = graphContent.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;

      const fullWidth = width;
      const fullHeight = height;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;
      
      // Adjust scaling factor based on number of nodes - less zoom for fewer nodes
      const nodeCount = graphContent.selectAll('.node-group').size();
      let paddingFactor;
      
      if (nodeCount <= 2) {
        paddingFactor = 0.3; // Less zoom for very few nodes to avoid over-magnification
      } else if (nodeCount <= 5) {
        paddingFactor = 0.5; // Moderate zoom for small graphs
      } else {
        paddingFactor = 0.7; // More zoom for larger graphs to fit them better
      }
      
      const scale = Math.min(widthScale, heightScale) * paddingFactor;

      const translateX = (fullWidth - bounds.width * scale) / 2 - bounds.x * scale;
      const translateY = (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;

      graphContent.transition()
        .duration(250)
        .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`)
        .on('end', () => {
          // Update text sizes based on zoom level for better readability
          this.updateTextSizesForZoom(graphContent, scale, 'mini');
        });
    } catch (error) {
      console.warn('Zoom to fit failed:', error);
    }
  }
  
  // Update text sizes based on zoom level for better readability
  updateTextSizesForZoom(graphContent, zoomScale, graphType) {
    try {
      let baseFontSize;
      if (graphType === 'mini') {
        baseFontSize = 9;
      } else if (graphType === 'global') {
        baseFontSize = 11;  
      } else {
        baseFontSize = 12; // local graph
      }
      
      // Calculate adaptive font size - smaller zoom means larger font for readability
      // Use inverse relationship but with reasonable bounds
      const adaptiveFontSize = Math.max(8, Math.min(16, baseFontSize / Math.max(0.5, zoomScale)));
      
      graphContent.selectAll('text')
        .style('font-size', `${adaptiveFontSize}px`);
        
    } catch (error) {
      console.warn('Text size update failed:', error);
    }
  }

  // Zoom to fit functionality for modal graph  
  zoomToFitModalGraph(graphContent, width, height) {
    try {
      const bounds = graphContent.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;

      const fullWidth = width;
      const fullHeight = height;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;
      
      // Adjust scaling factor based on number of nodes - less zoom for fewer nodes
      const nodeCount = graphContent.selectAll('.node-group').size();
      let paddingFactor;
      
      if (nodeCount <= 2) {
        paddingFactor = 0.25; // Much less zoom for very few nodes in modal
      } else if (nodeCount <= 5) {
        paddingFactor = 0.4; // Moderate zoom for small graphs in modal
      } else {
        paddingFactor = 0.6; // More zoom for larger graphs in modal
      }
      
      const scale = Math.min(widthScale, heightScale) * paddingFactor;

      const translateX = (fullWidth - bounds.width * scale) / 2 - bounds.x * scale;
      const translateY = (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;

      graphContent.transition()
        .duration(250)
        .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`)
        .on('end', () => {
          // Update text sizes based on zoom level for better readability
          this.updateTextSizesForZoom(graphContent, scale, 'modal');
        });
    } catch (error) {
      console.warn('Modal zoom to fit failed:', error);
    }
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
      .force('collision', d3.forceCollide().radius(15))
      .alphaDecay(0.05) // Faster simulation decay
      .alphaMin(0.01);  // Lower alpha minimum for quicker end
    
    // Create links
    const links = graphContent.append('g')
      .attr('class', 'links-group')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-graph-edge)')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead-global)');
      
    console.log(`Global graph: Rendering ${this.links.length} links, ${links.size()} elements created`);
    
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
      .attr('r', d => {
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        return Math.max(5, Math.min(15, 5 + degree * 2));
      })
      .attr('fill', d => d.group === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-node)')
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', 2);
    
    nodes.append('text')
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
      .attr('dx', d => {
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        return Math.max(5, Math.min(15, 5 + degree * 2)) + 5;
      })
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
    })
    .on('mouseover', function(event, d) {
      // Enlarge hovered node
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d => {
          const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
          const baseRadius = Math.max(5, Math.min(15, 5 + degree * 2));
          return baseRadius + 2;
        });
      
      // Highlight connected edges and nodes, fade others
      graphContent.selectAll('line')
        .attr('stroke-opacity', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
        })
        .attr('marker-opacity', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
        })
        .attr('stroke', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 'var(--color-graph-highlight)' : 'var(--color-graph-edge)';
        });
      
      // Fade non-connected nodes
      graphContent.selectAll('.node-group')
        .style('opacity', node => {
          if (node.id === d.id) return 1.0; // Keep hovered node fully visible
          // Check if this node is directly connected to the hovered node
          const isDirectlyConnected = this.links.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
          });
          return isDirectlyConnected ? 1.0 : 0.2;
        });
    })
    .on('mouseout', function(event, d) {
      // Reset node size
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d => {
          const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
          return Math.max(5, Math.min(15, 5 + degree * 2));
        });
      
      // Reset edge highlighting
      graphContent.selectAll('line')
        .attr('stroke-opacity', 0.8)
        .attr('marker-opacity', 0.8)
        .attr('stroke', 'var(--color-graph-edge)');
      
      // Reset node opacity
      graphContent.selectAll('.node-group')
        .style('opacity', 1.0);
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
    
    // Use the same local graph computation as mini graph
    const connectedNodeIds = this.getLocalGraphNodes(currentNodeId);
    
    const localNodes = this.nodes.filter(node => 
      connectedNodeIds.has(node.id) && !node.id.startsWith('tag:')
    );
    const localLinks = this.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId) && 
             !sourceId.startsWith('tag:') && !targetId.startsWith('tag:');
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
      .force('collision', d3.forceCollide().radius(20))
      .alphaDecay(0.05) // Faster simulation decay
      .alphaMin(0.01);  // Lower alpha minimum for quicker end
    
    // Create links
    const links = graphContent.append('g')
      .attr('class', 'links-group')
      .selectAll('line')
      .data(localLinks)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-graph-edge)')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead-local)');
      
    console.log(`Local graph: Rendering ${localLinks.length} links, ${links.size()} elements created`);
    
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
      .attr('r', d => {
        if (d.id === currentNodeId) return 20;
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        return Math.max(8, Math.min(18, 8 + degree * 2));
      })
      .attr('fill', d => {
        if (d.id === currentNodeId) return 'var(--color-graph-highlight)';
        return d.group === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-node)';
      })
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', 3);
    
    nodes.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('dx', d => {
        const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
        return (d.id === currentNodeId ? 20 : Math.max(8, Math.min(18, 8 + degree * 2))) + 8;
      })
      .attr('dy', '.35em')
      .style('font-size', '12px')
      .style('font-weight', d => d.id === currentNodeId ? 'bold' : 'normal')
      .style('fill', d => d.id === currentNodeId ? 'var(--color-graph-highlight)' : 'var(--color-text-secondary)');
    
    nodes.on('click', (event, d) => {
      if (window.app && typeof window.app.loadNote === 'function') {
        window.app.loadNote(d.id);
        // Close modal
        const modal = document.getElementById('local-graph-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    })
    .on('mouseover', function(event, d) {
      // Enlarge hovered node
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d => {
          const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
          const baseRadius = d.id === currentNodeId ? 20 : Math.max(8, Math.min(18, 8 + degree * 2));
          return baseRadius + 2;
        });
      
      // Highlight connected edges and nodes, fade others
      graphContent.selectAll('line')
        .attr('stroke-opacity', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
        })
        .attr('marker-opacity', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 1.0 : 0.2;
        })
        .attr('stroke', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 'var(--color-graph-highlight)' : 'var(--color-graph-edge)';
        });
      
      // Fade non-connected nodes  
      graphContent.selectAll('.node-group')
        .style('opacity', node => {
          if (node.id === d.id) return 1.0; // Keep hovered node fully visible
          // Check if this node is directly connected to the hovered node
          const isDirectlyConnected = localLinks.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
          });
          return isDirectlyConnected ? 1.0 : 0.2;
        });
    })
    .on('mouseout', function(event, d) {
      // Reset node size
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d => {
          const degree = typeof d.degree === 'number' && !isNaN(d.degree) ? d.degree : 0;
          return d.id === currentNodeId ? 20 : Math.max(8, Math.min(18, 8 + degree * 2));
        });
      
      // Reset edge highlighting
      graphContent.selectAll('line')
        .attr('stroke-opacity', 0.8)
        .attr('marker-opacity', 0.8)
        .attr('stroke', 'var(--color-graph-edge)');
      
      // Reset node opacity
      graphContent.selectAll('.node-group')
        .style('opacity', 1.0);
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

    // Apply zoom-to-fit after simulation stabilizes
    simulation.on('end', () => {
      this.zoomToFitModalGraph(graphContent, width, height);
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

  // Update mini graph for current note
  updateMiniGraph(currentNodeId) {
    this.renderMiniGraph(currentNodeId);
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
