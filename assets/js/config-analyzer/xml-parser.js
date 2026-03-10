// XML parsing utilities for the preCICE config analyzer.
// Fully client-side and framework-free.

(function (global) {
  "use strict";

  function parseXml(xmlText) {
    var messages = [];

    if (!xmlText || !xmlText.trim()) {
      messages.push({
        type: "warning",
        text: "No XML configuration provided.",
      });
      return { ok: false, xmlDoc: null, messages: messages };
    }

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlText, "application/xml");

    var parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError && parseError.length > 0) {
      var errorText = (parseError[0].textContent || "Unknown XML parsing error.").trim();

      // Best-effort line extraction. Browser-dependent.
      var lineMatch =
        errorText.match(/(?:line|row)\s+(\d+)/i) ||
        errorText.match(/Line\s*:\s*(\d+)/i) ||
        errorText.match(/at\s+(\d+)/i);
      var line = lineMatch ? parseInt(lineMatch[1], 10) : null;

      messages.push({
        type: "error",
        title: "XML Parsing Error",
        text: (line ? "Line " + line + ": " : "") + errorText,
        line: line,
      });
      return { ok: false, xmlDoc: null, messages: messages };
    }

    messages.push({
      type: "success",
      text: "XML parsed successfully.",
    });

    return { ok: true, xmlDoc: xmlDoc, messages: messages };
  }

  function getLineNumberForText(text, searchText, occurrence) {
    if (!text || !searchText) return null;
    occurrence = occurrence || 1;
    var pos = 0;
    for (var n = 0; n < occurrence; n++) {
      var idx = text.indexOf(searchText, pos);
      if (idx === -1) return null;
      if (n === occurrence - 1) {
        var before = text.substring(0, idx);
        return (before.match(/\n/g) || []).length + 1;
      }
      pos = idx + 1;
    }
    return null;
  }

  function highlightLineInTextarea(textarea, lineNumber) {
    if (!textarea || !lineNumber || lineNumber < 1) return;
    var lines = textarea.value.split(/\r?\n/);
    if (lineNumber > lines.length) return;

    var lineIndex = lineNumber - 1;
    var start = 0;
    for (var i = 0; i < lineIndex; i++) {
      start += lines[i].length + 1;
    }
    var lineLength = lines[lineIndex].length;
    var end = start + lineLength;

    textarea.focus();
    textarea.setSelectionRange(start, end);

    var approxLineHeight = textarea.clientHeight / Math.max(1, textarea.rows);
    textarea.scrollTop = Math.max(0, (lineIndex - 2) * approxLineHeight);
  }

  global.preciceXmlParser = {
    parseXml: parseXml,
    getLineNumberForText: getLineNumberForText,
    highlightLineInTextarea: highlightLineInTextarea,
  };
})(window);

