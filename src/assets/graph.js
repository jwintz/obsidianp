// Graph visualization using D3.js-like approach without external dependencies
class GraphView {
  constructor() {
    this.container = document.getElementById('graph-container');
    this.svg = null;
    this.width = 400;
    this.height = 400;
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    
    this.init();
  }
  
  init() {
    if (!this.container) return;
    
    this.createSVG();
    this.setupEventListeners();
  }
  
  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.container.appendChild(this.svg);
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.updateDimensions();
    });
  }
  
  updateDimensions() {
    if (!this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 400;
    this.height = rect.height || 400;
    
    if (this.svg) {
      this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    }
  }
  
  loadData(notes, linkGraph) {
    this.nodes = Array.from(notes.values()).map(note => ({
      id: note.id,
      title: note.title,
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: 0,
      vy: 0,
      degree: (linkGraph.get(note.id) || new Set()).size || 0
    }));
    
    this.links = [];
    linkGraph.forEach((targets, source) => {
      targets.forEach(target => {
        if (notes.has(target)) {
          this.links.push({
            source: source,
            target: target
          });
        }
      });
    });
    
    this.render();
    this.startSimulation();
  }
  
  render() {
    if (!this.svg) return;
    
    // Clear previous content
    this.svg.innerHTML = '';
    
    // Create definitions for arrow markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', 'var(--color-text-muted)');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    
    // Render links
    this.links.forEach(link => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'graph-link');
      line.setAttribute('stroke', 'var(--color-text-muted)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-opacity', '0.4');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      line.setAttribute('data-source', link.source);
      line.setAttribute('data-target', link.target);
      this.svg.appendChild(line);
    });
    
    // Render nodes
    this.nodes.forEach(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'graph-node');
      group.setAttribute('data-node-id', node.id);
      group.style.cursor = 'pointer';
      
      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const degree = node.degree || 0;
      circle.setAttribute('r', Math.max(6, Math.min(12, 6 + degree * 2)));
      circle.setAttribute('fill', 'var(--color-primary)');
      circle.setAttribute('stroke', 'var(--color-bg-primary)');
      circle.setAttribute('stroke-width', '2');
      
      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('dy', '-15');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '11px');
      text.setAttribute('fill', 'var(--color-text-primary)');
      text.setAttribute('font-family', 'var(--font-family-main)');
      text.textContent = node.title.length > 15 ? 
        node.title.substring(0, 15) + '...' : node.title;
      
      group.appendChild(circle);
      group.appendChild(text);
      
      // Add click handler
      group.addEventListener('click', () => {
        if (window.app && window.app.loadNote) {
          window.app.loadNote(node.id);
        }
      });
      
      // Add hover effects
      group.addEventListener('mouseenter', () => {
        circle.setAttribute('fill', 'var(--color-primary-hover)');
        this.highlightConnections(node.id);
      });
      
      group.addEventListener('mouseleave', () => {
        circle.setAttribute('fill', 'var(--color-primary)');
        this.clearHighlights();
      });
      
      this.svg.appendChild(group);
    });
    
    this.updatePositions();
  }
  
  highlightConnections(nodeId) {
    // Highlight connected links
    this.svg.querySelectorAll('.graph-link').forEach(link => {
      const source = link.getAttribute('data-source');
      const target = link.getAttribute('data-target');
      
      if (source === nodeId || target === nodeId) {
        link.setAttribute('stroke', 'var(--color-primary)');
        link.setAttribute('stroke-opacity', '0.8');
        link.setAttribute('stroke-width', '2');
      }
    });
    
    // Highlight connected nodes
    this.links.forEach(link => {
      if (link.source === nodeId) {
        const targetNode = this.svg.querySelector(`[data-node-id="${link.target}"]`);
        if (targetNode) {
          const circle = targetNode.querySelector('circle');
          circle.setAttribute('fill', 'var(--color-accent)');
        }
      } else if (link.target === nodeId) {
        const sourceNode = this.svg.querySelector(`[data-node-id="${link.source}"]`);
        if (sourceNode) {
          const circle = sourceNode.querySelector('circle');
          circle.setAttribute('fill', 'var(--color-accent)');
        }
      }
    });
  }
  
  clearHighlights() {
    // Reset link styles
    this.svg.querySelectorAll('.graph-link').forEach(link => {
      link.setAttribute('stroke', 'var(--color-text-muted)');
      link.setAttribute('stroke-opacity', '0.4');
      link.setAttribute('stroke-width', '1');
    });
    
    // Reset node styles
    this.svg.querySelectorAll('.graph-node circle').forEach(circle => {
      circle.setAttribute('fill', 'var(--color-primary)');
    });
  }
  
  startSimulation() {
    // Simple force simulation
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    let alpha = 1;
    const alphaDecay = 0.02;
    const minAlpha = 0.001;
    
    const tick = () => {
      // Apply forces
      this.nodes.forEach(node => {
        // Center force
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.001 * alpha;
        node.vy += dy * 0.001 * alpha;
        
        // Collision with other nodes
        this.nodes.forEach(other => {
          if (node === other) return;
          
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 50;
          
          if (distance < minDistance && distance > 0) {
            const strength = (minDistance - distance) / minDistance;
            const force = strength * 0.1 * alpha;
            
            node.vx -= (dx / distance) * force;
            node.vy -= (dy / distance) * force;
            other.vx += (dx / distance) * force;
            other.vy += (dy / distance) * force;
          }
        });
      });
      
      // Apply link forces
      this.links.forEach(link => {
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const targetDistance = 100;
          
          if (distance > 0) {
            const strength = (distance - targetDistance) / distance;
            const force = strength * 0.1 * alpha;
            
            sourceNode.vx += dx * force;
            sourceNode.vy += dy * force;
            targetNode.vx -= dx * force;
            targetNode.vy -= dy * force;
          }
        }
      });
      
      // Update positions
      this.nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        
        // Apply damping
        node.vx *= 0.9;
        node.vy *= 0.9;
        
        // Keep within bounds
        const margin = 50;
        node.x = Math.max(margin, Math.min(this.width - margin, node.x));
        node.y = Math.max(margin, Math.min(this.height - margin, node.y));
      });
      
      this.updatePositions();
      
      // Continue simulation
      alpha *= 1 - alphaDecay;
      if (alpha > minAlpha) {
        requestAnimationFrame(tick);
      }
    };
    
    requestAnimationFrame(tick);
  }
  
  updatePositions() {
    if (!this.svg) return;
    
    // Update node positions
    this.nodes.forEach(node => {
      const group = this.svg.querySelector(`[data-node-id="${node.id}"]`);
      if (group) {
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      }
    });
    
    // Update link positions
    this.links.forEach(link => {
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        const line = this.svg.querySelector(`[data-source="${link.source}"][data-target="${link.target}"]`);
        if (line) {
          line.setAttribute('x1', sourceNode.x);
          line.setAttribute('y1', sourceNode.y);
          line.setAttribute('x2', targetNode.x);
          line.setAttribute('y2', targetNode.y);
        }
      }
    });
  }
}

// Initialize graph when DOM is loaded
if (typeof window !== 'undefined') {
  window.GraphView = GraphView;
}
