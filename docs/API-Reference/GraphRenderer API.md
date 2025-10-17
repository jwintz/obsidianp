---
description: Complete API reference for the GraphRenderer class
tags:
  - api
  - graph
  - visualization
  - d3js
  - typescript
  - reference
type: api-reference
category: api
audience: developers
difficulty: advanced
estimated_time: 35 minutes
last_updated: 2025-10-17
related_components:
  - VaultProcessor
related_features:
  - Interactive Graph Views
technologies:
  - D3.js
  - SVG
  - Force simulation
code_examples: true
---

# GraphRenderer API

The `GraphRenderer` class handles all graph visualization functionality.

## Class: GraphRenderer

### Constructor

```typescript
class GraphRenderer {
  constructor(
    containerElement: HTMLElement,
    notes: Map<string, Note>,
    linkGraph: LinkGraph
  )
}
```

**Parameters:**
- `containerElement`: DOM element to render graphs into
- `notes`: Map of all notes in vault
- `linkGraph`: Bidirectional link graph

### Methods

#### initialize()

Initialize the graph renderer with vault data.

```typescript
initialize(
  notes: Map<string, Note>,
  links: Link[]
): void
```

**Example:**
```typescript
const renderer = new GraphRenderer(
  document.getElementById('graph-container'),
  vaultData.notes,
  linkGraph
);

renderer.initialize(vaultData.notes, links);
```

#### renderLocalGraph()

Render a local graph centered on a specific note.

```typescript
renderLocalGraph(
  container: HTMLElement,
  noteId: string
): void
```

**Parameters:**
- `container`: Container element for the graph
- `noteId`: ID of the central note

**Example:**
```typescript
const container = document.getElementById('local-graph-container');
renderer.renderLocalGraph(container, 'MyNote');
```

#### renderGlobalGraph()

Render the global graph showing all notes.

```typescript
renderGlobalGraph(
  container: HTMLElement
): void
```

**Example:**
```typescript
const container = document.getElementById('global-graph-container');
renderer.renderGlobalGraph(container);
```

#### renderMiniGraph()

Render a compact graph in the sidebar.

```typescript
renderMiniGraph(
  noteId: string
): void
```

**Example:**
```typescript
// Called automatically when viewing a note
renderer.renderMiniGraph('CurrentNote');
```

#### computeLocalGraph()

Compute the subgraph for a local graph view.

```typescript
computeLocalGraph(
  currentNodeId: string
): { nodes: Node[], links: Link[] }
```

**Returns:**
```typescript
interface LocalGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  depthMap: Map<string, number>;
}
```

**Example:**
```typescript
const subgraph = renderer.computeLocalGraph('MyNote');
console.log(`Found ${subgraph.nodes.length} connected notes`);
```

## Graph Settings

### Local Graph Settings

```typescript
interface LocalGraphSettings {
  includeOutgoing: boolean;      // Show outgoing links
  includeIncoming: boolean;      // Show incoming links (backlinks)
  includeNeighbors: boolean;     // Show neighbor connections
  includeTags: boolean;          // Display tag nodes
  includeAttachments: boolean;   // Include attachments
  existingFilesOnly: boolean;    // Filter broken links
  showArrows: boolean;           // Show link directionality
  depth: number;                 // Traversal depth (1-5)
  textFadeThreshold: number;     // Label visibility threshold
  nodeSize: number;              // Node size multiplier (0.5-2.0)
  linkThickness: number;         // Link width multiplier (0.5-2.0)
  centerForce: number;           // Center gravity (0-1)
  repelForce: number;            // Node repulsion (0-2)
}
```

**Default Settings:**
```typescript
getDefaultLocalGraphSettings() {
  return {
    includeOutgoing: true,
    includeIncoming: true,
    includeNeighbors: false,
    includeTags: false,
    includeAttachments: false,
    existingFilesOnly: false,
    showArrows: true,
    depth: 1,
    textFadeThreshold: 1,
    nodeSize: 0.7,
    linkThickness: 0.5,
    centerForce: 0.3,
    repelForce: 1
  };
}
```

### Global Graph Settings

```typescript
interface GlobalGraphSettings {
  includeTags: boolean;
  includeAttachments: boolean;
  existingFilesOnly: boolean;
  includeOrphans: boolean;       // Show disconnected notes
  searchQuery: string;           // Filter query
  showArrows: boolean;
  textFadeThreshold: number;
  nodeSize: number;
  linkThickness: number;
  linkForce: number;             // Spring strength
  linkDistance: number;          // Ideal link length
  centerForce: number;
  repelForce: number;
}
```

## Type Definitions

### GraphNode

```typescript
interface GraphNode {
  id: string;              // Note ID
  title: string;           // Display title
  degree: number;          // Connection count
  group?: string;          // Node category (e.g., 'tag')
  x?: number;              // Position (from simulation)
  y?: number;
  fx?: number;             // Fixed position (dragging)
  fy?: number;
}
```

### GraphLink

```typescript
interface GraphLink {
  source: string | GraphNode;  // Source note ID or node
  target: string | GraphNode;  // Target note ID or node
  type: 'outgoing' | 'incoming' | 'neighbor' | 'tag';
}
```

## Force Simulation

The graph uses D3.js force-directed layout:

```typescript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links)
    .id(d => d.id)
    .distance(50))
  .force('charge', d3.forceManyBody()
    .strength(-100 * settings.repelForce))
  .force('center', d3.forceCenter(width / 2, height / 2)
    .strength(settings.centerForce))
  .force('collision', d3.forceCollide()
    .radius(d => radiusForNode(d) + 10));
```

## Visual Calculations

### Node Radius

```typescript
function radiusForNode(node: GraphNode): number {
  const degree = node.degree || 0;
  const base = 4 + Math.sqrt(degree);
  return base * settings.nodeSize;
}
```

### Link Endpoint Calculation

Arrows stop at node edges, not centers:

```typescript
// In simulation tick handler
const dx = target.x - source.x;
const dy = target.y - source.y;
const angle = Math.atan2(dy, dx);

const sourceRadius = radiusForNode(source) + 2; // +2 for stroke
const targetRadius = radiusForNode(target) + 2;

const x1 = source.x + sourceRadius * Math.cos(angle);
const y1 = source.y + sourceRadius * Math.sin(angle);
const x2 = target.x - targetRadius * Math.cos(angle);
const y2 = target.y - targetRadius * Math.sin(angle);
```

## Usage Examples

### Custom Graph Rendering

```typescript
const renderer = new GraphRenderer(container, notes, linkGraph);

// Customize settings
renderer.localGraphSettings = {
  ...renderer.getDefaultLocalGraphSettings(),
  depth: 2,
  includeNeighbors: true,
  nodeSize: 0.8
};

// Render with custom settings
renderer.renderLocalGraph(container, 'MyNote');
```

### Dynamic Settings Updates

```typescript
// Listen for setting changes
document.getElementById('depth-slider').addEventListener('input', (e) => {
  renderer.localGraphSettings.depth = parseInt(e.target.value);
  renderer.applyLocalGraphSettingsChange();
});
```

### Access Graph Data

```typescript
// Get current graph state
const subgraph = renderer.computeLocalGraph('MyNote');

// Analyze connections
const connections = subgraph.links.filter(
  link => link.source === 'MyNote' || link.target === 'MyNote'
);

console.log(`MyNote has ${connections.length} direct connections`);
```

---

Read Next: [[../Features/Interactive Graph Views|Interactive Graph Views]] > [[SiteGenerator API]] > [[../Architecture/Core Components|Core Components]]
