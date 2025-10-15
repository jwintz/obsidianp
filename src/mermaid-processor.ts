/**
 * Mermaid Diagram Processor
 * 
 * Handles processing of Mermaid diagrams in markdown code blocks
 */
export class MermaidProcessor {
  private static nextId = 0;
  private diagram: string;
  private containerId: string;

  constructor(diagram: string) {
    this.diagram = diagram.trim();
    this.containerId = `mermaid-${MermaidProcessor.nextId++}`;
  }

  /**
   * Generate HTML for the Mermaid diagram
   */
  generateHtml(): string {
    console.log(`🎨 Processing Mermaid diagram with ${this.diagram.length} characters`);
    console.log(`🎨 Generated Mermaid container ID: ${this.containerId}, nextId is now: ${MermaidProcessor.nextId}`);

    // Create a container that will be processed by mermaid.js on the client side
    // Store the original diagram code in data attribute for theme switching (escaped for attribute safety)
    const escapedDiagram = this.escapeHtml(this.diagram);
    
    return `
      <div class="mermaid-container" id="${this.containerId}-container">
        <pre class="mermaid" id="${this.containerId}" data-diagram="${escapedDiagram}">${this.diagram}</pre>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Reset the ID counter (useful for testing)
   */
  static resetIdCounter(): void {
    MermaidProcessor.nextId = 0;
  }
}
