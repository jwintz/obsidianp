/**
 * ABC Music Processor for static site generation
 * Generates HTML with embedded JavaScript for client-side rendering and MIDI playback
 */
export class AbcProcessor {
    private static nextId = 0;

    constructor(
        private readonly abcSource: string,
    ) { }

    /**
     * Generate HTML for ABC notation with client-side rendering
     */
    generateHtml(): string {
        const id = `abc-${AbcProcessor.nextId++}`;
        console.log(`🎵 Generated ABC container ID: ${id}, nextId is now: ${AbcProcessor.nextId}`);
        const { userOptions, source } = this.parseOptionsAndSource();

        // Base64 encode the JSON for safe embedding in HTML attributes
        const sourceB64 = Buffer.from(JSON.stringify(source), 'utf-8').toString('base64');
        const optionsB64 = Buffer.from(JSON.stringify(userOptions), 'utf-8').toString('base64');

        return `
      <div class="abcjs-container" id="${id}" 
           data-abc-source="${sourceB64}" 
           data-abc-options="${optionsB64}">
        <div class="abcjs-loading">Loading ABC notation...</div>
      </div>
    `;
    }

    private parseOptionsAndSource(): { userOptions: any, source: string; } {
        let userOptions = {};
        const optionsRegex = /^(?<options>\{[^}]*\})\s*(?<source>[\s\S]*)$/;
        const optionsMatch = this.abcSource.match(optionsRegex);
        let source = this.abcSource;

        if (optionsMatch !== null && optionsMatch.groups) {
            source = optionsMatch.groups.source;
            try {
                userOptions = JSON.parse(optionsMatch.groups.options);
            } catch (e) {
                console.error('Failed to parse ABC options:', e);
            }
        }

        return { userOptions, source };
    }
}
