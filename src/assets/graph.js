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
    this.nodeDataById = new Map();
    this.outboundMap = new Map();
    this.inboundMap = new Map();
    this.simulation = null;
    this.miniSimulation = null;
    this.localGraphSettings = this.getDefaultLocalGraphSettings();
    this.globalGraphSettings = this.getDefaultGlobalGraphSettings();
    this.localGraphControlsInitialized = false;
    this.globalGraphControlsInitialized = false;
    this.localGraphControlElements = null;
    this.globalGraphControlElements = null;
    this.currentMiniNodeId = null;
    this.currentLocalNodeId = null;
    this.currentLocalContainer = null;
    this.currentGlobalContainer = null;
    
    this.init();
  }

  getDefaultLocalGraphSettings() {
    return {
      includeOutgoing: true,
      includeBacklinks: false,
      includeNeighbors: true,
      includeTags: true,
      showArrows: true,
      depth: 1
    };
  }

  getDefaultGlobalGraphSettings() {
    return {
      includeOutgoing: true,
      includeBacklinks: true,
      includeNeighbors: false,
      includeTags: true,
      showArrows: true
    };
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
      .attr('refX', svgProperty === 'miniSvg' ? 10 : 12)
      .attr('refY', 0)
      .attr('markerWidth', svgProperty === 'miniSvg' ? 3 : 4) // Reduced from 4/8 to 3/4
      .attr('markerHeight', svgProperty === 'miniSvg' ? 3 : 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', svgProperty === 'miniSvg' ? 'M0,-3L6,0L0,3' : 'M0,-3L6,0L0,3') // Same small arrow for both
      .attr('fill', 'var(--color-graph-edge)')
      .attr('opacity', 0.7);
    
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
    this.nodeDataById.clear();
    this.outboundMap.clear();
    this.inboundMap.clear();

    const processedNodes = [];

    notes.forEach(note => {
      const degreeSource = linkGraph.get(note.id);
      const degree = degreeSource instanceof Set
        ? degreeSource.size
        : Array.isArray(degreeSource)
          ? degreeSource.length
          : 0;

      const node = {
        id: note.id,
        title: note.title || note.id,
        degree,
        group: this.categorizeNode(note)
      };

      processedNodes.push(node);
      this.nodeDataById.set(node.id, { ...node });
    });

    if (this.tags && this.tags.size > 0) {
      this.tags.forEach((tagNotes, tagName) => {
        const degree = this.getTagDegree(tagName);
        const node = {
          id: `tag:${tagName}`,
          title: `#${tagName}`,
          degree,
          group: 'tag'
        };
        processedNodes.push(node);
        this.nodeDataById.set(node.id, { ...node });
      });
    }

    this.nodes = processedNodes;

    const registerEdge = (source, target) => {
      if (!source || !target) return;
      if (!this.outboundMap.has(source)) {
        this.outboundMap.set(source, new Set());
      }
      this.outboundMap.get(source).add(target);

      if (!this.inboundMap.has(target)) {
        this.inboundMap.set(target, new Set());
      }
      this.inboundMap.get(target).add(source);
    };

    this.links = [];
    linkGraph.forEach((targets, source) => {
      if (Array.isArray(targets)) {
        targets.forEach(target => {
          if (notes.has(target)) {
            this.links.push({ source, target });
            registerEdge(source, target);
          }
        });
      } else if (targets instanceof Set) {
        targets.forEach(target => {
          if (notes.has(target)) {
            this.links.push({ source, target });
            registerEdge(source, target);
          }
        });
      }
    });

    if (this.tags && this.tags.size > 0) {
      this.tags.forEach((tagNotes, tagName) => {
        const tagId = `tag:${tagName}`;
        if (!tagNotes) return;
        if (typeof tagNotes.forEach === 'function') {
          tagNotes.forEach(noteId => {
            if (notes.has(noteId)) {
              this.links.push({ source: noteId, target: tagId });
              registerEdge(noteId, tagId);
            }
          });
        } else if (Array.isArray(tagNotes)) {
          tagNotes.forEach(noteId => {
            if (notes.has(noteId)) {
              this.links.push({ source: noteId, target: tagId });
              registerEdge(noteId, tagId);
            }
          });
        }
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

  getTagDegree(tagName) {
    const tagNotes = this.tags?.get(tagName);
    if (!tagNotes) return 1;
    if (typeof tagNotes.size === 'number') return tagNotes.size || 1;
    if (Array.isArray(tagNotes)) return tagNotes.length || 1;
    if (typeof tagNotes === 'object' && tagNotes !== null) {
      return Object.keys(tagNotes).length || 1;
    }
    return 1;
  }

  extractTags(note) {
    if (!note?.frontMatter?.tags) return [];
    const rawTags = Array.isArray(note.frontMatter.tags)
      ? note.frontMatter.tags
      : [note.frontMatter.tags];
    return rawTags
      .map(tag => (typeof tag === 'string' ? tag : `${tag}`))
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  getNodeData(nodeId) {
    if (this.nodeDataById.has(nodeId)) {
      return { ...this.nodeDataById.get(nodeId) };
    }

    const note = this.notes.get(nodeId);
    if (!note) return null;

    const linksCount = Array.isArray(note.links) ? note.links.length : 0;
    const backlinksCount = Array.isArray(note.backlinks) ? note.backlinks.length : 0;
    const node = {
      id: note.id,
      title: note.title || note.id,
      degree: linksCount + backlinksCount,
      group: this.categorizeNode(note)
    };

    this.nodeDataById.set(node.id, { ...node });
    return { ...node };
  }

  ensureGraphCanvas(containerElement) {
    if (!containerElement) return null;
    let canvas = containerElement.querySelector('.graph-canvas');
    if (!canvas) {
      canvas = document.createElement('div');
      canvas.className = 'graph-canvas';
      containerElement.appendChild(canvas);
    }
    return canvas;
  }

  initializeLocalGraphControls(containerElement) {
    if (!containerElement) return;
    
    // Check if already initialized for this container to avoid duplicate listeners
    if (this.localGraphControlsInitialized && this.localGraphControlElements) {
      return;
    }
    
    const panel = containerElement.querySelector('#local-graph-parameters');
    if (!panel) return;

    const elements = {
      panel,
      linksToggle: panel.querySelector('#local-graph-links-toggle'),
      backlinksToggle: panel.querySelector('#local-graph-backlinks-toggle'),
      neighborsToggle: panel.querySelector('#local-graph-neighbors-toggle'),
      tagsToggle: panel.querySelector('#local-graph-tags-toggle'),
      arrowsToggle: panel.querySelector('#local-graph-arrows-toggle'),
      depthInput: panel.querySelector('#local-graph-depth'),
      depthValue: panel.querySelector('#local-graph-depth-value'),
      resetButton: panel.querySelector('#local-graph-reset')
    };

    this.localGraphControlElements = elements;

    const handleChange = () => {
      if (elements.linksToggle) {
        this.localGraphSettings.includeOutgoing = !!elements.linksToggle.checked;
      }
      if (elements.backlinksToggle) {
        this.localGraphSettings.includeBacklinks = !!elements.backlinksToggle.checked;
      }
      if (elements.neighborsToggle) {
        this.localGraphSettings.includeNeighbors = !!elements.neighborsToggle.checked;
      }
      if (elements.tagsToggle) {
        this.localGraphSettings.includeTags = !!elements.tagsToggle.checked;
      }
      if (elements.arrowsToggle) {
        this.localGraphSettings.showArrows = !!elements.arrowsToggle.checked;
      }
      if (elements.depthInput) {
        const depthValue = parseInt(elements.depthInput.value, 10);
        this.localGraphSettings.depth = Number.isNaN(depthValue) ? 1 : Math.max(1, Math.min(5, depthValue));
      }
      this.applyLocalGraphSettingsChange();
    };

    if (elements.linksToggle) {
      elements.linksToggle.addEventListener('change', handleChange);
    }
    if (elements.backlinksToggle) {
      elements.backlinksToggle.addEventListener('change', handleChange);
    }
    if (elements.neighborsToggle) {
      elements.neighborsToggle.addEventListener('change', handleChange);
    }
    if (elements.tagsToggle) {
      elements.tagsToggle.addEventListener('change', handleChange);
    }
    if (elements.arrowsToggle) {
      elements.arrowsToggle.addEventListener('change', handleChange);
    }
    if (elements.depthInput) {
      elements.depthInput.addEventListener('input', () => {
        if (elements.depthValue) {
          elements.depthValue.textContent = elements.depthInput.value;
        }
        elements.depthInput.setAttribute('aria-valuenow', elements.depthInput.value);
      });
      elements.depthInput.addEventListener('change', handleChange);
    }
    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        this.localGraphSettings = this.getDefaultLocalGraphSettings();
        this.syncLocalGraphControls(containerElement);
        this.applyLocalGraphSettingsChange();
      });
    }

    // Always mark as initialized after setting up controls
    this.localGraphControlsInitialized = true;
  }

  syncLocalGraphControls(containerElement) {
    if (!containerElement || !this.localGraphControlElements) return;
    const elements = this.localGraphControlElements;
    const settings = this.localGraphSettings;

    if (elements.linksToggle) {
      elements.linksToggle.checked = settings.includeOutgoing;
    }
    if (elements.backlinksToggle) {
      elements.backlinksToggle.checked = settings.includeBacklinks;
    }
    if (elements.neighborsToggle) {
      elements.neighborsToggle.checked = settings.includeNeighbors;
    }
    if (elements.tagsToggle) {
      elements.tagsToggle.checked = settings.includeTags;
    }
    if (elements.arrowsToggle) {
      elements.arrowsToggle.checked = settings.showArrows !== false;
    }
    if (elements.depthInput) {
      elements.depthInput.value = `${settings.depth}`;
      if (elements.depthValue) {
        elements.depthValue.textContent = `${settings.depth}`;
      }
      elements.depthInput.setAttribute('aria-valuenow', `${settings.depth}`);
    }
  }

  applyLocalGraphSettingsChange() {
    if (this.currentLocalContainer && this.currentLocalNodeId) {
      this.renderLocalGraph(this.currentLocalContainer, this.currentLocalNodeId);
    }
    if (this.currentMiniNodeId) {
      this.renderMiniGraph(this.currentMiniNodeId);
    }
  }

  initializeGlobalGraphControls(containerElement) {
    if (!containerElement) return;
    
    // Check if already initialized to avoid duplicate listeners
    if (this.globalGraphControlsInitialized && this.globalGraphControlElements) {
      return;
    }

    const panel = containerElement.querySelector('.graph-parameter-panel--global');
    if (!panel) return;

    const elements = {
      panel,
      linksToggle: panel.querySelector('#global-graph-links-toggle'),
      backlinksToggle: panel.querySelector('#global-graph-backlinks-toggle'),
      neighborsToggle: panel.querySelector('#global-graph-neighbors-toggle'),
      tagsToggle: panel.querySelector('#global-graph-tags-toggle'),
      arrowsToggle: panel.querySelector('#global-graph-arrows-toggle'),
      resetButton: panel.querySelector('#global-graph-reset')
    };

    this.globalGraphControlElements = elements;

    const handleChange = () => {
      if (elements.linksToggle) {
        this.globalGraphSettings.includeOutgoing = !!elements.linksToggle.checked;
      }
      if (elements.backlinksToggle) {
        this.globalGraphSettings.includeBacklinks = !!elements.backlinksToggle.checked;
      }
      if (elements.neighborsToggle) {
        this.globalGraphSettings.includeNeighbors = !!elements.neighborsToggle.checked;
      }
      if (elements.tagsToggle) {
        this.globalGraphSettings.includeTags = !!elements.tagsToggle.checked;
      }
      if (elements.arrowsToggle) {
        this.globalGraphSettings.showArrows = !!elements.arrowsToggle.checked;
      }
      this.applyGlobalGraphSettingsChange();
    };

    if (elements.linksToggle) {
      elements.linksToggle.addEventListener('change', handleChange);
    }
    if (elements.backlinksToggle) {
      elements.backlinksToggle.addEventListener('change', handleChange);
    }
    if (elements.neighborsToggle) {
      elements.neighborsToggle.addEventListener('change', handleChange);
    }
    if (elements.tagsToggle) {
      elements.tagsToggle.addEventListener('change', handleChange);
    }
    if (elements.arrowsToggle) {
      elements.arrowsToggle.addEventListener('change', handleChange);
    }
    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        this.globalGraphSettings = this.getDefaultGlobalGraphSettings();
        this.syncGlobalGraphControls(containerElement);
        this.applyGlobalGraphSettingsChange();
      });
    }

    this.globalGraphControlsInitialized = true;
  }

  syncGlobalGraphControls(containerElement) {
    if (!containerElement || !this.globalGraphControlElements) return;
    const elements = this.globalGraphControlElements;
    const settings = this.globalGraphSettings;

    if (elements.linksToggle) {
      elements.linksToggle.checked = settings.includeOutgoing !== false;
    }
    if (elements.backlinksToggle) {
      elements.backlinksToggle.checked = settings.includeBacklinks !== false;
    }
    if (elements.neighborsToggle) {
      elements.neighborsToggle.checked = settings.includeNeighbors !== false;
    }
    if (elements.tagsToggle) {
      elements.tagsToggle.checked = settings.includeTags !== false;
    }
    if (elements.arrowsToggle) {
      elements.arrowsToggle.checked = settings.showArrows !== false;
    }
  }

  applyGlobalGraphSettingsChange() {
    if (this.currentGlobalContainer) {
      this.renderGlobalGraph(this.currentGlobalContainer);
    }
  }
  
  renderMiniGraph(currentNodeId = null) {
    if (!this.miniSvg) return;

    this.currentMiniNodeId = currentNodeId;

    let nodesToRender = [];
    let linksToRender = [];

    if (currentNodeId && this.notes.has(currentNodeId)) {
      const subgraph = this.computeLocalGraph(currentNodeId);
      nodesToRender = subgraph.nodes.map(node => ({ ...node }));
      linksToRender = subgraph.links.map(link => ({ ...link }));
    }

    const graphContent = this.miniSvg.select('.graph-content');
    graphContent.selectAll('*').remove();

    if (!currentNodeId || nodesToRender.length === 0) {
      return;
    }

    const containerRect = this.miniContainer?.getBoundingClientRect() || { width: 280, height: 200 };
    const width = containerRect.width || 280;
    const height = containerRect.height || 200;

    this.miniSvg.attr('viewBox', `0 0 ${width} ${height}`);

    const showArrows = this.localGraphSettings.showArrows !== false;

    const edgeColor = edge => {
      if (edge.type === 'neighbor') return 'var(--color-primary)';
      if (edge.type === 'tag') return 'var(--color-graph-tag)';
      return 'var(--color-graph-edge)';
    };

    const edgeOpacity = edge => edge.type === 'tag' ? 0.6 : 0.9;
    const edgeWidth = edge => edge.type === 'neighbor' ? 2.5 : 2;
    const edgeDashArray = edge => edge.type === 'neighbor' ? '5 3' : null;
    const edgeMarker = edge => (showArrows && edge.type !== 'tag' ? 'url(#arrowhead-mini)' : null);

    const radiusForNode = node => {
      if (currentNodeId && node.id === currentNodeId) return 9;
      const degree = typeof node.degree === 'number' && !Number.isNaN(node.degree) ? node.degree : 0;
      const base = Math.max(3, Math.min(9, 3 + degree));
      return node.id.startsWith('tag:') ? Math.max(2, base - 2) : base;
    };

    this.miniSimulation = d3.forceSimulation(nodesToRender)
      .force('link', d3.forceLink(linksToRender).id(d => d.id).distance(30))
      .force('charge', d3.forceManyBody().strength(-55))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => radiusForNode(d) + 3))
      .alphaDecay(0.06)
      .alphaMin(0.02);

    const links = graphContent.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linksToRender)
      .enter()
      .append('line')
      .attr('class', d => `graph-link graph-link-${d.type || 'default'}`)
      .attr('stroke', edgeColor)
      .attr('stroke-opacity', edgeOpacity)
      .attr('stroke-width', edgeWidth)
      .attr('stroke-dasharray', edgeDashArray)
      .attr('marker-end', edgeMarker);

    const nodes = graphContent.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesToRender)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', d => d.id.startsWith('tag:') ? 'default' : 'pointer')
      .on('click', (event, d) => {
        if (d.id.startsWith('tag:')) return;
        if (window.app && typeof window.app.loadNote === 'function') {
          window.app.loadNote(d.id);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('circle')
          .transition().duration(180)
          .attr('r', radiusForNode(d) + 1.5);

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
            return (sourceId === d.id || targetId === d.id) ? 'var(--color-graph-highlight)' : edgeColor(edge);
          });

        graphContent.selectAll('.node-group')
          .style('opacity', node => {
            if (node.id === d.id) return 1.0;
            const isDirectlyConnected = linksToRender.some(link => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
            });
            return isDirectlyConnected ? 1.0 : 0.2;
          });
      })
      .on('mouseout', () => {
        graphContent.selectAll('.links line')
          .attr('stroke', edgeColor)
          .attr('stroke-dasharray', edgeDashArray)
          .attr('marker-end', edgeMarker)
          .attr('stroke-width', edgeWidth)
          .attr('stroke-opacity', edgeOpacity)
          .attr('marker-opacity', 0.8);

        graphContent.selectAll('.node-group')
          .style('opacity', 1.0)
          .select('circle')
          .transition().duration(180)
          .attr('r', d => radiusForNode(d));
      });

    nodes.append('circle')
      .attr('r', d => radiusForNode(d))
      .attr('fill', d => {
        if (currentNodeId && d.id === currentNodeId) {
          return 'var(--color-graph-highlight)';
        }
        return d.group === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-node)';
      })
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', d => (currentNodeId && d.id === currentNodeId ? 2 : 1));

    nodes.append('text')
      .text(d => this.truncateTitle(d.title, 12))
      .attr('dx', d => radiusForNode(d) + 4)
      .attr('dy', '.35em')
      .style('font-size', '9px')
      .style('font-weight', d => (currentNodeId && d.id === currentNodeId ? '600' : '400'))
      .style('fill', 'var(--color-text-secondary)')
      .style('pointer-events', 'none');

    nodes.append('title').text(d => d.title);

    this.miniSimulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.miniSimulation.on('end', () => {
      this.zoomToFitMiniGraph(graphContent, width, height);
    });
  }

  computeLocalGraph(currentNodeId) {
    if (!currentNodeId || !this.notes.has(currentNodeId)) {
      return { nodes: [], links: [], depthMap: new Map(), nodeSet: new Set() };
    }

    const settings = this.localGraphSettings;
    const depthMap = new Map();
    depthMap.set(currentNodeId, 0);

    const parentMap = new Map();
    const queue = [{ id: currentNodeId, depth: 0 }];

    const enqueue = (nodeId, depth, parentId, via) => {
      const existingDepth = depthMap.get(nodeId);
      if (existingDepth === undefined || existingDepth > depth) {
        depthMap.set(nodeId, depth);
        queue.push({ id: nodeId, depth });
        if (parentId) {
          parentMap.set(nodeId, { parentId, via });
        }
      }
    };

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depth >= settings.depth) continue;

      const note = this.notes.get(id);
      if (!note) continue;

      const nextDepth = depth + 1;

      if (settings.includeOutgoing && Array.isArray(note.links)) {
        note.links.forEach(targetId => {
          if (!this.notes.has(targetId)) {
            // Try to find with case-insensitive match
            const lowerTargetId = targetId.toLowerCase();
            const matchingId = Array.from(this.notes.keys()).find(noteId => 
              noteId.toLowerCase() === lowerTargetId || 
              noteId.toLowerCase().replace(/-/g, '') === lowerTargetId.replace(/\//g, '')
            );
            if (matchingId) {
              enqueue(matchingId, nextDepth, id, 'outgoing');
              return;
            }
            return;
          }
          if (targetId === id) return;
          enqueue(targetId, nextDepth, id, 'outgoing');
        });
      }

      if (settings.includeBacklinks && Array.isArray(note.backlinks)) {
        note.backlinks.forEach(sourceId => {
          if (!this.notes.has(sourceId) || sourceId === id) return;
          enqueue(sourceId, nextDepth, id, 'backlink');
        });
      }
    }

    const noteIdSet = new Set(depthMap.keys());

    const ensureNoteDepth = (nodeId, depth) => {
      if (!this.notes.has(nodeId)) return false;
      const existingDepth = depthMap.get(nodeId);
      if (existingDepth === undefined || existingDepth > depth) {
        depthMap.set(nodeId, depth);
        noteIdSet.add(nodeId);
        return true;
      }
      return existingDepth !== undefined;
    };

    const links = [];
    const linkKeySet = new Set();
    const tagNodes = new Map();

    const addLink = (sourceId, targetId, type, { undirected = false } = {}) => {
      if (!sourceId || !targetId) return;
      if (type !== 'tag') {
        if (!noteIdSet.has(sourceId) || !noteIdSet.has(targetId)) {
          return;
        }
      }

      const key = undirected
        ? `${[sourceId, targetId].sort().join('|')}|${type}`
        : `${sourceId}|${targetId}|${type}`;
      if (linkKeySet.has(key)) return;
      linkKeySet.add(key);
      links.push({ source: sourceId, target: targetId, type });
    };

    parentMap.forEach((info, childId) => {
      if (!info?.parentId) return;
      if (!noteIdSet.has(info.parentId) || !noteIdSet.has(childId)) return;

      if (info.via === 'outgoing') {
        addLink(info.parentId, childId, 'tree');
      } else {
        addLink(childId, info.parentId, 'tree');
      }
    });

    if (settings.includeNeighbors) {
      const baseIds = Array.from(noteIdSet);
      baseIds.forEach(baseId => {
        const baseDepth = depthMap.get(baseId) ?? 0;
        if (baseDepth >= settings.depth) return;

        const neighborDepth = baseDepth + 1;
        if (neighborDepth > settings.depth) return;

        const neighborCandidates = new Set();

        const outboundTargets = this.outboundMap.get(baseId);
        outboundTargets?.forEach(targetId => {
          const inboundSources = this.inboundMap.get(targetId);
          inboundSources?.forEach(sourceId => {
            if (sourceId !== baseId) {
              neighborCandidates.add(sourceId);
            }
          });
        });

        const inboundSources = this.inboundMap.get(baseId);
        inboundSources?.forEach(sourceId => {
          if (sourceId !== baseId) {
            neighborCandidates.add(sourceId);
          }
          const sourceTargets = this.outboundMap.get(sourceId);
          sourceTargets?.forEach(targetId => {
            if (targetId !== baseId) {
              neighborCandidates.add(targetId);
            }
          });
        });

        neighborCandidates.forEach(candidateId => {
          if (!this.notes.has(candidateId)) return;
          if (neighborDepth > settings.depth) return;
          ensureNoteDepth(candidateId, neighborDepth);
          addLink(baseId, candidateId, 'neighbor', { undirected: true });
        });
      });
    }

    const noteIds = Array.from(noteIdSet);

    const nodes = noteIds
      .map(noteId => {
        const nodeData = this.getNodeData(noteId);
        if (!nodeData) return null;
        return { ...nodeData, depth: depthMap.get(noteId) ?? 0 };
      })
      .filter(Boolean);

    if (settings.includeTags) {
      noteIds.forEach(noteId => {
        const note = this.notes.get(noteId);
        if (!note) return;
        const noteTags = this.extractTags(note);
        noteTags.forEach(tagName => {
          const tagId = `tag:${tagName}`;
          if (!tagNodes.has(tagId)) {
            const baseTagData = this.nodeDataById.has(tagId)
              ? { ...this.nodeDataById.get(tagId) }
              : {
                  id: tagId,
                  title: `#${tagName}`,
                  degree: this.getTagDegree(tagName),
                  group: 'tag'
                };
            tagNodes.set(tagId, baseTagData);
          }
          addLink(noteId, tagId, 'tag');
        });
      });
    }

    const tagNodeValues = Array.from(tagNodes.values());
    const allNodes = [...nodes, ...tagNodeValues];
    const allNodeIds = new Set(allNodes.map(node => node.id));
    const filteredLinks = links.filter(link => allNodeIds.has(link.source) && allNodeIds.has(link.target));

    return {
      nodes: allNodes,
      links: filteredLinks,
      depthMap,
      nodeSet: allNodeIds
    };
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

  zoomToFitGlobalGraph(graphContent, width, height) {
    try {
      const bounds = graphContent.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;

      const fullWidth = width;
      const fullHeight = height;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;

      const nodeCount = graphContent.selectAll('.node-group').size();
      let paddingFactor;

      if (nodeCount <= 25) {
        paddingFactor = 0.65;
      } else if (nodeCount <= 75) {
        paddingFactor = 0.75;
      } else {
        paddingFactor = 0.85;
      }

      const scale = Math.min(widthScale, heightScale) * paddingFactor;

      const translateX = (fullWidth - bounds.width * scale) / 2 - bounds.x * scale;
      const translateY = (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;

      graphContent.transition()
        .duration(350)
        .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`)
        .on('end', () => {
          this.updateTextSizesForZoom(graphContent, scale, 'global');
        });
    } catch (error) {
      console.warn('Global zoom to fit failed:', error);
    }
  }
  
  renderGlobalGraph(containerElement) {
    if (!containerElement || !d3) return;

    this.currentGlobalContainer = containerElement;

    this.initializeGlobalGraphControls(containerElement);
    this.syncGlobalGraphControls(containerElement);

    const canvasElement = this.ensureGraphCanvas(containerElement) || containerElement;
    const canvasSelection = d3.select(canvasElement);
    canvasSelection.selectAll('*').remove();

    const settings = this.globalGraphSettings;
    const includeTags = settings.includeTags !== false;
    const showArrows = settings.showArrows !== false;

    // Filter nodes based on settings
    let filteredNodes = [...this.nodes];
    if (!includeTags) {
      filteredNodes = filteredNodes.filter(node => !node.id.startsWith('tag:'));
    }

    // Create a comprehensive filtered graph based on global settings
    const nodeIdSet = new Set(filteredNodes.map(node => node.id));
    let filteredLinks = [];

    // Add links based on settings
    this.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      // Skip if nodes aren't in our filtered set
      if (!nodeIdSet.has(sourceId) || !nodeIdSet.has(targetId)) return;
      
      // Determine link type and whether to include it
      const isTagLink = sourceId.startsWith('tag:') || targetId.startsWith('tag:');
      if (isTagLink && !includeTags) return;
      
      // For non-tag links, check if we should include based on settings
      if (!isTagLink) {
        const isOutgoingEnabled = settings.includeOutgoing !== false;
        const isBacklinksEnabled = settings.includeBacklinks !== false;
        
        // If both are disabled, skip all links
        if (!isOutgoingEnabled && !isBacklinksEnabled) return;
        
        // If only one direction is enabled, we still show the link
        // (In a global graph, link direction isn't always clear without a focal node)
        // So if either is enabled, show the link
        
        filteredLinks.push({
          source: sourceId,
          target: targetId,
          type: 'note'
        });
      } else {
        // Tag links
        filteredLinks.push({
          source: sourceId,
          target: targetId,
          type: 'tag'
        });
      }
    });

    const globalNodes = filteredNodes.map(node => ({ ...node }));
    const globalLinks = filteredLinks;

    if (!globalNodes.length) {
      canvasSelection.append('div')
        .attr('class', 'graph-empty-state')
        .text('No nodes match the current global graph filters.');
      return;
    }

    const rect = canvasElement.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = rect.height || 700;

    const svg = canvasSelection.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const zoom = d3.zoom()
      .scaleExtent([0.05, 6])
      .on('zoom', event => {
        graphContent.attr('transform', event.transform);
        
        // Adaptive label sizing based on zoom
        const scale = event.transform.k;
        graphContent.selectAll('.node-group text')
          .style('font-size', `${Math.max(7, Math.min(12, 9 / scale))}px`)
          .style('opacity', d => {
            // Show labels based on zoom level and node importance
            const degree = d.degree || 0;
            if (scale > 1.5) return 0.9; // Show all labels when zoomed in
            if (scale > 0.8) return degree >= 2 ? 0.7 : 0; // Show connected nodes at medium zoom
            return degree >= 4 ? 0.6 : 0; // Only major nodes when zoomed out
          });
      });

    svg.call(zoom);

    const graphContent = svg.append('g').attr('class', 'graph-content');

    const defs = svg.append('defs');
    const arrowMarker = defs.append('marker')
      .attr('id', 'arrowhead-global')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15) // Position to clear nodes
      .attr('refY', 0)
      .attr('markerWidth', 6) // Bigger for visibility
      .attr('markerHeight', 6)
      .attr('orient', 'auto');

    arrowMarker.append('path')
      .attr('d', 'M0,-5L10,0L0,5') // Visible arrow
      .attr('fill', 'var(--color-graph-edge)')
      .attr('fill-opacity', 0.6);

    const radiusForNode = node => {
      const degree = typeof node.degree === 'number' && !Number.isNaN(node.degree) ? node.degree : 0;
      // Smaller, more consistent node sizes like Obsidian
      const base = Math.max(4, Math.min(10, 4 + Math.sqrt(degree) * 1.5));
      return node.group === 'tag' ? Math.max(3, base - 2) : base;
    };

    const edgeColor = edge => edge.type === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-edge)';
    const edgeOpacity = edge => edge.type === 'tag' ? 0.4 : 0.5;
    const edgeWidth = edge => edge.type === 'tag' ? 0.8 : 1;
    const edgeDashArray = edge => edge.type === 'tag' ? '2 2' : null;
    const edgeMarker = edge => (showArrows && edge.type !== 'tag' ? 'url(#arrowhead-global)' : null);

    // Obsidian-style force simulation - more organic and brain-like
    const simulation = d3.forceSimulation(globalNodes)
      .force('link', d3.forceLink(globalLinks)
        .id(d => d.id)
        .distance(d => {
          // Vary link distance for more organic layout
          const sourceNode = globalNodes.find(n => n.id === (d.source.id || d.source));
          const targetNode = globalNodes.find(n => n.id === (d.target.id || d.target));
          const avgDegree = ((sourceNode?.degree || 0) + (targetNode?.degree || 0)) / 2;
          return 50 + avgDegree * 3; // Distance increases with connectivity
        })
        .strength(0.3))
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Stronger repulsion for highly connected nodes creates clustering
          const degree = d.degree || 0;
          return -120 - degree * 8;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide()
        .radius(d => radiusForNode(d) + 10)
        .strength(0.7))
      // Add radial force for circular layout
      .force('radial', d3.forceRadial(
        d => {
          const degree = d.degree || 0;
          // More connected nodes closer to center
          return Math.max(80, Math.min(300, 250 - degree * 10));
        },
        width / 2,
        height / 2
      ).strength(0.1))
      .alphaDecay(0.02) // Slower settling for organic movement
      .alphaMin(0.001)
      .velocityDecay(0.3); // Lower velocity decay for smoother movement

    const links = graphContent.append('g')
      .attr('class', 'links-group')
      .selectAll('line')
      .data(globalLinks)
      .enter()
      .append('line')
      .attr('class', d => `graph-link graph-link-${d.type}`)
      .attr('stroke', edgeColor)
      .attr('stroke-opacity', edgeOpacity)
      .attr('stroke-width', edgeWidth)
      .attr('stroke-dasharray', edgeDashArray)
      .attr('marker-end', edgeMarker);

    const nodes = graphContent.append('g')
      .selectAll('g')
      .data(globalNodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', d => d.id.startsWith('tag:') ? 'default' : 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    nodes.append('circle')
      .attr('r', d => radiusForNode(d))
      .attr('fill', d => {
        // Only tags have color (green), all other nodes are gray
        if (d.group === 'tag' || d.id.startsWith('tag:')) return 'var(--color-graph-tag)';
        return 'var(--color-graph-node)';
      })
      .attr('fill-opacity', 0.9)
      .attr('stroke', d => {
        // Lighter stroke for better visibility
        if (d.group === 'tag' || d.id.startsWith('tag:')) return 'var(--color-graph-tag)';
        return 'var(--color-graph-node)';
      })
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8);

    // Only show labels on hover or for important nodes
    nodes.append('text')
      .text(d => {
        // Show labels only for highly connected nodes
        const degree = d.degree || 0;
        if (degree < 3 && !d.id.startsWith('tag:')) return '';
        return d.title.length > 15 ? `${d.title.substring(0, 15)}…` : d.title;
      })
      .attr('dx', d => radiusForNode(d) + 6)
      .attr('dy', '.35em')
      .style('font-size', '9px')
      .style('fill', 'var(--color-text-secondary)')
      .style('opacity', 0.7)
      .style('pointer-events', 'none');

    nodes.append('title').text(d => d.title);

    nodes.on('click', (event, d) => {
      if (d.id.startsWith('tag:')) return;
      if (window.app && typeof window.app.loadNote === 'function') {
        window.app.loadNote(d.id);
        const modal = document.getElementById('global-graph-modal');
        if (modal) {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }
      }
    })
    .on('mouseover', function(event, d) {
      // Show label on hover
      d3.select(this).select('text')
        .text(d.title.length > 20 ? `${d.title.substring(0, 20)}…` : d.title)
        .style('opacity', 1)
        .style('font-size', '10px')
        .style('font-weight', '500');
      
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', radiusForNode(d) * 1.3)
        .attr('stroke-width', 2.5)
        .attr('fill-opacity', 1);

      // Highlight connected edges
      graphContent.selectAll('.links-group line')
        .attr('stroke-opacity', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 0.9 : 0.1;
        })
        .attr('stroke-width', edge => {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return (sourceId === d.id || targetId === d.id) ? 2 : edgeWidth(edge);
        });

      // Highlight connected nodes
      graphContent.selectAll('.node-group')
        .style('opacity', node => {
          if (node.id === d.id) return 1.0;
          const isConnected = globalLinks.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
          });
          return isConnected ? 1.0 : 0.15;
        });
    })
    .on('mouseout', function(event, d) {
      // Hide label unless it's a major node
      const degree = d.degree || 0;
      d3.select(this).select('text')
        .text(degree >= 3 || d.id.startsWith('tag:') 
          ? (d.title.length > 15 ? `${d.title.substring(0, 15)}…` : d.title)
          : '')
        .style('opacity', 0.7)
        .style('font-size', '9px')
        .style('font-weight', 'normal');
      
      graphContent.selectAll('.links-group line')
        .attr('stroke', edgeColor)
        .attr('stroke-opacity', edgeOpacity)
        .attr('stroke-dasharray', edgeDashArray)
        .attr('stroke-width', edgeWidth)
        .attr('marker-end', edgeMarker);

      graphContent.selectAll('.node-group')
        .style('opacity', 1.0)
        .select('circle')
        .transition().duration(150)
        .attr('r', d => radiusForNode(d))
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.9);
    });

    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // No zoom-to-fit animation - let graph settle naturally

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.1).restart(); // Reduced from 0.3 for smoother animation
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

    this.currentLocalContainer = containerElement;
    this.currentLocalNodeId = currentNodeId;
    this.currentMiniNodeId = currentNodeId;

    this.initializeLocalGraphControls(containerElement);
    this.syncLocalGraphControls(containerElement);

    const canvasElement = this.ensureGraphCanvas(containerElement) || containerElement;
    const canvasSelection = d3.select(canvasElement);
    canvasSelection.selectAll('*').remove();

    const { nodes: localNodes, links: localLinks } = this.computeLocalGraph(currentNodeId);

    if (!localNodes.length) {
      canvasSelection.append('div')
        .attr('class', 'graph-empty-state')
        .text('No connected notes for the selected options.');
      return;
    }

    const rect = canvasElement.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = rect.height || 700;

    const svg = canvasSelection.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graphContent.attr('transform', event.transform);
      });

    svg.call(zoom);

    const graphContent = svg.append('g').attr('class', 'graph-content');

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead-local')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6) // Visible size
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5') // Standard arrow
      .attr('fill', 'var(--color-graph-edge)')
      .attr('fill-opacity', 0.6);

    const showArrows = this.localGraphSettings.showArrows !== false;

    const radiusForNode = node => {
      if (node.id === currentNodeId) return 12; // Central node slightly larger but not huge
      const degree = typeof node.degree === 'number' && !Number.isNaN(node.degree) ? node.degree : 0;
      // Better scaling: logarithmic for large degrees
      const base = Math.max(4, Math.min(8, 4 + Math.log(degree + 1) * 2));
      return node.id.startsWith('tag:') ? Math.max(3, base - 1) : base;
    };

    const edgeColor = edge => {
      if (edge.type === 'neighbor') return 'var(--color-primary)';
      if (edge.type === 'tag') return 'var(--color-graph-tag)';
      return 'var(--color-graph-edge)';
    };

    const edgeOpacity = edge => edge.type === 'tag' ? 0.4 : 0.6;
    const edgeWidth = edge => {
      if (edge.type === 'neighbor') return 1.5;
      if (edge.type === 'tag') return 1;
      return 1.2;
    };
    const edgeDashArray = edge => {
      if (edge.type === 'neighbor') return '4 3';
      if (edge.type === 'tag') return '2 2';
      return null;
    };
    const edgeMarker = edge => (showArrows && edge.type !== 'tag' ? 'url(#arrowhead-local)' : null);

    // Better force simulation with collision detection
    const simulation = d3.forceSimulation(localNodes)
      .force('link', d3.forceLink(localLinks)
        .id(d => d.id)
        .distance(d => {
          // Adaptive link distance based on node types
          const source = localNodes.find(n => n.id === (d.source.id || d.source));
          const target = localNodes.find(n => n.id === (d.target.id || d.target));
          if (d.type === 'tag') return 40;
          if (source?.id === currentNodeId || target?.id === currentNodeId) return 60;
          return 50;
        })
        .strength(0.5))
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Less repulsion for a tighter layout
          if (d.id === currentNodeId) return -200;
          return -80;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => radiusForNode(d) + 20) // More spacing between nodes
        .strength(0.8))
      .alphaDecay(0.02) // Slower settling
      .alphaMin(0.001);

    const links = graphContent.append('g')
      .attr('class', 'links-group')
      .selectAll('line')
      .data(localLinks)
      .enter()
      .append('line')
      .attr('class', d => `graph-link graph-link-${d.type || 'default'}`)
      .attr('stroke', edgeColor)
      .attr('stroke-opacity', edgeOpacity)
      .attr('stroke-width', edgeWidth)
      .attr('stroke-dasharray', edgeDashArray)
      .attr('marker-end', edgeMarker);

    const nodes = graphContent.append('g')
      .selectAll('g')
      .data(localNodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', d => d.id.startsWith('tag:') ? 'default' : 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    nodes.append('circle')
      .attr('r', d => radiusForNode(d))
      .attr('fill', d => {
        if (d.id === currentNodeId) return 'var(--color-graph-highlight)';
        return d.group === 'tag' ? 'var(--color-graph-tag)' : 'var(--color-graph-node)';
      })
      .attr('stroke', 'var(--color-bg-primary)')
      .attr('stroke-width', d => (d.id === currentNodeId ? 3 : 1.5));

    // Smart label rendering
    nodes.append('text')
      .text(d => {
        if (d.id === currentNodeId) {
          return d.title.length > 20 ? `${d.title.substring(0, 20)}…` : d.title;
        }
        const degree = d.degree || 0;
        if (degree >= 3) {
          return d.title.length > 18 ? `${d.title.substring(0, 18)}…` : d.title;
        }
        return '';
      })
      .attr('dx', d => radiusForNode(d) + 6)
      .attr('dy', '.35em')
      .style('font-size', d => d.id === currentNodeId ? '11px' : '9px')
      .style('font-weight', d => d.id === currentNodeId ? '600' : 'normal')
      .style('fill', 'var(--color-text-secondary)')
      .style('pointer-events', 'none');

    nodes.append('title').text(d => d.title);

    nodes.on('click', (event, d) => {
      if (d.id.startsWith('tag:')) return;
      if (window.app && typeof window.app.loadNote === 'function') {
        window.app.loadNote(d.id);
        const modal = document.getElementById('local-graph-modal');
        if (modal) {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }
      }
    })
    .on('mouseover', function(event, d) {
      // Show label on hover
      d3.select(this).select('text')
        .text(d.title.length > 20 ? `${d.title.substring(0, 20)}…` : d.title)
        .style('font-size', '10px')
        .style('font-weight', '500');
      
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', radiusForNode(d) + 2)
        .attr('stroke-width', d.id === currentNodeId ? 4 : 2.5);

      graphContent.selectAll('.links-group line')
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
          return (sourceId === d.id || targetId === d.id) ? 'var(--color-graph-highlight)' : edgeColor(edge);
        });

      graphContent.selectAll('.node-group')
        .style('opacity', node => {
          if (node.id === d.id) return 1.0;
          const isDirectlyConnected = localLinks.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === d.id && targetId === node.id) || (targetId === d.id && sourceId === node.id);
          });
          return isDirectlyConnected ? 1.0 : 0.2;
        });
    })
    .on('mouseout', function(event, d) {
      // Hide label unless it's a major node or current node
      const degree = d.degree || 0;
      d3.select(this).select('text')
        .text(() => {
          if (d.id === currentNodeId) {
            return d.title.length > 20 ? `${d.title.substring(0, 20)}…` : d.title;
          }
          if (degree >= 3) {
            return d.title.length > 18 ? `${d.title.substring(0, 18)}…` : d.title;
          }
          return '';
        })
        .style('font-size', d.id === currentNodeId ? '11px' : '9px')
        .style('font-weight', d.id === currentNodeId ? '600' : 'normal');
      
      graphContent.selectAll('.links-group line')
        .attr('stroke', edgeColor)
        .attr('stroke-dasharray', edgeDashArray)
        .attr('marker-end', edgeMarker)
        .attr('stroke-width', edgeWidth)
        .attr('stroke-opacity', edgeOpacity)
        .attr('marker-opacity', 0.8);

      graphContent.selectAll('.node-group')
        .style('opacity', 1.0)
        .select('circle')
        .transition().duration(150)
        .attr('r', d => radiusForNode(d))
        .attr('stroke-width', d => d.id === currentNodeId ? 3 : 1.5);
    });

    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    simulation.on('end', () => {
      this.zoomToFitModalGraph(graphContent, width, height);
    });

    const self = this;

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
      if (self.miniSimulation) {
        self.miniSimulation.alphaTarget(0);
      }
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
