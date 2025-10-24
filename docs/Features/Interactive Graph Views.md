---
description: Explore the interactive graph visualization features for exploring note connections
tags:
  - graph
  - visualization
  - features
  - d3js
  - interactive
type: feature-guide
category: features
audience: all
difficulty: beginner
estimated_time: 15 minutes
last_updated: 2025-10-24
---

# Interactive Graph Views

Obsidian:P provides powerful graph visualization features inspired by Obsidian's graph views.

## Overview

The graph system includes three interconnected views:
- **Local Graph** - Centered on current note with configurable depth
- **Global Graph** - Shows all notes in the vault
- **Mini Graph** - Compact sidebar view

## Local Graph View

The local graph shows connections around a specific note.

### Controls

#### Filters
- **Outgoing links** - Show notes this note links to
- **Incoming links** - Show notes that link to this note (backlinks)
- **Neighbor links** - Show connections between revealed notes
- **Tags** - Display tag nodes (only tags from the current note and its connected notes)
- **Attachments** - Include file attachments
- **Existing files only** - Hide broken links

#### Display Options
- **Depth** (1-5) - Number of connection hops to display
- **Arrows** - Show link directionality
- **Text fade threshold** - Control label visibility
- **Node size** - Adjust node sizes (0.5-2.0)
- **Link thickness** - Adjust edge width (0.5-2.0)

#### Forces
- **Center force** - Gravitational pull to center (0-1)
- **Repel force** - Node-to-node repulsion (0-2)

## Graph Rendering Implementation

The graph visualization is implemented client-side in `src/assets/graph.js` using D3.js.

## Global Graph View

Shows all notes in your vault with their connections.

### Additional Controls

- **Orphans** - Show/hide disconnected notes
- **Search/Filter** - Filter by search query
- **Groups** - Color-code note groups by query

### Search Operators

```
path:folder/     # Notes in folder
tag:#concept     # Notes with tag
file:*.md        # File pattern matching
```

## Mini Graph

Compact graph view in the sidebar that stays synchronized with the local graph settings.

### Features
- Automatic sync with local graph settings
- Same visual styling
- Hover interactions
- Click to open notes

## Graph Rendering Architecture

The graph visualization is implemented client-side in `src/assets/graph.js` using D3.js.

**Key Features:**
- Force-directed layout simulation
- Interactive zoom and pan
- Node hover and click interactions
- Synchronized settings between local and mini graphs
- Dynamic filtering and search

**Data Flow:**
1. Server generates JSON with notes and link graph
2. Client-side JavaScript loads graph data
3. D3.js creates SVG visualization
4. User interactions update the display in real-time

## Visual Properties

### Node Colors
- Regular nodes: Light gray (`#d1d5db` light, `#9ca3af` dark)
- Tag nodes: Green (`#10b981`)
- Current node: Purple (`#8b5cf6` light, `#a78bfa` dark)

### Node Sizing
Nodes scale based on connection count (degree centrality):
```javascript
radius = (4 + sqrt(degree)) * nodeSize
```

### Link Styling
- **Outgoing**: Regular gray edge
- **Incoming**: Regular gray edge (reversed direction)
- **Neighbor**: Dashed edge
- **Tag**: Dashed green edge

## Force Simulation

Uses D3.js force-directed graph layout:
- **Link force**: Spring attraction between connected nodes
- **Charge force**: Electrostatic repulsion between all nodes
- **Center force**: Gravitational pull toward center
- **Collision force**: Prevents node overlap

## Performance

Graph rendering is optimized for large vaults:
- Barnes-Hut approximation for O(n log n) complexity
- Progressive rendering for 1000+ nodes
- Level-of-detail rendering when zoomed out

---

**Note:** Graph rendering is implemented client-side. For server-side data processing, see [[../API-Reference/VaultProcessor API|VaultProcessor API]]

Read Next: [[Search System]]
