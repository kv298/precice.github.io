// Collapsible XML tree view for the config analyzer.
// Provides a lookup map by a simple signature (tag + optional [name="..."]).

(function (global) {
  "use strict";

  function createElement(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null && text !== "") el.textContent = text;
    return el;
  }

  function formatAttributes(node) {
    if (!node || !node.attributes || node.attributes.length === 0) return "";
    var parts = [];
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i];
      parts.push(a.name + '="' + a.value + '"');
    }
    return parts.join(" ");
  }

  function hasElementChildren(node) {
    if (!node || !node.childNodes) return false;
    for (var i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType === 1) return true;
    }
    return false;
  }

  function signatureForNode(node) {
    if (!node || node.nodeType !== 1) return null;
    var tag = node.tagName;
    var name = node.getAttribute && node.getAttribute("name");
    if (name) return tag + '[name="' + name + '"]';
    return tag;
  }

  function makeTree(xmlDoc, container) {
    container.innerHTML = "";
    var map = { bySignature: {}, byId: {} };

    if (!xmlDoc || !xmlDoc.documentElement) {
      container.textContent = "No XML document loaded yet.";
      return map;
    }

    var root = xmlDoc.documentElement;
    var treeRoot = createElement("ul", "config-analyzer-tree");
    var rootLi = buildNode(root, "0", map);
    if (rootLi) {
      rootLi.setAttribute("data-expanded", "true");
      var children = rootLi.querySelector(".config-analyzer-tree-children");
      var toggle = rootLi.querySelector(".config-analyzer-tree-toggle");
      if (children && toggle) {
        children.style.display = "block";
        toggle.textContent = "▾";
      }
      treeRoot.appendChild(rootLi);
    }
    container.appendChild(treeRoot);
    return map;
  }

  function buildNode(node, id, map) {
    if (node.nodeType !== 1 && node.nodeType !== 3) return null;

    if (node.nodeType === 3) {
      var text = node.nodeValue || "";
      var trimmed = text.replace(/\s+/g, " ").trim();
      if (!trimmed) return null;
      return createElement("li", "config-analyzer-tree-text", trimmed);
    }

    var li = createElement("li", "config-analyzer-tree-node");
    li.setAttribute("data-node-id", id);
    map.byId[id] = li;

    var sig = signatureForNode(node);
    if (sig && !map.bySignature[sig]) {
      map.bySignature[sig] = id;
    }

    var hasChildren = hasElementChildren(node);
    var header = createElement(
      "div",
      "config-analyzer-tree-header" + (hasChildren ? " config-analyzer-tree-header-toggle" : "")
    );

    if (hasChildren) {
      header.appendChild(createElement("span", "config-analyzer-tree-toggle", "▾"));
    } else {
      header.appendChild(createElement("span", "config-analyzer-tree-toggle-spacer", ""));
    }

    var label = "<" + node.nodeName;
    var attrs = formatAttributes(node);
    if (attrs) label += " " + attrs;
    label += ">";
    header.appendChild(createElement("span", "config-analyzer-tree-label", label));
    li.appendChild(header);

    var childrenUl = createElement("ul", "config-analyzer-tree-children");
    var childIndex = 0;
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      var childLi = buildNode(child, id + "." + childIndex, map);
      if (childLi) {
        childrenUl.appendChild(childLi);
        childIndex++;
      }
    }
    if (childrenUl.childNodes.length > 0) {
      li.appendChild(childrenUl);
    }

    if (hasChildren) {
      header.addEventListener("click", function () {
        var expanded = li.getAttribute("data-expanded") !== "false";
        var newExpanded = !expanded;
        li.setAttribute("data-expanded", newExpanded ? "true" : "false");
        var toggleIcon = header.querySelector(".config-analyzer-tree-toggle");
        var children = li.querySelector(".config-analyzer-tree-children");
        if (toggleIcon && children) {
          toggleIcon.textContent = newExpanded ? "▾" : "▸";
          children.style.display = newExpanded ? "block" : "none";
        }
      });
    }

    return li;
  }

  function highlightNode(treeMap, nodeId) {
    if (!treeMap || !nodeId) return;
    Object.keys(treeMap.byId).forEach(function (id) {
      var el = treeMap.byId[id];
      if (el) {
        var header = el.querySelector(".config-analyzer-tree-header");
        if (header) header.classList.remove("config-analyzer-tree-highlight");
      }
    });
    var li = treeMap.byId[nodeId];
    if (!li) return;

    // Expand ancestors
    var parts = nodeId.split(".");
    for (var i = parts.length - 1; i >= 1; i--) {
      var parentId = parts.slice(0, i).join(".");
      var parentLi = treeMap.byId[parentId];
      if (!parentLi) continue;
      parentLi.setAttribute("data-expanded", "true");
      var parentHeader = parentLi.querySelector(".config-analyzer-tree-header");
      var toggleIcon = parentLi.querySelector(".config-analyzer-tree-toggle");
      var children = parentLi.querySelector(".config-analyzer-tree-children");
      if (toggleIcon && children) {
        toggleIcon.textContent = "▾";
        children.style.display = "block";
      }
      if (parentHeader) parentHeader.classList.add("config-analyzer-tree-highlight");
    }

    var header = li.querySelector(".config-analyzer-tree-header");
    if (header) {
      header.classList.add("config-analyzer-tree-highlight");
      header.scrollIntoView({ block: "center" });
    }
  }

  global.preciceTreeView = {
    makeTree: makeTree,
    highlightNode: highlightNode,
  };
})(window);

