// Build a simplified internal model from a preCICE configuration XML document.
// The model is designed for linting common logical issues, not for full schema coverage.

(function (global) {
  "use strict";

  function toArray(nodeList) {
    var result = [];
    if (!nodeList) return result;
    for (var i = 0; i < nodeList.length; i++) result.push(nodeList[i]);
    return result;
  }

  function isPrefixedWith(node, prefix) {
    if (!node) return false;
    if (node.prefix === prefix) return true;
    var name = node.nodeName || "";
    return name.indexOf(prefix + ":") === 0;
  }

  function getElementsByLocalName(root, localName) {
    if (!root || !localName) return [];
    if (typeof root.getElementsByTagNameNS === "function") {
      return toArray(root.getElementsByTagNameNS("*", localName));
    }
    var all = root.getElementsByTagName("*");
    var matches = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if ((el.localName || el.tagName) === localName) matches.push(el);
    }
    return matches;
  }

  function attr(node, name) {
    if (!node) return null;
    var v = node.getAttribute(name);
    return v != null && v !== "" ? v : null;
  }

  function buildModel(xmlDoc) {
    var root = xmlDoc ? xmlDoc.documentElement : null;
    if (!root) {
      return null;
    }

    var participants = [];
    var participantNodes = getElementsByLocalName(root, "participant");
    for (var i = 0; i < participantNodes.length; i++) {
      var p = participantNodes[i];
      var name = attr(p, "name") || "participant-" + (i + 1);

      var meshNames = [];
      var meshRefs = []
        .concat(getElementsByLocalName(p, "use-mesh"))
        .concat(getElementsByLocalName(p, "provide-mesh"))
        .concat(getElementsByLocalName(p, "receive-mesh"));
      for (var j = 0; j < meshRefs.length; j++) {
        var m = attr(meshRefs[j], "name");
        if (m) meshNames.push(m);
      }

      participants.push({
        name: name,
        meshes: unique(meshNames),
        _node: p,
      });
    }

    var meshes = [];
    var meshNodes = getElementsByLocalName(root, "mesh");
    for (var mi = 0; mi < meshNodes.length; mi++) {
      var mesh = meshNodes[mi];
      var meshName = attr(mesh, "name") || "mesh-" + (mi + 1);
      meshes.push({
        name: meshName,
        dimensions: attr(mesh, "dimensions"),
        _node: mesh,
      });
    }

    var mappings = [];
    var mappingNodes = getElementsByLocalName(root, "mapping");
    for (var k = 0; k < mappingNodes.length; k++) {
      var map = mappingNodes[k];
      mappings.push({
        name: attr(map, "name") || "mapping-" + (k + 1),
        from: attr(map, "from"),
        to: attr(map, "to"),
        type: attr(map, "type"),
        direction: attr(map, "direction"),
        _node: map,
      });
    }

    // Data exchanges are usually represented by <exchange ...> tags inside coupling schemes.
    var exchanges = [];
    var exchangeNodes = getElementsByLocalName(root, "exchange");
    for (var e = 0; e < exchangeNodes.length; e++) {
      var ex = exchangeNodes[e];
      exchanges.push({
        data: attr(ex, "data"),
        mesh: attr(ex, "mesh"),
        from: attr(ex, "from"),
        to: attr(ex, "to"),
        initialize: attr(ex, "initialize") === "yes",
        substeps: attr(ex, "substeps") === "yes",
        _node: ex,
      });
    }

    // Coupling schemes are namespaced tags like coupling-scheme:parallel-implicit.
    var schemes = [];
    var all = root.getElementsByTagName("*");
    for (var s = 0; s < all.length; s++) {
      var el = all[s];
      if (!isPrefixedWith(el, "coupling-scheme")) continue;

      var participantsInScheme = [];
      var participantsTags = getElementsByLocalName(el, "participants");
      for (var pIdx = 0; pIdx < participantsTags.length; pIdx++) {
        var pn = participantsTags[pIdx];
        var first = attr(pn, "first");
        var second = attr(pn, "second");
        if (first) participantsInScheme.push(first);
        if (second) participantsInScheme.push(second);
      }

      schemes.push({
        type: el.localName || el.tagName,
        name: attr(el, "name") || (el.localName || el.tagName),
        participants: unique(participantsInScheme),
        timeWindow:
          attr(el, "time-window-size") ||
          (function () {
            var tw = getElementsByLocalName(el, "time-window-size")[0];
            return tw ? attr(tw, "value") : null;
          })(),
        _node: el,
      });
    }

    var model = {
      participants: participants,
      meshes: meshes,
      mappings: mappings,
      exchanges: exchanges,
      couplingSchemes: schemes,
    };

    // Derived: data flow edges from exchanges (participants as nodes).
    model.dataFlows = exchanges
      .filter(function (ex) {
        return !!ex.from && !!ex.to;
      })
      .map(function (ex, idx) {
        return {
          id: "flow-" + idx,
          from: ex.from,
          to: ex.to,
          label: ex.data || "exchange",
          _node: ex._node,
        };
      });

    return model;
  }

  function unique(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!v) continue;
      if (seen[v]) continue;
      seen[v] = true;
      out.push(v);
    }
    return out;
  }

  global.preciceConfigModel = {
    build: buildModel,
  };
})(window);

