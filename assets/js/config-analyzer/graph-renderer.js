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
    var height = Math.max(360, participants.length > 6 ? 520 : 420);

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
    var padY = 28;
    var nodeW = 170;
    var nodeH = 34;

    // For clearer graphs with many participants, we use a circular layout.
    // For 1-2 participants, keep a simple left/right layout.
    var positions = {};
    if (participants.length <= 2) {
      var leftX = padX;
      var rightX = width - padX - nodeW;
      var y0 = Math.max(padY, height / 2 - nodeH / 2);
      positions[participants[0]] = { x: leftX, y: y0, sideLeft: true };
      if (participants.length === 2) {
        positions[participants[1]] = { x: rightX, y: y0, sideLeft: false };
      }
    } else {
      var cx = width / 2;
      var cy = height / 2;
      var rx = Math.max(180, (width - 2 * padX - nodeW) / 2);
      var ry = Math.max(150, (height - 2 * padY - nodeH) / 2);
      for (var i = 0; i < participants.length; i++) {
        var name = participants[i];
        var angle = (2 * Math.PI * i) / participants.length - Math.PI / 2;
        var x = cx + rx * Math.cos(angle) - nodeW / 2;
        var y = cy + ry * Math.sin(angle) - nodeH / 2;
        positions[name] = { x: x, y: y, sideLeft: x < cx };
      }
    }

    // Merge edges between the same pair to reduce clutter:
    // label becomes "A, B, C" (unique) for multiple exchanges.
    var merged = {};
    flows.forEach(function (f) {
      if (!f || !f.from || !f.to) return;
      var key = f.from + "->" + f.to;
      if (!merged[key]) merged[key] = { from: f.from, to: f.to, labels: {} };
      var lab = f.label || "exchange";
      merged[key].labels[lab] = true;
    });
    var mergedEdges = Object.keys(merged).map(function (k) {
      var e = merged[k];
      var labels = Object.keys(e.labels);
      labels.sort();
      return { from: e.from, to: e.to, label: labels.join(", ") };
    });

    // Draw edges first (under nodes)
    mergedEdges.forEach(function (f) {
      var from = positions[f.from];
      var to = positions[f.to];
      if (!from || !to) return;

      var fromCenterX = from.x + nodeW / 2;
      var fromCenterY = from.y + nodeH / 2;
      var toCenterX = to.x + nodeW / 2;
      var toCenterY = to.y + nodeH / 2;

      // Connect from center to center using a quadratic-ish bezier.
      var dx = toCenterX - fromCenterX;
      var dy = toCenterY - fromCenterY;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var nx = -dy / dist;
      var ny = dx / dist;
      var bend = Math.min(90, Math.max(30, dist * 0.18));
      var c1x = fromCenterX + dx * 0.35 + nx * bend;
      var c1y = fromCenterY + dy * 0.35 + ny * bend;
      var c2x = fromCenterX + dx * 0.65 + nx * bend;
      var c2y = fromCenterY + dy * 0.65 + ny * bend;

      var path = createSvg("path");
      path.setAttribute(
        "d",
        "M " +
          fromCenterX +
          " " +
          fromCenterY +
          " C " +
          c1x +
          " " +
          c1y +
          ", " +
          c2x +
          " " +
          c2y +
          ", " +
          toCenterX +
          " " +
          toCenterY
      );
      path.setAttribute("class", "config-analyzer-graph-edge");
      path.setAttribute("marker-end", "url(#config-analyzer-arrow)");
      svg.appendChild(path);

      // Label near the midpoint
      var label = createSvg("text");
      label.setAttribute("class", "config-analyzer-graph-edge-label");
      var midX = (fromCenterX + toCenterX) / 2 + nx * (bend * 0.4);
      var midY = (fromCenterY + toCenterY) / 2 + ny * (bend * 0.4) - 6;
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

