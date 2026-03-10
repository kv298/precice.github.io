// Minimal SVG graph renderer for participant data exchanges.
// No external dependencies.

(function (global) {
  "use strict";

  function render(container, participants, flows) {
    if (!container) return;
    container.innerHTML = "";

    participants = participants || [];
    flows = flows || [];

    if (participants.length === 0) {
      var p = document.createElement("p");
      p.className = "text-muted";
      p.textContent = "No participants found to render a coupling graph.";
      container.appendChild(p);
      return;
    }

    var width = Math.max(640, container.clientWidth || 640);
    var height = Math.max(360, participants.length * 70);

    var svg = createSvg("svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    var defs = createSvg("defs");
    var marker = createSvg("marker");
    marker.setAttribute("id", "config-analyzer-arrow");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("orient", "auto");
    var arrowPath = createSvg("path");
    arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    arrowPath.setAttribute("fill", "#5a6470");
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    var padX = 28;
    var padY = 22;
    var nodeW = 170;
    var nodeH = 34;
    var leftX = padX;
    var rightX = width - padX - nodeW;
    var columnGap = rightX - leftX - nodeW;

    // Place participants alternately left/right to reduce edge overlap.
    var positions = {};
    for (var i = 0; i < participants.length; i++) {
      var name = participants[i];
      var sideLeft = i % 2 === 0;
      var x = sideLeft ? leftX : rightX;
      var y = padY + i * 60;
      positions[name] = { x: x, y: y, sideLeft: sideLeft };
    }

    // Draw edges first (under nodes)
    flows.forEach(function (f) {
      var from = positions[f.from];
      var to = positions[f.to];
      if (!from || !to) return;

      var fromX = from.x + (from.sideLeft ? nodeW : 0);
      var toX = to.x + (to.sideLeft ? 0 : nodeW);
      var fromY = from.y + nodeH / 2;
      var toY = to.y + nodeH / 2;

      var c1x = fromX + (from.sideLeft ? columnGap * 0.35 : -columnGap * 0.35);
      var c2x = toX + (to.sideLeft ? columnGap * 0.35 : -columnGap * 0.35);

      var path = createSvg("path");
      path.setAttribute(
        "d",
        "M " +
          fromX +
          " " +
          fromY +
          " C " +
          c1x +
          " " +
          fromY +
          ", " +
          c2x +
          " " +
          toY +
          ", " +
          toX +
          " " +
          toY
      );
      path.setAttribute("class", "config-analyzer-graph-edge");
      path.setAttribute("marker-end", "url(#config-analyzer-arrow)");
      svg.appendChild(path);

      // Label near the midpoint
      var label = createSvg("text");
      label.setAttribute("class", "config-analyzer-graph-edge-label");
      var midX = (fromX + toX) / 2;
      var midY = (fromY + toY) / 2 - 6;
      label.setAttribute("x", String(midX));
      label.setAttribute("y", String(midY));
      label.setAttribute("text-anchor", "middle");
      label.textContent = f.label || "exchange";
      svg.appendChild(label);
    });

    // Draw nodes
    participants.forEach(function (name) {
      var pos = positions[name];
      if (!pos) return;
      var g = createSvg("g");

      var rect = createSvg("rect");
      rect.setAttribute("x", String(pos.x));
      rect.setAttribute("y", String(pos.y));
      rect.setAttribute("rx", "6");
      rect.setAttribute("ry", "6");
      rect.setAttribute("width", String(nodeW));
      rect.setAttribute("height", String(nodeH));
      rect.setAttribute("class", "config-analyzer-graph-node");
      g.appendChild(rect);

      var text = createSvg("text");
      text.setAttribute("x", String(pos.x + nodeW / 2));
      text.setAttribute("y", String(pos.y + nodeH / 2 + 4));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "config-analyzer-graph-node-text");
      text.textContent = name;
      g.appendChild(text);

      svg.appendChild(g);
    });

    container.appendChild(svg);
  }

  function createSvg(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  global.preciceGraphRenderer = {
    render: render,
  };
})(window);

