/**
 * HTML formatter with interactive D3.js visualization
 */

import type { KnowledgeGraph, ParserConfig, Entity, Relationship } from '../types/index.js';

/**
 * Formats knowledge graph as interactive HTML with D3.js visualizations
 * - Self-contained HTML (CSS and JS inline)
 * - D3.js force-directed dependency graph
 * - Interactive entity explorer
 * - Visitor results dashboards
 * - Responsive design
 */
export class HtmlFormatter {
  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  format(): string {
    return this.generateSelfContainedHtml();
  }

  private generateSelfContainedHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  ${this.generateHead()}
</head>
<body>
  ${this.generateNavigation()}
  <div class="container">
    ${this.generateOverviewSection()}
    ${this.generateGraphSection()}
    ${this.generateEntitiesSection()}
    ${this.generateRelationshipsSection()}
    ${this.generateVisitorsSection()}
    ${this.generateDiffSection()}
  </div>
  ${this.generateScripts()}
</body>
</html>`;
  }

  private generateHead(): string {
    const projectName = this.graph.metadata.projectName || 'Angular Project';
    return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(projectName)} - ng-parser Analysis</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  ${this.generateStyles()}`;
  }

  private generateStyles(): string {
    return `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      line-height: 1.6;
    }

    .navbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .navbar .subtitle {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .stats-bar {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
    }

    .stat-label {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .tabs {
      background: white;
      border-bottom: 2px solid #e2e8f0;
      padding: 0 2rem;
      display: flex;
      gap: 1rem;
      overflow-x: auto;
    }

    .tab {
      padding: 1rem 1.5rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
      white-space: nowrap;
      font-weight: 500;
      color: #64748b;
    }

    .tab:hover {
      color: #667eea;
      background: #f8fafc;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .section {
      display: none;
      animation: fadeIn 0.3s;
    }

    .section.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .card h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card h3 {
      font-size: 1.1rem;
      margin: 1rem 0 0.5rem;
      color: #475569;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
    }

    .metric-card h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 0.5rem 0;
      opacity: 0.9;
      color: white;
    }

    .metric-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      margin: 0;
    }

    .metric-card .label {
      font-size: 0.875rem;
      margin-top: 0.25rem;
      opacity: 0.9;
    }

    #graph-container {
      width: 100%;
      height: 600px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      position: relative;
    }

    .graph-controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .graph-controls input,
    .graph-controls select {
      padding: 0.5rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .graph-controls button {
      padding: 0.5rem 1rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.3s;
    }

    .graph-controls button:hover {
      background: #5568d3;
    }

    .legend {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 6px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }

    thead {
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
    }

    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
    }

    th[style*="cursor: pointer"]:hover {
      background: #e2e8f0;
      color: #667eea;
    }

    th span {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-left: 0.25rem;
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-component { background: #dbeafe; color: #1e40af; }
    .badge-service { background: #d1fae5; color: #065f46; }
    .badge-module { background: #fef3c7; color: #92400e; }
    .badge-directive { background: #e9d5ff; color: #6b21a8; }
    .badge-pipe { background: #fce7f3; color: #9f1239; }
    .badge-standalone { background: #dcfce7; color: #166534; }
    .badge-signal { background: #fef08a; color: #854d0e; }

    .entity-details {
      margin-top: 0.5rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 0.875rem;
      display: none;
    }

    .entity-details.show {
      display: block;
    }

    .entity-details dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
    }

    .entity-details dt {
      font-weight: 600;
      color: #475569;
    }

    .entity-details dd {
      color: #64748b;
    }

    a {
      color: #667eea;
      text-decoration: none;
      transition: color 0.3s;
    }

    a:hover {
      color: #5568d3;
      text-decoration: underline;
    }

    .search-box {
      width: 100%;
      max-width: 400px;
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .search-box:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .virtual-scroll-container {
      position: relative;
      max-height: 600px;
      overflow-y: auto;
      overflow-x: auto;
    }

    #virtual-scroll-tbody {
      position: relative;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin: 1.5rem 0;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .navbar {
        padding: 1rem;
      }

      .stats-bar {
        gap: 1rem;
      }

      .stat-value {
        font-size: 1.25rem;
      }

      .tabs {
        padding: 0 1rem;
      }

      .tab {
        padding: 0.75rem 1rem;
      }

      #graph-container {
        height: 400px;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>`;
  }

  private generateNavigation(): string {
    const metadata = this.graph.metadata;
    const projectName = metadata.projectName || 'Angular Project';
    const angularVersion = metadata.angularVersion || 'unknown';
    const timestamp = new Date(metadata.timestamp).toLocaleString();

    return `
  <nav class="navbar">
    <h1>🚀 ${this.escapeHtml(projectName)}</h1>
    <div class="subtitle">ng-parser Analysis - Angular ${this.escapeHtml(angularVersion)} - Generated ${this.escapeHtml(timestamp)}</div>
    <div class="stats-bar">
      <div class="stat">
        <div>
          <div class="stat-value">${metadata.totalEntities}</div>
          <div class="stat-label">Entities</div>
        </div>
      </div>
      <div class="stat">
        <div>
          <div class="stat-value">${metadata.totalRelationships}</div>
          <div class="stat-label">Relationships</div>
        </div>
      </div>
      ${this.generateStatsForEntityTypes()}
    </div>
  </nav>

  <div class="tabs">
    <div class="tab active" data-tab="overview">Overview</div>
    <div class="tab" data-tab="graph">Dependency Graph</div>
    <div class="tab" data-tab="entities">Entities</div>
    <div class="tab" data-tab="relationships">Relationships</div>
    ${this.hasVisitorResults() ? '<div class="tab" data-tab="visitors">Visitor Results</div>' : ''}
    <div class="tab" data-tab="diff">🔄 Diff Mode</div>
  </div>`;
  }

  private generateStatsForEntityTypes(): string {
    const counts = new Map<string, number>();
    for (const entity of this.graph.entities.values()) {
      counts.set(entity.type, (counts.get(entity.type) || 0) + 1);
    }

    const stats: string[] = [];
    for (const [type, count] of Array.from(counts).sort((a, b) => b[1] - a[1])) {
      stats.push(`
      <div class="stat">
        <div>
          <div class="stat-value">${count}</div>
          <div class="stat-label">${this.capitalizeFirst(type)}s</div>
        </div>
      </div>`);
    }

    return stats.join('');
  }

  private generateOverviewSection(): string {
    const counts = this.getEntityCounts();
    const globalStyles = this.graph.metadata.globalStyles || [];

    return `
  <div id="overview" class="section active">
    <div class="grid">
      ${Array.from(counts).map(([type, count]) => `
        <div class="metric-card">
          <h3>${this.capitalizeFirst(type)}s</h3>
          <div class="value">${count}</div>
          <div class="label">${this.getEntityTypeDescription(type)}</div>
        </div>
      `).join('')}
    </div>

    ${globalStyles.length > 0 ? `
    <div class="card">
      <h2>📦 Global Styles</h2>
      ${globalStyles.map((styleFile: any) => `
        <div style="margin-bottom: 1.5rem;">
          <h3>${styleFile.sourceUrl
            ? `<a href="${styleFile.sourceUrl}" target="_blank">${this.escapeHtml(styleFile.filePath)}</a>`
            : this.escapeHtml(styleFile.filePath)
          }</h3>
          ${styleFile.uses && styleFile.uses.length > 0 ? `
            <div style="margin-top: 0.5rem;">
              <strong>@use statements:</strong>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                ${styleFile.uses.map((use: any) => `
                  <li><code>${this.escapeHtml(use.statement)}</code> (line ${use.line})${use.namespace ? ` as ${use.namespace}` : ''}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          ${styleFile.imports && styleFile.imports.length > 0 ? `
            <div style="margin-top: 0.5rem;">
              <strong>@import statements:</strong>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                ${styleFile.imports.map((imp: any) => `
                  <li><code>${this.escapeHtml(imp.statement)}</code> (line ${imp.line})</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${this.graph.metadata.dependencies ? `
    <div class="card">
      <h2>📦 Dependencies</h2>
      <div style="margin-bottom: 1rem;">
        <strong>Total external imports detected:</strong> ${this.graph.metadata.dependencies.totalExternal}
      </div>

      ${Object.keys(this.graph.metadata.dependencies.dependencies).length > 0 ? `
      <div style="margin-bottom: 1rem;">
        <h3>Runtime Dependencies (${Object.keys(this.graph.metadata.dependencies.dependencies).length})</h3>
        <ul style="margin: 0.5rem 0; padding-left: 1.5rem; max-height: 200px; overflow-y: auto;">
          ${Object.entries(this.graph.metadata.dependencies.dependencies)
            .map(([pkg, ver]: [string, any]) => `<li><code>${this.escapeHtml(pkg)}</code>: ${this.escapeHtml(String(ver))}</li>`)
            .join('')}
        </ul>
      </div>
      ` : ''}

      ${Object.keys(this.graph.metadata.dependencies.devDependencies).length > 0 ? `
      <div style="margin-bottom: 1rem;">
        <h3>Dev Dependencies (${Object.keys(this.graph.metadata.dependencies.devDependencies).length})</h3>
        <details>
          <summary style="cursor: pointer;">Show dev dependencies</summary>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            ${Object.entries(this.graph.metadata.dependencies.devDependencies)
              .map(([pkg, ver]: [string, any]) => `<li><code>${this.escapeHtml(pkg)}</code>: ${this.escapeHtml(String(ver))}</li>`)
              .join('')}
          </ul>
        </details>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${this.graph.metadata.typescript ? `
    <div class="card">
      <h2>⚙️ TypeScript Configuration</h2>
      <ul style="list-style: none; padding: 0;">
        ${this.graph.metadata.typescript.target ? `<li><strong>Target:</strong> ${this.graph.metadata.typescript.target}</li>` : ''}
        ${this.graph.metadata.typescript.module ? `<li><strong>Module:</strong> ${this.graph.metadata.typescript.module}</li>` : ''}
        ${this.graph.metadata.typescript.strict !== undefined ? `<li><strong>Strict mode:</strong> ${this.graph.metadata.typescript.strict ? '✅' : '❌'}</li>` : ''}
        ${this.graph.metadata.typescript.experimentalDecorators !== undefined ? `<li><strong>Decorators:</strong> ${this.graph.metadata.typescript.experimentalDecorators ? '✅' : '❌'}</li>` : ''}
        ${this.graph.metadata.typescript.paths ? `<li><strong>Path aliases:</strong> ${Object.keys(this.graph.metadata.typescript.paths).length} configured</li>` : ''}
      </ul>

      ${this.graph.metadata.typescript.paths && Object.keys(this.graph.metadata.typescript.paths).length > 0 ? `
      <details style="margin-top: 1rem;">
        <summary style="cursor: pointer;">Show path mappings</summary>
        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
          ${Object.entries(this.graph.metadata.typescript.paths)
            .map(([alias, paths]: [string, any]) => `<li><code>${this.escapeHtml(alias)}</code> → <code>${this.escapeHtml(Array.isArray(paths) ? paths.join(', ') : String(paths))}</code></li>`)
            .join('')}
        </ul>
      </details>
      ` : ''}
    </div>
    ` : ''}
  </div>`;
  }

  private generateGraphSection(): string {
    return `
  <div id="graph" class="section">
    <div class="card">
      <h2>🔗 Dependency Graph</h2>
      <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-component" checked onchange="toggleEntityType('component')">
            <span style="color: #3b82f6;">●</span> Components
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-service" checked onchange="toggleEntityType('service')">
            <span style="color: #10b981;">●</span> Services
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-module" checked onchange="toggleEntityType('module')">
            <span style="color: #f59e0b;">●</span> Modules
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-directive" checked onchange="toggleEntityType('directive')">
            <span style="color: #8b5cf6;">●</span> Directives
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-pipe" checked onchange="toggleEntityType('pipe')">
            <span style="color: #ec4899;">●</span> Pipes
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-external" checked onchange="toggleEntityType('external')">
            <span style="color: #94a3b8;">●</span> External
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="checkbox" id="toggle-unresolved" onchange="toggleEntityType('unresolved')">
            <span style="color: #ef4444;">●</span> Unresolved
          </label>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.875rem;">
          <span id="visible-count" style="font-weight: 600; color: #667eea;">0</span> /
          <span id="total-count">0</span> nodes visible
          <button onclick="showAllNodes()" style="margin-left: auto; padding: 0.375rem 0.75rem; font-size: 0.875rem;">Show All</button>
          <button onclick="showTopNodes()" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">Top 100</button>
        </div>
      </div>
      <div class="graph-controls">
        <input type="text" id="graph-search" class="search-box" placeholder="Search entities..." />
        <button onclick="resetGraph()">Reset View</button>
        <button onclick="togglePathFinder()" id="path-finder-btn">🔍 Path Finder</button>
      </div>
      <div id="path-finder-panel" style="display: none; padding: 1rem; background: #f8fafc; border-radius: 6px; margin-bottom: 1rem;">
        <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">🔍 Find Dependency Path</h3>
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <label style="display: block; font-size: 0.875rem; margin-bottom: 0.5rem;">From:</label>
            <input type="text" id="path-source" class="search-box" placeholder="Source entity..." style="margin: 0; width: 100%;" />
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label style="display: block; font-size: 0.875rem; margin-bottom: 0.5rem;">To:</label>
            <input type="text" id="path-target" class="search-box" placeholder="Target entity..." style="margin: 0; width: 100%;" />
          </div>
          <button onclick="findPath()" style="align-self: flex-end;">Find Path</button>
          <button onclick="clearPath()" style="align-self: flex-end; background: #94a3b8;">Clear</button>
        </div>
        <div id="path-result" style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 6px; display: none;">
          <!-- Path result displayed here -->
        </div>
      </div>
      <div id="graph-container"></div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #3b82f6;"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981;"></div>
          <span>Service</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f59e0b;"></div>
          <span>Module</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #8b5cf6;"></div>
          <span>Directive</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ec4899;"></div>
          <span>Pipe</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f97316;"></div>
          <span>Constant/Token</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #6b7280;"></div>
          <span>Other</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #94a3b8; opacity: 0.7; border: 1px dashed #cbd5e1;"></div>
          <span>External Package</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ef4444; opacity: 0.6; border: 1px dotted #f87171;"></div>
          <span>Unresolved</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #06b6d4; opacity: 0.8; border: 1px dashed #22d3ee;"></div>
          <span>Internal File</span>
        </div>
      </div>
    </div>
  </div>`;
  }

  private generateEntitiesSection(): string {
    const entities = Array.from(this.graph.entities.values());

    return `
  <div id="entities" class="section">
    <div class="card">
      <h2>📋 Entities (<span id="entities-count">${entities.length}</span>)</h2>
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
        <input type="text" id="entity-search" class="search-box" placeholder="Search entities..." style="flex: 1; min-width: 250px; margin: 0;" />
        <select id="entity-type-filter" style="padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; min-width: 150px;">
          <option value="all">All Types</option>
          <option value="component">Components</option>
          <option value="service">Services</option>
          <option value="module">Modules</option>
          <option value="directive">Directives</option>
          <option value="pipe">Pipes</option>
          <option value="constant">Constants</option>
        </select>
        <select id="entity-standalone-filter" style="padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; min-width: 150px;">
          <option value="all">All Status</option>
          <option value="standalone">Standalone Only</option>
          <option value="non-standalone">Non-Standalone</option>
        </select>
      </div>
      <div class="virtual-scroll-container" id="virtual-scroll-container">
        <table id="entities-table">
          <thead>
            <tr>
              <th style="cursor: pointer;" onclick="sortEntitiesBy('type')">
                Type <span id="sort-type-indicator">↕</span>
              </th>
              <th style="cursor: pointer;" onclick="sortEntitiesBy('name')">
                Name <span id="sort-name-indicator">↕</span>
              </th>
              <th style="cursor: pointer;" onclick="sortEntitiesBy('file')">
                File <span id="sort-file-indicator">↕</span>
              </th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="virtual-scroll-tbody">
            <!-- Virtual scroll rows rendered here -->
          </tbody>
        </table>
        <div id="virtual-scroll-spacer" style="height: 0px;"></div>
      </div>
    </div>
  </div>`;
  }

  private generateEntityRow(entity: Entity, index: number): string {
    const sourceLink = entity.location.sourceUrl
      ? `<a href="${entity.location.sourceUrl}" target="_blank">${this.escapeHtml(entity.location.filePath)}:${entity.location.line}</a>`
      : `${this.escapeHtml(entity.location.filePath)}:${entity.location.line}`;

    return `
          <tr data-entity-type="${entity.type}" data-entity-name="${this.escapeHtml(entity.name.toLowerCase())}">
            <td>
              <span class="badge badge-${entity.type}">${entity.type}</span>
              ${this.getEntityBadges(entity)}
            </td>
            <td><strong>${this.escapeHtml(entity.name)}</strong></td>
            <td>${sourceLink}</td>
            <td>
              <button onclick="toggleDetails(${index})" style="background: none; border: none; color: #667eea; cursor: pointer; font-size: 0.875rem;">
                View Details
              </button>
              <div id="entity-details-${index}" class="entity-details">
                ${this.generateEntityDetails(entity)}
              </div>
            </td>
          </tr>`;
  }

  private getEntityBadges(entity: any): string {
    const badges: string[] = [];
    if (entity.standalone) badges.push('<span class="badge badge-standalone">Standalone</span>');
    if (entity.signals && entity.signals.length > 0) badges.push('<span class="badge badge-signal">Signals</span>');
    return badges.length > 0 ? ' ' + badges.join(' ') : '';
  }

  private generateEntityDetails(entity: Entity): string {
    const details: string[] = [];

    if (entity.documentation) {
      details.push(`<p style="margin-bottom: 1rem;"><em>${this.escapeHtml(entity.documentation)}</em></p>`);
    }

    const e = entity as any;

    // Component-specific
    if (e.selector) {
      details.push(`<dl><dt>Selector:</dt><dd><code>${this.escapeHtml(e.selector)}</code></dd></dl>`);
    }

    if (e.inputs && e.inputs.length > 0) {
      details.push(`
        <dl>
          <dt>Inputs:</dt>
          <dd>${e.inputs.map((i: any) =>
            `<code>${this.escapeHtml(i.name)}</code>${i.isSignal ? ' (signal)' : ''}${i.required ? ' <strong>*</strong>' : ''}`
          ).join(', ')}</dd>
        </dl>`);
    }

    if (e.outputs && e.outputs.length > 0) {
      details.push(`
        <dl>
          <dt>Outputs:</dt>
          <dd>${e.outputs.map((o: any) =>
            `<code>${this.escapeHtml(o.name)}</code>${o.isSignal ? ' (signal)' : ''}`
          ).join(', ')}</dd>
        </dl>`);
    }

    if (e.signals && e.signals.length > 0) {
      details.push(`
        <dl>
          <dt>Signals:</dt>
          <dd>${e.signals.map((s: any) =>
            `<code>${this.escapeHtml(s.name)}</code> (${s.signalType})`
          ).join(', ')}</dd>
        </dl>`);
    }

    if (e.lifecycle && e.lifecycle.length > 0) {
      details.push(`<dl><dt>Lifecycle:</dt><dd>${e.lifecycle.join(', ')}</dd></dl>`);
    }

    if (e.changeDetection) {
      details.push(`<dl><dt>Change Detection:</dt><dd>${e.changeDetection}</dd></dl>`);
    }

    // Service-specific
    if (e.providedIn) {
      details.push(`<dl><dt>Provided In:</dt><dd><code>${this.escapeHtml(e.providedIn)}</code></dd></dl>`);
    }

    if (e.dependencies && e.dependencies.length > 0) {
      details.push(`
        <dl>
          <dt>Dependencies:</dt>
          <dd>${e.dependencies.map((d: any) => this.escapeHtml(d.type)).join(', ')}</dd>
        </dl>`);
    }

    // Module-specific
    if (e.declarations && e.declarations.length > 0) {
      details.push(`<dl><dt>Declarations:</dt><dd>${e.declarations.map((d: string) => this.escapeHtml(d)).join(', ')}</dd></dl>`);
    }

    if (e.imports && e.imports.length > 0) {
      details.push(`<dl><dt>Imports:</dt><dd>${e.imports.map((i: string) => this.escapeHtml(i)).join(', ')}</dd></dl>`);
    }

    if (e.exports && e.exports.length > 0) {
      details.push(`<dl><dt>Exports:</dt><dd>${e.exports.map((ex: string) => this.escapeHtml(ex)).join(', ')}</dd></dl>`);
    }

    if (e.providers && e.providers.length > 0) {
      details.push(`<dl><dt>Providers:</dt><dd>${e.providers.map((p: string) => this.escapeHtml(p)).join(', ')}</dd></dl>`);
    }

    // Pipe-specific
    if (e.pipeName) {
      details.push(`<dl><dt>Pipe Name:</dt><dd><code>${this.escapeHtml(e.pipeName)}</code></dd></dl>`);
      if (e.pure !== undefined) {
        details.push(`<dl><dt>Pure:</dt><dd>${e.pure ? 'Yes' : 'No'}</dd></dl>`);
      }
    }

    return details.length > 0 ? details.join('') : '<p>No additional details available.</p>';
  }

  private generateRelationshipsSection(): string {
    const grouped = new Map<string, Relationship[]>();

    this.graph.relationships.forEach((rel) => {
      if (!grouped.has(rel.type)) {
        grouped.set(rel.type, []);
      }
      grouped.get(rel.type)!.push(rel);
    });

    return `
  <div id="relationships" class="section">
    <div class="card">
      <h2>🔀 Relationships (${this.graph.relationships.length})</h2>
      <input type="text" id="relationship-search" class="search-box" placeholder="Search relationships..." />
      ${Array.from(grouped).map(([type, rels], groupIndex) => `
        <h3>${this.capitalizeFirst(type)} (${rels.length})</h3>
        <div class="virtual-scroll-container" id="rel-scroll-${groupIndex}" style="max-height: 400px;">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th></th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody id="rel-tbody-${groupIndex}">
              <!-- Virtual scroll rows -->
            </tbody>
          </table>
          <div id="rel-spacer-${groupIndex}" style="height: 0px;"></div>
        </div>
      `).join('')}
    </div>
  </div>`;
  }

  private generateVisitorsSection(): string {
    if (!this.hasVisitorResults()) {
      return '';
    }

    const customAnalysis = (this.graph as any).customAnalysis;
    if (!customAnalysis) return '';

    const sections: string[] = [];

    // RxJS Visitor
    const rxjsResults = customAnalysis.get('RxJSPatternVisitor');
    if (rxjsResults && rxjsResults.totalObservables > 0) {
      sections.push(this.generateRxJSSection(rxjsResults));
    }

    // Security Visitor
    const securityResults = customAnalysis.get('SecurityVisitor');
    if (securityResults && securityResults.totalPatterns > 0) {
      sections.push(this.generateSecuritySection(securityResults));
    }

    // Performance Visitor
    const perfResults = customAnalysis.get('PerformanceVisitor');
    if (perfResults && perfResults.totalPatterns > 0) {
      sections.push(this.generatePerformanceSection(perfResults));
    }

    return `
  <div id="visitors" class="section">
    ${sections.join('\n')}
  </div>`;
  }

  private generateRxJSSection(results: any): string {
    return `
    <div class="card">
      <h2>📡 RxJS Pattern Analysis</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="metric-card">
          <h3>Total Observables</h3>
          <div class="value">${results.totalObservables}</div>
        </div>
        <div class="metric-card">
          <h3>In Components</h3>
          <div class="value">${results.observablesInComponents || 0}</div>
        </div>
        <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <h3>With ngOnDestroy</h3>
          <div class="value">${results.componentsWithNgOnDestroy?.length || 0}</div>
        </div>
        <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <h3>Without ngOnDestroy</h3>
          <div class="value">${results.componentsWithoutNgOnDestroy?.length || 0}</div>
        </div>
      </div>
      ${results.componentsWithoutNgOnDestroy && results.componentsWithoutNgOnDestroy.length > 0 ? `
        <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
          <strong>⚠️ Components with Observables but no ngOnDestroy:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            ${results.componentsWithoutNgOnDestroy.slice(0, 10).map((name: string) => `
              <li>${this.escapeHtml(name)}</li>
            `).join('')}
            ${results.componentsWithoutNgOnDestroy.length > 10 ? `<li><em>...and ${results.componentsWithoutNgOnDestroy.length - 10} more</em></li>` : ''}
          </ul>
        </div>
      ` : ''}
    </div>`;
  }

  private generateSecuritySection(results: any): string {
    const patterns = Object.entries(results.byPattern || {})
      .sort((a: any, b: any) => b[1] - a[1]);

    return `
    <div class="card">
      <h2>🔒 Security Pattern Analysis</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h3>Total Patterns</h3>
          <div class="value">${results.totalPatterns}</div>
        </div>
        ${patterns.slice(0, 3).map(([pattern, count]) => `
          <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <h3>${this.escapeHtml(String(pattern))}</h3>
            <div class="value">${count}</div>
          </div>
        `).join('')}
      </div>
      ${patterns.length > 0 ? `
        <div class="chart-container">
          <canvas id="security-chart"></canvas>
        </div>
      ` : ''}
    </div>`;
  }

  private generatePerformanceSection(results: any): string {
    const patterns = Object.entries(results.byPattern || {})
      .sort((a: any, b: any) => b[1] - a[1]);

    return `
    <div class="card">
      <h2>⚡ Performance Pattern Analysis</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="metric-card" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
          <h3>Total Patterns</h3>
          <div class="value">${results.totalPatterns}</div>
        </div>
        ${patterns.slice(0, 3).map(([pattern, count]) => `
          <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <h3>${this.escapeHtml(String(pattern)).replace(/_/g, ' ')}</h3>
            <div class="value">${count}</div>
          </div>
        `).join('')}
      </div>
      ${patterns.length > 0 ? `
        <div class="chart-container">
          <canvas id="performance-chart"></canvas>
        </div>
      ` : ''}
    </div>`;
  }

  private generateDiffSection(): string {
    return `
  <div id="diff" class="section">
    <div class="card">
      <h2>🔄 Diff Mode - Compare Versions</h2>
      <p style="margin-bottom: 1.5rem; color: #64748b;">
        Compare this analysis with another version to see what changed (added/removed/modified entities and relationships).
      </p>

      <div style="padding: 1.5rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1.5rem;">
        <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">Upload Previous Version</h3>
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <input type="file" id="diff-file-input" accept=".json,.html" style="flex: 1; padding: 0.5rem;" />
          <button onclick="loadDiffFile()" style="padding: 0.75rem 1.5rem;">Compare</button>
          <button onclick="clearDiff()" style="padding: 0.75rem 1.5rem; background: #94a3b8;">Clear</button>
        </div>
        <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">
          ℹ️ Upload a previous HTML export or JSON export from ng-parser
        </p>
      </div>

      <div id="diff-result" style="display: none;">
        <div class="grid" style="margin-bottom: 1.5rem;">
          <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h3>Added</h3>
            <div class="value" id="diff-added-count">0</div>
            <div class="label">New entities</div>
          </div>
          <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <h3>Removed</h3>
            <div class="value" id="diff-removed-count">0</div>
            <div class="label">Deleted entities</div>
          </div>
          <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <h3>Modified</h3>
            <div class="value" id="diff-modified-count">0</div>
            <div class="label">Changed entities</div>
          </div>
          <div class="metric-card">
            <h3>Unchanged</h3>
            <div class="value" id="diff-unchanged-count">0</div>
            <div class="label">Same entities</div>
          </div>
        </div>

        <div class="card" style="background: #f8fafc;">
          <h3 style="margin: 0 0 1rem 0;">Detailed Changes</h3>
          <div id="diff-details">
            <!-- Diff details here -->
          </div>
        </div>
      </div>
    </div>
  </div>`;
  }

  private generateScripts(): string {
    const graphData = this.prepareGraphData();

    return `
  <script>
    // Graph data
    const graphData = ${JSON.stringify(graphData)};

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active section
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');

        // Initialize graph if switching to graph tab
        if (targetTab === 'graph' && !window.graphInitialized) {
          initGraph();
        }

        // Initialize charts if switching to visitors tab
        if (targetTab === 'visitors' && !window.chartsInitialized) {
          initCharts();
        }
      });
    });

    // Entity details toggle
    function toggleDetails(index) {
      const details = document.getElementById('entity-details-' + index);
      details.classList.toggle('show');
    }

    // Virtual Scroll for Entities Table
    const allEntities = ${JSON.stringify(Array.from(this.graph.entities.values()).map((entity, index) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      location: entity.location,
      standalone: (entity as any).standalone || false,
      index: index,
      entity: entity
    })))};

    let filteredEntities = [...allEntities];
    let currentSort = { field: 'name', direction: 'asc' };
    const ROW_HEIGHT = 50;
    const BUFFER_SIZE = 5;
    let visibleStart = 0;
    let visibleEnd = 0;

    function renderEntityRow(entityData) {
      const entity = entityData.entity;
      const index = entityData.index;
      const sourceLink = entity.location.sourceUrl
        ? \`<a href="\${entity.location.sourceUrl}" target="_blank">\${escapeHtml(entity.location.filePath)}:\${entity.location.line}</a>\`
        : \`\${escapeHtml(entity.location.filePath)}:\${entity.location.line}\`;

      const badges = [];
      if (entity.standalone) badges.push('<span class="badge badge-standalone">Standalone</span>');
      if (entity.signals && entity.signals.length > 0) badges.push('<span class="badge badge-signal">Signals</span>');

      return \`<tr data-entity-type="\${entity.type}" data-entity-name="\${escapeHtml(entity.name.toLowerCase())}" style="height: \${ROW_HEIGHT}px;">
        <td>
          <span class="badge badge-\${entity.type}">\${entity.type}</span>
          \${badges.join(' ')}
        </td>
        <td><strong>\${escapeHtml(entity.name)}</strong></td>
        <td>\${sourceLink}</td>
        <td>
          <button onclick="toggleDetails(\${index})" style="background: none; border: none; color: #667eea; cursor: pointer; font-size: 0.875rem;">
            View Details
          </button>
          <div id="entity-details-\${index}" class="entity-details">
            <p><em>Click to load details...</em></p>
          </div>
        </td>
      </tr>\`;
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateVirtualScroll() {
      const container = document.getElementById('virtual-scroll-container');
      const tbody = document.getElementById('virtual-scroll-tbody');
      const spacer = document.getElementById('virtual-scroll-spacer');

      if (!container || !tbody) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
      visibleEnd = Math.min(
        filteredEntities.length,
        Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_SIZE
      );

      const visibleEntities = filteredEntities.slice(visibleStart, visibleEnd);

      tbody.innerHTML = visibleEntities.map(renderEntityRow).join('');
      tbody.style.transform = \`translateY(\${visibleStart * ROW_HEIGHT}px)\`;

      const totalHeight = filteredEntities.length * ROW_HEIGHT;
      spacer.style.height = \`\${totalHeight}px\`;
    }

    // Sorting function
    function sortEntitiesBy(field) {
      // Toggle direction if clicking same field
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }

      // Update indicators
      document.getElementById('sort-type-indicator').textContent = '↕';
      document.getElementById('sort-name-indicator').textContent = '↕';
      document.getElementById('sort-file-indicator').textContent = '↕';

      const indicator = document.getElementById(\`sort-\${field}-indicator\`);
      if (indicator) {
        indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
      }

      // Sort filtered entities
      filteredEntities.sort((a, b) => {
        let valA, valB;

        if (field === 'type') {
          valA = a.type;
          valB = b.type;
        } else if (field === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (field === 'file') {
          valA = a.location.filePath;
          valB = b.location.filePath;
        }

        if (currentSort.direction === 'asc') {
          return valA < valB ? -1 : valA > valB ? 1 : 0;
        } else {
          return valA > valB ? -1 : valA < valB ? 1 : 0;
        }
      });

      updateVirtualScroll();
    }

    // Filtering function
    function filterEntities() {
      const searchQuery = document.getElementById('entity-search').value.toLowerCase();
      const typeFilter = document.getElementById('entity-type-filter').value;
      const standaloneFilter = document.getElementById('entity-standalone-filter').value;

      filteredEntities = allEntities.filter(e => {
        // Search filter
        const matchesSearch = !searchQuery ||
          e.name.toLowerCase().includes(searchQuery) ||
          e.type.toLowerCase().includes(searchQuery) ||
          e.location.filePath.toLowerCase().includes(searchQuery);

        // Type filter
        const matchesType = typeFilter === 'all' || e.type === typeFilter;

        // Standalone filter
        let matchesStandalone = true;
        if (standaloneFilter === 'standalone') {
          matchesStandalone = e.standalone === true;
        } else if (standaloneFilter === 'non-standalone') {
          matchesStandalone = !e.standalone;
        }

        return matchesSearch && matchesType && matchesStandalone;
      });

      // Apply current sort
      if (currentSort.field) {
        sortEntitiesBy(currentSort.field);
      }

      // Update count
      document.getElementById('entities-count').textContent = filteredEntities.length;

      updateVirtualScroll();
    }

    // Entity search with virtual scroll
    const entitySearch = document.getElementById('entity-search');
    if (entitySearch) {
      entitySearch.addEventListener('input', () => {
        filterEntities();
      });
    }

    // Entity type filter
    const entityTypeFilter = document.getElementById('entity-type-filter');
    if (entityTypeFilter) {
      entityTypeFilter.addEventListener('change', () => {
        filterEntities();
      });
    }

    // Entity standalone filter
    const entityStandaloneFilter = document.getElementById('entity-standalone-filter');
    if (entityStandaloneFilter) {
      entityStandaloneFilter.addEventListener('change', () => {
        filterEntities();
      });
    }

    // Scroll event
    const virtualScrollContainer = document.getElementById('virtual-scroll-container');
    if (virtualScrollContainer) {
      let scrollTimeout;
      virtualScrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateVirtualScroll, 10);
      });
    }

    // Initialize virtual scroll on entities tab
    document.querySelector('[data-tab="entities"]').addEventListener('click', () => {
      setTimeout(() => {
        if (filteredEntities.length > 0 && !window.virtualScrollInitialized) {
          updateVirtualScroll();
          window.virtualScrollInitialized = true;
        }
      }, 100);
    });

    // D3.js Graph
    let simulation;
    let graphNodes, graphLinks, graphLabels;
    let allGraphData = graphData; // Store original data
    let filteredGraphData = { nodes: [], links: [] };
    let visibleTypes = new Set(['component', 'service', 'module', 'directive', 'pipe', 'external']);
    let showingTopOnly = true; // Start with top 100
    window.graphInitialized = false;

    function getNodeColor(type) {
      const colors = {
        component: '#3b82f6',      // Blue
        service: '#10b981',        // Green
        module: '#f59e0b',         // Amber
        directive: '#8b5cf6',      // Purple
        pipe: '#ec4899',           // Pink
        constant: '#f97316',       // Orange (InjectionTokens, constants)
        external: '#94a3b8',       // Gray (external packages)
        unresolved: '#ef4444',     // Red (unresolved dependencies)
        'internal-file': '#06b6d4' // Cyan (internal files, not entities)
      };
      return colors[type] || '#6b7280';
    }

    // Calculate node connectivity (degree)
    function calculateNodeDegrees() {
      const degrees = new Map();
      allGraphData.nodes.forEach(n => degrees.set(n.id, 0));

      allGraphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
        degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
      });

      return degrees;
    }

    // Filter graph data based on top N and visible types
    function filterGraphData(topN = null) {
      const degrees = calculateNodeDegrees();

      // Sort nodes by degree (connectivity)
      let sortedNodes = [...allGraphData.nodes].sort((a, b) => {
        return (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0);
      });

      // Apply top N filter if specified
      let nodesToShow = sortedNodes;
      if (topN) {
        nodesToShow = sortedNodes.slice(0, topN);
      }

      // Apply type filter
      nodesToShow = nodesToShow.filter(n => visibleTypes.has(n.type));

      const visibleNodeIds = new Set(nodesToShow.map(n => n.id));

      // Filter links to only include those between visible nodes
      const visibleLinks = allGraphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      });

      filteredGraphData = {
        nodes: nodesToShow,
        links: visibleLinks
      };

      updateNodeCount();
      return filteredGraphData;
    }

    // Update visible/total node count
    function updateNodeCount() {
      document.getElementById('visible-count').textContent = filteredGraphData.nodes.length;
      document.getElementById('total-count').textContent = allGraphData.nodes.length;
    }

    // Toggle entity type visibility
    function toggleEntityType(type) {
      const checkbox = document.getElementById('toggle-' + type);
      if (checkbox.checked) {
        visibleTypes.add(type);
      } else {
        visibleTypes.delete(type);
      }

      filterGraphData(showingTopOnly ? 100 : null);
      redrawGraph();
    }

    // Show all nodes
    function showAllNodes() {
      showingTopOnly = false;
      filterGraphData(null);
      redrawGraph();
    }

    // Show top 100 nodes
    function showTopNodes() {
      showingTopOnly = true;
      filterGraphData(100);
      redrawGraph();
    }

    // Redraw graph with filtered data
    function redrawGraph() {
      if (!window.graphInitialized) return;

      const container = document.getElementById('graph-container');
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Clear and reinitialize
      d3.select('#graph-container').selectAll('*').remove();
      initGraphWithData(width, height, filteredGraphData);
    }

    function initGraph() {
      // Apply initial filter (top 100)
      filterGraphData(100);

      const container = document.getElementById('graph-container');
      const width = container.clientWidth;
      const height = container.clientHeight;

      initGraphWithData(width, height, filteredGraphData);
      window.graphInitialized = true;
    }

    function initGraphWithData(width, height, data) {
      // Clear existing
      d3.select('#graph-container').selectAll('*').remove();

      const svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const g = svg.append('g');

      // Zoom
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);

      // Optimized simulation parameters for better layout
      simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(35))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05))
        .alphaDecay(0.02)
        .velocityDecay(0.3);

      // Links
      const link = g.append('g')
        .attr('class', 'graph-links')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('class', 'graph-link')
        .attr('stroke', d => {
          // Color links based on classification
          if (d.classification === 'external') return '#94a3b8';
          if (d.classification === 'unresolved') return '#ef4444';
          if (d.classification === 'internal-file') return '#06b6d4';
          return '#cbd5e1'; // Default for internal
        })
        .attr('stroke-opacity', d => {
          // Lower opacity for unresolved
          if (d.classification === 'unresolved') return 0.4;
          return 0.6;
        })
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', d => {
          // Dotted for unresolved, dashed for internal-file
          if (d.classification === 'unresolved') return '2,3';
          if (d.classification === 'internal-file') return '5,5';
          return null;
        });

      // Nodes
      const node = g.append('g')
        .attr('class', 'graph-nodes')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('class', 'graph-node')
        .attr('data-node-id', d => d.id)
        .attr('r', d => {
          // Sizing: unresolved/external smaller, internal-file medium, entities normal
          if (d.type === 'unresolved' || d.isExternal) return 5;
          if (d.type === 'internal-file') return 6;
          return 8;
        })
        .attr('fill', d => getNodeColor(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', d => {
          if (d.type === 'unresolved' || d.isExternal) return 1;
          if (d.type === 'internal-file') return 1.5;
          return 2;
        })
        .attr('stroke-dasharray', d => {
          // Dashed border for external, dotted for unresolved
          if (d.isExternal) return '3,3';
          if (d.type === 'unresolved') return '2,2';
          if (d.type === 'internal-file') return '4,2';
          return null;
        })
        .attr('opacity', d => {
          if (d.type === 'unresolved') return 0.6;
          if (d.isExternal) return 0.7;
          if (d.type === 'internal-file') return 0.8;
          return 1;
        })
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Labels
      const label = g.append('g')
        .attr('class', 'graph-labels')
        .selectAll('text')
        .data(data.nodes)
        .join('text')
        .attr('class', 'graph-label')
        .attr('data-node-id', d => d.id)
        .text(d => d.name)
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('fill', '#475569');

      // Tooltips
      node.append('title')
        .text(d => {
          if (d.isExternal) {
            return \`\${d.name}\\n\${d.packageName}\${d.version ? ' ' + d.version : ''}\\n(external dependency)\`;
          } else if (d.type === 'unresolved') {
            return \`\${d.name}\\n(unresolved dependency)\`;
          } else if (d.type === 'internal-file') {
            return \`\${d.name}\\n\${d.filePath || ''}\\n(internal file - not parsed entity)\`;
          } else {
            return \`\${d.name} (\${d.type})\`;
          }
        });

      // Tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });

      // Drag functions
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      // Graph search
      const graphSearch = document.getElementById('graph-search');
      if (graphSearch) {
        graphSearch.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase();
          node.attr('opacity', d =>
            d.name.toLowerCase().includes(query) ? 1 : 0.2
          );
          label.attr('opacity', d =>
            d.name.toLowerCase().includes(query) ? 1 : 0.2
          );
        });
      }

      // Store references for path finder
      graphNodes = node;
      graphLinks = link;
      graphLabels = label;
      window.graphInitialized = true;
    }

    // Path Finder Functions
    function togglePathFinder() {
      const panel = document.getElementById('path-finder-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function buildAdjacencyList() {
      const adj = new Map();
      graphData.nodes.forEach(n => adj.set(n.id, []));
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (adj.has(sourceId)) {
          adj.get(sourceId).push(targetId);
        }
      });
      return adj;
    }

    function bfs(sourceId, targetId, adjacencyList) {
      const queue = [[sourceId]];
      const visited = new Set([sourceId]);

      while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];

        if (node === targetId) {
          return path;
        }

        const neighbors = adjacencyList.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([...path, neighbor]);
          }
        }
      }

      return null;
    }

    function findPath() {
      // Initialize graph if not already done
      if (!window.graphInitialized) {
        initGraph();
      }

      const sourceName = document.getElementById('path-source').value.trim();
      const targetName = document.getElementById('path-target').value.trim();
      const resultDiv = document.getElementById('path-result');

      if (!sourceName || !targetName) {
        resultDiv.innerHTML = '<p style="color: #ef4444;">⚠️ Please enter both source and target entities.</p>';
        resultDiv.style.display = 'block';
        return;
      }

      const sourceNode = graphData.nodes.find(n =>
        n.name.toLowerCase().includes(sourceName.toLowerCase())
      );
      const targetNode = graphData.nodes.find(n =>
        n.name.toLowerCase().includes(targetName.toLowerCase())
      );

      if (!sourceNode) {
        resultDiv.innerHTML = \`<p style="color: #ef4444;">⚠️ Source entity "\${sourceName}" not found.</p>\`;
        resultDiv.style.display = 'block';
        return;
      }

      if (!targetNode) {
        resultDiv.innerHTML = \`<p style="color: #ef4444;">⚠️ Target entity "\${targetName}" not found.</p>\`;
        resultDiv.style.display = 'block';
        return;
      }

      if (sourceNode.id === targetNode.id) {
        resultDiv.innerHTML = '<p style="color: #f59e0b;">⚠️ Source and target are the same entity.</p>';
        resultDiv.style.display = 'block';
        return;
      }

      const adjacencyList = buildAdjacencyList();
      const path = bfs(sourceNode.id, targetNode.id, adjacencyList);

      if (!path) {
        resultDiv.innerHTML = \`<p style="color: #ef4444;">❌ No path found from <strong>\${sourceNode.name}</strong> to <strong>\${targetNode.name}</strong>.</p>\`;
        resultDiv.style.display = 'block';
        clearPath();
        return;
      }

      // Highlight path in graph
      const pathSet = new Set(path);
      const pathEdges = new Set();

      for (let i = 0; i < path.length - 1; i++) {
        pathEdges.add(\`\${path[i]}->\${path[i + 1]}\`);
      }

      // Re-select graph elements from DOM (D3 selections don't persist)
      const svg = d3.select('#graph-container svg');
      const nodes = svg.selectAll('.graph-node');
      const links = svg.selectAll('.graph-link');
      const labels = svg.selectAll('.graph-label');

      if (nodes.empty() || links.empty()) {
        resultDiv.innerHTML = '<p style="color: #ef4444;">⚠️ Graph not initialized. Please wait for the graph to load.</p>';
        resultDiv.style.display = 'block';
        return;
      }

      console.log('Path finder - highlighting path:', path);
      console.log('Path set:', pathSet);
      console.log('Path edges:', pathEdges);

      // Highlight nodes
      nodes.each(function(d) {
        const node = d3.select(this);
        const inPath = pathSet.has(d.id);
        node
          .attr('opacity', inPath ? 1 : 0.2)
          .attr('r', inPath ? 12 : 8)
          .attr('stroke-width', inPath ? 3 : 2);
      });

      // Highlight links
      links.each(function(d) {
        const link = d3.select(this);
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const inPath = pathEdges.has(\`\${sourceId}->\${targetId}\`);

        link
          .attr('stroke-opacity', inPath ? 1 : 0.15)
          .attr('stroke-width', inPath ? 3 : 1)
          .attr('stroke', inPath ? '#667eea' : '#cbd5e1');
      });

      // Highlight labels
      labels.each(function(d) {
        const label = d3.select(this);
        label.attr('opacity', pathSet.has(d.id) ? 1 : 0.2);
      });

      // Display path
      const pathNodes = path.map(id => graphData.nodes.find(n => n.id === id));
      const pathHtml = pathNodes.map((n, i) => {
        const arrow = i < pathNodes.length - 1 ? ' <span style="color: #667eea;">→</span> ' : '';
        return \`<strong>\${n.name}</strong> <span style="color: #94a3b8; font-size: 0.875rem;">(\${n.type})</span>\${arrow}\`;
      }).join('');

      resultDiv.innerHTML = \`
        <div style="margin-bottom: 0.5rem;">
          <strong style="color: #10b981;">✓ Path found (\${path.length} steps):</strong>
        </div>
        <div style="padding: 0.75rem; background: #f8fafc; border-radius: 4px; border-left: 3px solid #667eea;">
          \${pathHtml}
        </div>
      \`;
      resultDiv.style.display = 'block';
    }

    function clearPath() {
      // Re-select elements from DOM
      const svg = d3.select('#graph-container svg');
      const nodes = svg.selectAll('.graph-node');
      const links = svg.selectAll('.graph-link');
      const labels = svg.selectAll('.graph-label');

      nodes.attr('opacity', 1).attr('r', 8).attr('stroke-width', 2);
      links.attr('stroke-opacity', 0.6).attr('stroke-width', 1).attr('stroke', '#cbd5e1');
      labels.attr('opacity', 1);

      document.getElementById('path-source').value = '';
      document.getElementById('path-target').value = '';
      document.getElementById('path-result').style.display = 'none';
    }

    function resetGraph() {
      if (simulation) {
        simulation.alpha(1).restart();
      }
      document.getElementById('graph-search').value = '';
      d3.selectAll('circle').attr('opacity', 1);
      d3.selectAll('text').attr('opacity', 1);
    }

    // Charts initialization
    window.chartsInitialized = false;

    function initCharts() {
      ${this.generateChartScripts()}
      window.chartsInitialized = true;
    }

    // Virtual Scroll for Relationships
    const relationshipGroups = ${JSON.stringify(Array.from((() => {
      const grouped = new Map<string, Relationship[]>();
      this.graph.relationships.forEach((rel) => {
        if (!grouped.has(rel.type)) {
          grouped.set(rel.type, []);
        }
        grouped.get(rel.type)!.push(rel);
      });
      return Array.from(grouped).map(([type, rels], index) => ({
        type,
        index,
        relationships: rels.map(r => ({
          source: this.getEntityShortName(r.source),
          target: this.getEntityShortName(r.target)
        }))
      }));
    })()))};

    relationshipGroups.forEach(group => {
      let filteredRels = [...group.relationships];
      const REL_ROW_HEIGHT = 40;
      const REL_BUFFER = 5;

      function updateRelScroll() {
        const container = document.getElementById(\`rel-scroll-\${group.index}\`);
        const tbody = document.getElementById(\`rel-tbody-\${group.index}\`);
        const spacer = document.getElementById(\`rel-spacer-\${group.index}\`);

        if (!container || !tbody) return;

        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;

        const visibleStart = Math.max(0, Math.floor(scrollTop / REL_ROW_HEIGHT) - REL_BUFFER);
        const visibleEnd = Math.min(
          filteredRels.length,
          Math.ceil((scrollTop + containerHeight) / REL_ROW_HEIGHT) + REL_BUFFER
        );

        const visibleRels = filteredRels.slice(visibleStart, visibleEnd);

        tbody.innerHTML = visibleRels.map(rel => \`
          <tr style="height: \${REL_ROW_HEIGHT}px;">
            <td>\${rel.source}</td>
            <td style="text-align: center; color: #94a3b8;">→</td>
            <td>\${rel.target}</td>
          </tr>
        \`).join('');
        tbody.style.transform = \`translateY(\${visibleStart * REL_ROW_HEIGHT}px)\`;

        const totalHeight = filteredRels.length * REL_ROW_HEIGHT;
        spacer.style.height = \`\${totalHeight}px\`;
      }

      const container = document.getElementById(\`rel-scroll-\${group.index}\`);
      if (container) {
        let scrollTimeout;
        container.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(updateRelScroll, 10);
        });

        // Initialize on relationships tab
        document.querySelector('[data-tab="relationships"]').addEventListener('click', () => {
          setTimeout(updateRelScroll, 100);
        });
      }
    });

    // Relationship search
    const relSearch = document.getElementById('relationship-search');
    if (relSearch) {
      relSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        relationshipGroups.forEach(group => {
          group.relationships.forEach((rel, i) => {
            const matches = rel.source.toLowerCase().includes(query) ||
                          rel.target.toLowerCase().includes(query);
            const tbody = document.getElementById(\`rel-tbody-\${group.index}\`);
            if (tbody && tbody.children[i]) {
              tbody.children[i].style.display = matches ? '' : 'none';
            }
          });
        });
      });
    }

    // Diff Mode Functions
    const currentEntities = ${JSON.stringify(Array.from(this.graph.entities.values()).map(e => ({ id: e.id, name: e.name, type: e.type })))};

    function loadDiffFile() {
      const fileInput = document.getElementById('diff-file-input');
      const file = fileInput.files[0];

      if (!file) {
        alert('Please select a file to compare');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let previousEntities = [];

          if (file.name.endsWith('.json')) {
            const data = JSON.parse(content);
            previousEntities = data.entities || [];
          } else if (file.name.endsWith('.html')) {
            // Extract entities from HTML (look for embedded JSON)
            const match = content.match(/const allEntities = (\\[.*?\\]);/s);
            if (match) {
              previousEntities = JSON.parse(match[1]).map(e => e.entity);
            } else {
              alert('Could not extract entities from HTML file');
              return;
            }
          }

          compareDiff(previousEntities);
        } catch (error) {
          alert('Error loading file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }

    function compareDiff(previousEntities) {
      const prevMap = new Map(previousEntities.map(e => [e.id, e]));
      const currMap = new Map(currentEntities.map(e => [e.id, e]));

      const added = currentEntities.filter(e => !prevMap.has(e.id));
      const removed = previousEntities.filter(e => !currMap.has(e.id));
      const unchanged = currentEntities.filter(e => prevMap.has(e.id));
      const modified = []; // For simplicity, not detecting modifications

      // Update counts
      document.getElementById('diff-added-count').textContent = added.length;
      document.getElementById('diff-removed-count').textContent = removed.length;
      document.getElementById('diff-modified-count').textContent = modified.length;
      document.getElementById('diff-unchanged-count').textContent = unchanged.length;

      // Generate details
      let detailsHtml = '';

      if (added.length > 0) {
        detailsHtml += \`
          <div style="margin-bottom: 1.5rem;">
            <h4 style="color: #10b981; margin: 0 0 0.5rem 0;">✓ Added (\${added.length})</h4>
            <ul style="margin: 0; padding-left: 1.5rem;">
              \${added.map(e => \`<li><strong>\${e.name}</strong> <span style="color: #94a3b8;">(\${e.type})</span></li>\`).join('')}
            </ul>
          </div>
        \`;
      }

      if (removed.length > 0) {
        detailsHtml += \`
          <div style="margin-bottom: 1.5rem;">
            <h4 style="color: #ef4444; margin: 0 0 0.5rem 0;">✗ Removed (\${removed.length})</h4>
            <ul style="margin: 0; padding-left: 1.5rem;">
              \${removed.map(e => \`<li><strong>\${e.name}</strong> <span style="color: #94a3b8;">(\${e.type})</span></li>\`).join('')}
            </ul>
          </div>
        \`;
      }

      if (added.length === 0 && removed.length === 0) {
        detailsHtml = '<p style="color: #10b981; text-align: center; padding: 2rem;">✓ No changes detected</p>';
      }

      document.getElementById('diff-details').innerHTML = detailsHtml;
      document.getElementById('diff-result').style.display = 'block';
    }

    function clearDiff() {
      document.getElementById('diff-file-input').value = '';
      document.getElementById('diff-result').style.display = 'none';
    }
  </script>`;
  }

  private prepareGraphData(): { nodes: any[], links: any[] } {
    const nodes: any[] = [];
    const links: any[] = [];
    const externalNodes = new Map<string, any>();
    const unresolvedNodes = new Map<string, any>();
    const internalFileNodes = new Map<string, any>();

    // 1. Add project entities
    for (const entity of this.graph.entities.values()) {
      nodes.push({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        isExternal: false,
      });
    }

    const validIds = new Set(nodes.map(n => n.id));

    // 2. Process relationships and create virtual nodes
    for (const rel of this.graph.relationships) {
      // Internal relationship (both source and target are project entities)
      if (validIds.has(rel.source) && validIds.has(rel.target)) {
        links.push({
          source: rel.source,
          target: rel.target,
          type: rel.type,
          classification: 'internal',
        });
        continue;
      }

      // External relationship (classification = 'external')
      if (rel.metadata?.classification === 'external' && validIds.has(rel.source)) {
        const externalId = rel.target; // "external:@angular/core:ElementRef"

        // Create virtual node if not already created
        if (!externalNodes.has(externalId)) {
          externalNodes.set(externalId, {
            id: externalId,
            name: rel.metadata.originalName || 'Unknown',  // "ElementRef"
            type: 'external',
            packageName: rel.metadata.packageName, // "@angular/core"
            version: rel.metadata.version,         // "^19.0.0"
            isExternal: true,
          });
        }

        // Add the relationship
        links.push({
          source: rel.source,
          target: externalId,
          type: rel.type,
          classification: 'external',
        });
        continue;
      }

      // Unresolved relationship (classification = 'unresolved' OR metadata.unresolved = true)
      if ((rel.metadata?.classification === 'unresolved' || rel.metadata?.unresolved === true) && validIds.has(rel.source)) {
        const unresolvedId = rel.target; // "unresolved:UnknownType" or just selector name

        // Create virtual node if not already created
        if (!unresolvedNodes.has(unresolvedId)) {
          unresolvedNodes.set(unresolvedId, {
            id: unresolvedId,
            name: rel.metadata.originalName || rel.target.replace('unresolved:', ''),
            type: 'unresolved',
            isExternal: false,
          });
        }

        // Add the relationship
        links.push({
          source: rel.source,
          target: unresolvedId,
          type: rel.type,
          classification: 'unresolved',
        });
        continue;
      }

      // Internal-file relationship (classification = 'internal' but not resolved to entity)
      if (rel.metadata?.classification === 'internal' && rel.target.startsWith('internal-file:') && validIds.has(rel.source)) {
        const internalFileId = rel.target; // "internal-file:./path:Type"

        // Create virtual node if not already created
        if (!internalFileNodes.has(internalFileId)) {
          internalFileNodes.set(internalFileId, {
            id: internalFileId,
            name: rel.metadata.originalName || 'Internal File',
            type: 'internal-file',
            filePath: rel.metadata.resolvedPath,
            isExternal: false,
          });
        }

        // Add the relationship
        links.push({
          source: rel.source,
          target: internalFileId,
          type: rel.type,
          classification: 'internal-file',
        });
        continue;
      }

      // Fallback: relationship with valid source but unhandled target
      // (e.g., malformed providers, edge cases)
      if (validIds.has(rel.source)) {
        const fallbackId = rel.target;

        // Create virtual node if not already created
        if (!unresolvedNodes.has(fallbackId)) {
          unresolvedNodes.set(fallbackId, {
            id: fallbackId,
            name: rel.metadata?.originalName || String(fallbackId).substring(0, 50),
            type: 'unresolved',
            isExternal: false,
          });
        }

        // Add the relationship
        links.push({
          source: rel.source,
          target: fallbackId,
          type: rel.type,
          classification: 'unresolved',
        });
      }
    }

    // 3. Add virtual nodes to graph
    nodes.push(...Array.from(externalNodes.values()));
    nodes.push(...Array.from(unresolvedNodes.values()));
    nodes.push(...Array.from(internalFileNodes.values()));

    return { nodes, links };
  }

  private generateChartScripts(): string {
    const customAnalysis = (this.graph as any).customAnalysis;
    if (!customAnalysis) return '';

    const scripts: string[] = [];

    // Security chart
    const securityResults = customAnalysis.get('SecurityVisitor');
    if (securityResults && securityResults.byPattern) {
      const patterns = Object.entries(securityResults.byPattern);
      scripts.push(`
      const securityCtx = document.getElementById('security-chart');
      if (securityCtx) {
        new Chart(securityCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(patterns.map(([p]) => p))},
            datasets: [{
              label: 'Security Patterns',
              data: ${JSON.stringify(patterns.map(([, c]) => c))},
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }`);
    }

    // Performance chart
    const perfResults = customAnalysis.get('PerformanceVisitor');
    if (perfResults && perfResults.byPattern) {
      const patterns = Object.entries(perfResults.byPattern);
      scripts.push(`
      const perfCtx = document.getElementById('performance-chart');
      if (perfCtx) {
        new Chart(perfCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(patterns.map(([p]) => p.replace(/_/g, ' ')))},
            datasets: [{
              label: 'Performance Patterns',
              data: ${JSON.stringify(patterns.map(([, c]) => c))},
              backgroundColor: 'rgba(139, 92, 246, 0.8)',
              borderColor: 'rgba(139, 92, 246, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }`);
    }

    return scripts.join('\n');
  }

  // Helper methods
  private getEntityCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const entity of this.graph.entities.values()) {
      counts.set(entity.type, (counts.get(entity.type) || 0) + 1);
    }
    return counts;
  }

  private getEntityTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      component: 'UI Components',
      service: 'Injectable Services',
      module: 'NgModules',
      directive: 'Directives',
      pipe: 'Pipes',
    };
    return descriptions[type] || type;
  }

  private getEntityShortName(entityId: string): string {
    const parts = entityId.split(':');
    return parts[parts.length - 1] || entityId;
  }

  private hasVisitorResults(): boolean {
    const customAnalysis = (this.graph as any).customAnalysis;
    return customAnalysis && customAnalysis.size > 0;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private escapeHtml(text: string | undefined | null): string {
    if (text === undefined || text === null) return '';
    const str = String(text);
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  }
}
