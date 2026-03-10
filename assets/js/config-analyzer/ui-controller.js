// UI controller: wires XML input -> parse -> model -> lint -> render tree/concepts/graph.

(function (global) {
  "use strict";

  var xmlParser = global.preciceXmlParser;
  var modelBuilder = global.preciceConfigModel;
  var rules = global.preciceValidatorRules;
  var treeView = global.preciceTreeView;
  var graph = global.preciceGraphRenderer;

  function byId(id) {
    return document.getElementById(id);
  }

  function setLoading(isLoading) {
    var el = byId("config-analyzer-loading");
    if (!el) return;
    el.hidden = !isLoading;
  }

  function readTextarea() {
    var t = byId("config-analyzer-textarea");
    return t ? t.value : "";
  }

  function setTextarea(text) {
    var t = byId("config-analyzer-textarea");
    if (t) t.value = text;
  }

  function switchTab(target) {
    var tabs = document.querySelectorAll(".config-analyzer-tab");
    var panels = document.querySelectorAll(".config-analyzer-tab-panel");

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.getAttribute("data-tab") === target) tab.classList.add("config-analyzer-tab-active");
      else tab.classList.remove("config-analyzer-tab-active");
    }
    for (var j = 0; j < panels.length; j++) {
      var panel = panels[j];
      if (panel.id === "config-analyzer-tab-" + target)
        panel.classList.add("config-analyzer-tab-panel-active");
      else panel.classList.remove("config-analyzer-tab-panel-active");
    }
  }

  function renderSummary(model, lintMessages) {
    var summary = byId("config-analyzer-summary");
    if (!summary) return;
    summary.innerHTML = "";

    if (!model) {
      summary.textContent = "No model available.";
      return;
    }

    var errors = (lintMessages || []).filter(function (m) {
      return m.type === "error";
    }).length;
    var warnings = (lintMessages || []).filter(function (m) {
      return m.type === "warning";
    }).length;

    var text =
      "Participants: " +
      model.participants.length +
      " · Meshes: " +
      model.meshes.length +
      " · Mappings: " +
      model.mappings.length +
      " · Exchanges: " +
      model.exchanges.length +
      " · Errors: " +
      errors +
      " · Warnings: " +
      warnings;
    summary.textContent = text;
  }

  function renderMessages(lintMessages, treeMap) {
    var container = byId("config-analyzer-messages");
    if (!container) return;
    container.innerHTML = "";

    if (!lintMessages || lintMessages.length === 0) {
      var p = document.createElement("p");
      p.className = "text-muted";
      p.textContent = "No messages.";
      container.appendChild(p);
      return;
    }

    lintMessages.forEach(function (msg) {
      var p = document.createElement("p");
      p.className =
        "config-analyzer-message " +
        (msg.type === "error"
          ? "config-analyzer-message-error"
          : msg.type === "warning"
            ? "config-analyzer-message-warning"
            : "config-analyzer-message-success");

      var icon = msg.type === "error" ? "❌ " : msg.type === "warning" ? "⚠ " : "✅ ";
      var prefix = "";
      if (msg.line) prefix = "Line " + msg.line + ": ";

      p.textContent = icon + prefix + msg.text;

      p.addEventListener("click", function () {
        var textarea = byId("config-analyzer-textarea");
        if (textarea && msg.line && xmlParser && xmlParser.highlightLineInTextarea) {
          xmlParser.highlightLineInTextarea(textarea, msg.line);
        }

        if (treeMap && msg.nodeSignature && treeMap.bySignature[msg.nodeSignature]) {
          switchTab("tree");
          treeView.highlightNode(treeMap, treeMap.bySignature[msg.nodeSignature]);
        }
      });

      container.appendChild(p);
    });
  }

  function renderConcepts(model) {
    var container = byId("config-analyzer-concepts");
    if (!container) return;
    container.innerHTML = "";

    if (!model) {
      var p = document.createElement("p");
      p.className = "text-muted";
      p.textContent = "Analyze a configuration to see extracted concepts.";
      container.appendChild(p);
      return;
    }

    container.appendChild(renderListSection("Participants", model.participants, function (item) {
      return {
        title: item.name,
        detail: item.meshes && item.meshes.length ? "Meshes: " + item.meshes.join(", ") : "No meshes",
      };
    }));

    container.appendChild(renderListSection("Meshes", model.meshes, function (item) {
      var details = [];
      if (item.dimensions) details.push("dim=" + item.dimensions);
      return {
        title: item.name,
        detail: details.length ? details.join(" · ") : "",
      };
    }));

    container.appendChild(renderListSection("Mappings", model.mappings, function (item) {
      var label = (item.from || "?") + " → " + (item.to || "?");
      return {
        title: item.name,
        detail: label,
      };
    }));
  }

  function renderListSection(title, items, mapItem) {
    var section = document.createElement("section");
    section.className = "config-analyzer-section";
    var h = document.createElement("h3");
    h.textContent = title;
    section.appendChild(h);

    if (!items || items.length === 0) {
      var empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "None detected.";
      section.appendChild(empty);
      return section;
    }

    var ul = document.createElement("ul");
    ul.className = "config-analyzer-list";
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "config-analyzer-list-item";
      var mapped = mapItem(it);
      var t = document.createElement("div");
      t.className = "config-analyzer-entity-title";
      t.textContent = mapped.title;
      li.appendChild(t);
      if (mapped.detail) {
        var d = document.createElement("div");
        d.className = "config-analyzer-entity-detail";
        d.textContent = mapped.detail;
        li.appendChild(d);
      }
      ul.appendChild(li);
    });
    section.appendChild(ul);
    return section;
  }

  function analyze() {
    if (!xmlParser || !modelBuilder || !rules || !treeView || !graph) return;

    setLoading(true);
    // Yield to the browser to update the loading indicator.
    setTimeout(function () {
      var xmlText = readTextarea();
      var parse = xmlParser.parseXml(xmlText);

      if (!parse.ok) {
        renderSummary(null, parse.messages);
        renderMessages(parse.messages, null);
        var treeRoot = byId("config-analyzer-tree-root");
        if (treeRoot) treeRoot.textContent = "No XML document loaded yet.";
        renderConcepts(null);
        var graphRoot = byId("config-analyzer-graph");
        if (graphRoot) graphRoot.innerHTML = "";

        // Highlight parse error line if available.
        var textarea = byId("config-analyzer-textarea");
        var first = parse.messages && parse.messages[0];
        if (textarea && first && first.line) {
          xmlParser.highlightLineInTextarea(textarea, first.line);
        }

        setLoading(false);
        return;
      }

      var model = modelBuilder.build(parse.xmlDoc);
      var lintMessages = rules.run(model, xmlText, xmlParser);

      var treeRootEl = byId("config-analyzer-tree-root");
      var treeMap = treeView.makeTree(parse.xmlDoc, treeRootEl);

      renderConcepts(model);
      graph.render(
        byId("config-analyzer-graph"),
        model.participants.map(function (p) {
          return p.name;
        }),
        model.dataFlows
      );

      renderSummary(model, lintMessages);
      renderMessages(lintMessages, treeMap);

      setLoading(false);
    }, 0);
  }

  function loadExample() {
    var example = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<precice-configuration>',
      '  <participants>',
      '    <participant name="FluidSolver">',
      '      <use-mesh name="Fluid-Mesh" />',
      "    </participant>",
      '    <participant name="StructureSolver">',
      '      <use-mesh name="Solid-Mesh" />',
      "    </participant>",
      "  </participants>",
      "  <meshes>",
      '    <mesh name="Fluid-Mesh" dimensions="3" />',
      '    <mesh name="Solid-Mesh" dimensions="3" />',
      '    <mesh name="Interface-Mesh" dimensions="2" />',
      "  </meshes>",
      "  <mappings>",
      '    <mapping name="Fluid-to-Structure" from="Fluid-Mesh" to="Solid-Mesh" type="nearest-neighbor" />',
      "  </mappings>",
      '  <coupling-scheme:parallel-implicit name="FSI-Implicit">',
      '    <time-window-size value="0.01" />',
      '    <participants first="FluidSolver" second="StructureSolver" />',
      '    <exchange data="Force" mesh="Interface-Mesh" from="FluidSolver" to="StructureSolver" initialize="yes" />',
      '    <exchange data="Displacement" mesh="Interface-Mesh" from="StructureSolver" to="FluidSolver" />',
      "  </coupling-scheme:parallel-implicit>",
      "</precice-configuration>",
      "",
    ].join("\n");

    setTextarea(example);
    analyze();
  }

  function handleFileSelected(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      setTextarea(e.target.result || "");
      analyze();
    };
    reader.readAsText(file);
  }

  function attachHandlers() {
    var analyzeButton = byId("config-analyzer-analyze-button");
    var exampleButton = byId("config-analyzer-load-example-button");
    var fileInput = byId("config-analyzer-file-input");

    if (analyzeButton) {
      analyzeButton.addEventListener("click", function (e) {
        e.preventDefault();
        analyze();
      });
    }
    if (exampleButton) {
      exampleButton.addEventListener("click", function (e) {
        e.preventDefault();
        loadExample();
      });
    }
    if (fileInput) {
      fileInput.addEventListener("change", handleFileSelected);
    }

    var tabs = document.querySelectorAll(".config-analyzer-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (e) {
        e.preventDefault();
        var target = this.getAttribute("data-tab");
        if (target) switchTab(target);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachHandlers);
  } else {
    attachHandlers();
  }
})(window);

