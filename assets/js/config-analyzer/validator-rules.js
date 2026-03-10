// Linter rules for preCICE configuration logical validation.

(function (global) {
  "use strict";

  function makeMessage(type, text, options) {
    options = options || {};
    return {
      type: type, // "success" | "warning" | "error"
      text: text,
      hint: options.hint || null,
      nodeSignature: options.nodeSignature || null,
      line: options.line || null,
    };
  }

  function signatureForNode(node) {
    if (!node || node.nodeType !== 1) return null;
    var tag = node.tagName;
    var name = node.getAttribute && node.getAttribute("name");
    if (name) return tag + '[name="' + name + '"]';
    return tag;
  }

  function run(model, xmlText, xmlHelpers) {
    var messages = [];
    if (!model) {
      messages.push(makeMessage("error", "No configuration model could be built."));
      return messages;
    }

    // Indexes
    var meshNames = {};
    model.meshes.forEach(function (m) {
      meshNames[m.name] = (meshNames[m.name] || 0) + 1;
    });

    var participantNames = {};
    model.participants.forEach(function (p) {
      participantNames[p.name] = (participantNames[p.name] || 0) + 1;
    });

    var knownParticipants = {};
    Object.keys(participantNames).forEach(function (p) {
      knownParticipants[p] = true;
    });

    // Rule 4: duplicates
    Object.keys(meshNames).forEach(function (name) {
      if (meshNames[name] > 1) {
        messages.push(makeMessage("error", 'Duplicate mesh name detected: "' + name + '"'));
      }
    });

    Object.keys(participantNames).forEach(function (name) {
      if (participantNames[name] > 1) {
        messages.push(
          makeMessage("error", 'Duplicate participant name detected: "' + name + '"')
        );
      }
    });

    // Rule 3: participants without meshes
    model.participants.forEach(function (p) {
      if (!p.meshes || p.meshes.length === 0) {
        var sig = signatureForNode(p._node);
        messages.push(
          makeMessage("warning", 'Participant "' + p.name + '" does not use any mesh.', {
            nodeSignature: sig,
          })
        );
      }
    });

    // Rule 2: meshes unused (participants OR exchanges OR mappings)
    var usedMeshes = {};
    model.participants.forEach(function (p) {
      (p.meshes || []).forEach(function (m) {
        usedMeshes[m] = true;
      });
    });
    model.mappings.forEach(function (map) {
      if (map.from) usedMeshes[map.from] = true;
      if (map.to) usedMeshes[map.to] = true;
    });
    model.exchanges.forEach(function (ex) {
      if (ex.mesh) usedMeshes[ex.mesh] = true;
    });
    model.meshes.forEach(function (m) {
      if (!usedMeshes[m.name]) {
        messages.push(
          makeMessage("warning", 'Mesh "' + m.name + '" defined but never used.', {
            nodeSignature: signatureForNode(m._node),
          })
        );
      }
    });

    // Rule 1: mappings referencing undefined meshes
    model.mappings.forEach(function (map) {
      if (map.from && !meshNames[map.from]) {
        messages.push(
          makeMessage(
            "error",
            'Mapping "' + map.name + '" references undefined mesh "' + map.from + '" (from).',
            { nodeSignature: signatureForNode(map._node) }
          )
        );
      }
      if (map.to && !meshNames[map.to]) {
        messages.push(
          makeMessage(
            "error",
            'Mapping "' + map.name + '" references undefined mesh "' + map.to + '" (to).',
            { nodeSignature: signatureForNode(map._node) }
          )
        );
      }
    });

    // Rule 5: mappings without valid direction
    model.mappings.forEach(function (map) {
      if (!map.from || !map.to) {
        messages.push(
          makeMessage(
            "error",
            'Mapping "' + map.name + '" is missing a valid direction (from/to).',
            { nodeSignature: signatureForNode(map._node) }
          )
        );
        return;
      }
      if (map.from === map.to) {
        messages.push(
          makeMessage(
            "warning",
            'Mapping "' + map.name + '" maps from and to the same mesh "' + map.from + '".',
            { nodeSignature: signatureForNode(map._node) }
          )
        );
      }
    });

    // Rule 6: unknown participants referenced in exchanges
    model.exchanges.forEach(function (ex) {
      if (ex.from && !knownParticipants[ex.from]) {
        messages.push(
          makeMessage("error", 'Unknown participant "' + ex.from + '" referenced in exchange (from).', {
            nodeSignature: signatureForNode(ex._node),
          })
        );
      }
      if (ex.to && !knownParticipants[ex.to]) {
        messages.push(
          makeMessage("error", 'Unknown participant "' + ex.to + '" referenced in exchange (to).', {
            nodeSignature: signatureForNode(ex._node),
          })
        );
      }
    });

    // Rule 8: self data exchange (from == to)
    model.exchanges.forEach(function (ex) {
      if (!ex.from || !ex.to) return;
      if (ex.from === ex.to) {
        messages.push(
          makeMessage(
            "warning",
            'Participant "' + ex.from + '" is exchanging data with itself.',
            { nodeSignature: signatureForNode(ex._node) }
          )
        );
      }
    });

    // Rule 7: exchanges referencing undefined meshes
    model.exchanges.forEach(function (ex) {
      if (ex.mesh && !meshNames[ex.mesh]) {
        messages.push(
          makeMessage(
            "error",
            'Exchange references undefined mesh "' + ex.mesh + '".',
            { nodeSignature: signatureForNode(ex._node) }
          )
        );
      }
    });

    // Best-effort: attach line numbers if we can find stable tokens.
    if (xmlHelpers && xmlHelpers.getLineNumberForText && xmlText) {
      messages.forEach(function (msg) {
        if (msg.line) return;
        if (msg.nodeSignature && msg.nodeSignature.indexOf("participant") === 0) {
          msg.line = xmlHelpers.getLineNumberForText(xmlText, "<participant", 1);
        } else if (msg.nodeSignature && msg.nodeSignature.indexOf("mesh") === 0) {
          msg.line = xmlHelpers.getLineNumberForText(xmlText, "<mesh", 1);
        } else if (msg.nodeSignature && msg.nodeSignature.indexOf("mapping") === 0) {
          msg.line = xmlHelpers.getLineNumberForText(xmlText, "<mapping", 1);
        } else if (msg.nodeSignature && msg.nodeSignature.indexOf("exchange") === 0) {
          msg.line = xmlHelpers.getLineNumberForText(xmlText, "<exchange", 1);
        }
      });
    }

    if (messages.length === 0) {
      messages.push(makeMessage("success", "No lint issues detected by the current rule set."));
    }

    return messages;
  }

  global.preciceValidatorRules = {
    run: run,
  };
})(window);

