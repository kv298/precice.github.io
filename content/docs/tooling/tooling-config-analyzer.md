---
title: Advanced preCICE Configuration Linter & Analyzer (browser)
permalink: tooling-config-analyzer.html
keywords: tooling, xml, configuration, validation, linter, analyzer
summary: "Analyze preCICE configuration files in your browser and detect common logical problems before running simulations."
toc: false
---

The **Advanced preCICE Configuration Linter &amp; Analyzer** is a lightweight, fully client-side tool to
inspect `precice-config.xml` files and detect common *logical* configuration problems before you run a simulation.

<div class="config-analyzer">
  <div class="config-analyzer-main">
    <section class="config-analyzer-panel config-analyzer-panel-left">
      <h2>Configuration input</h2>
      <p>Upload a file, paste the configuration, or load an example.</p>

      <div class="config-analyzer-input-row">
        <label class="config-analyzer-file-label">
          <span>Select precice-config.xml</span>
          <input id="config-analyzer-file-input" type="file" accept=".xml,text/xml" />
        </label>
        <button id="config-analyzer-load-example-button" class="btn btn-default">
          Load example
        </button>
        <button id="config-analyzer-analyze-button" class="btn btn-primary">
          Analyze configuration
        </button>
        <span id="config-analyzer-loading" class="config-analyzer-loading" aria-live="polite" hidden>
          Analyzing…
        </span>
      </div>

      <textarea id="config-analyzer-textarea"
                class="form-control config-analyzer-textarea"
                rows="18"
                spellcheck="false"
                placeholder="Paste your preCICE XML configuration here..."></textarea>
    </section>

    <section class="config-analyzer-panel config-analyzer-panel-right">
      <h2>Analysis output</h2>

      <div class="config-analyzer-tabs" role="tablist">
        <button class="config-analyzer-tab config-analyzer-tab-active" data-tab="tree" type="button">
          XML tree
        </button>
        <button class="config-analyzer-tab" data-tab="concepts" type="button">
          Configuration concepts
        </button>
        <button class="config-analyzer-tab" data-tab="graph" type="button">
          Coupling graph
        </button>
      </div>

      <div class="config-analyzer-tab-panels">
        <div id="config-analyzer-tab-tree" class="config-analyzer-tab-panel config-analyzer-tab-panel-active" role="tabpanel">
          <div id="config-analyzer-tree-root" class="config-analyzer-tree-root"></div>
        </div>

        <div id="config-analyzer-tab-concepts" class="config-analyzer-tab-panel" role="tabpanel">
          <div id="config-analyzer-concepts" class="config-analyzer-concepts"></div>
        </div>

        <div id="config-analyzer-tab-graph" class="config-analyzer-tab-panel" role="tabpanel">
          <div id="config-analyzer-graph" class="config-analyzer-graph"></div>
        </div>
      </div>
    </section>
  </div>

  <section class="config-analyzer-results" aria-live="polite">
    <h3>Configuration analysis</h3>
    <div id="config-analyzer-summary" class="config-analyzer-summary"></div>
    <div id="config-analyzer-messages" class="config-analyzer-messages"></div>
  </section>
</div>

<p class="small text-muted">
All processing happens locally in your browser. No configuration data is uploaded to any server.
</p>

<link rel="stylesheet" href="/assets/css/config-analyzer.css">
<script src="/assets/js/config-analyzer/xml-parser.js"></script>
<script src="/assets/js/config-analyzer/config-model.js"></script>
<script src="/assets/js/config-analyzer/validator-rules.js"></script>
<script src="/assets/js/config-analyzer/tree-view.js"></script>
<script src="/assets/js/config-analyzer/graph-renderer.js"></script>
<script src="/assets/js/config-analyzer/ui-controller.js"></script>

