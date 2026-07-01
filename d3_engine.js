<!-- ═══════════════════════════════════════════════════════════
     D3 图谱引擎 (clean rewrite with diagnostics)
     ═══════════════════════════════════════════════════════════ -->
<script>
(function () {
  var GROUP_CONFIG = {
    weather: { label: "天气/现象", color: "#f43f5e", radius: 24 },
    geo:     { label: "地理/区域", color: "#10b981", radius: 22 },
    impact:  { label: "损失/影响", color: "#f59e0b", radius: 22 },
    data:    { label: "数据/观测", color: "#3b82f6", radius: 20 },
    factor:  { label: "因素/过程", color: "#8b5cf6", radius: 20 }
  };
  var REL_COL = { cause: "#9b59b6", drive: "#e84393", result_in: "#2ecc71", constitute: "#3498db", attribute_to: "#f39c12", trigger: "#ff6b6b", aggravate: "#95a5a6", render: "#95a5a6" };
  var LINK_DIST = 160, MANY_BODY = -500, COLLIDE_PAD = 14;
  var svgEl, svg, gMain, zoom, sim, nodeData = [], linkData = [], selectedId = null, adj = {};

  function normS(s) { s = (s || "").toLowerCase(); return /strong|high/i.test(s) ? "strong" : /weak/i.test(s) ? "weak" : "weak"; }
  var SW = { weak: 1.2, moderate: 2.4, strong: 3.6 };
  var HW = { weak: 1.4, moderate: 2.6, strong: 3.8 };
  var GW = { weak: 2.0, moderate: 3.6, strong: 4.8 };

  function buildAdj() { adj = {}; for (var i = 0; i < linkData.length; i++) { var a = linkData[i].source.id, b = linkData[i].target.id; (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); } }
  function getReachable(id) { var v = new Set([id]), q = [id]; while (q.length) { var c = q.shift(); (adj[c] || []).forEach(function (nb) { if (!v.has(nb)) { v.add(nb); q.push(nb); } }); } return v; }

  function edgePath(d) {
    var sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
    var dx = tx - sx, dy = ty - sy, dist = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / dist, uy = dy / dist, gap = 2;
    return "M" + (sx + (d.source.radius + gap) * ux) + "," + (sy + (d.source.radius + gap) * uy) + " L" + (tx - (d.target.radius + gap + 12) * ux) + "," + (ty - (d.target.radius + gap + 12) * uy);
  }

  function initGraph() {
    var G = window.GRAPH_CAUSAL; if (!G) return setTimeout(initGraph, 100);
    nodeData = G.nodes.map(function (n) { var c = GROUP_CONFIG[n.group] || GROUP_CONFIG.factor; return { id: n.id, label: n.label, group: n.group || "factor", radius: c.radius, color: c.color, original: n }; });
    var idMap = {}; nodeData.forEach(function (n) { idMap[n.id] = n; });
    linkData = G.edges.map(function (e, i) { return { id: "l" + i, source: idMap[e.from], target: idMap[e.to], type: e.relation || "cause", desc: e.desc || "", strength: normS(e.strength), rawStrength: e.strength || "", timeLag: e.timeLag || "", mechanism: e.mechanism || "" }; });
    buildAdj();

    document.getElementById("hdr-node-count").textContent = nodeData.length;
    document.getElementById("hdr-edge-count").textContent = linkData.length;
    document.getElementById("hdr-node-val").textContent = nodeData.length;
    document.getElementById("hdr-edge-val").textContent = linkData.length;
    var rts = {}; linkData.forEach(function (l) { rts[l.type] = (rts[l.type] || 0) + 1; });
    document.getElementById("hdr-rel-types").textContent = Object.keys(rts).length;

    svgEl = document.getElementById("graph-svg");
    var rect = svgEl.getBoundingClientRect(), W = rect.width || 900, H = rect.height || 700;
    svg = d3.select("#graph-svg"); svg.selectAll("*").remove();
    gMain = svg.append("g");

    zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", function (e) { gMain.attr("transform", e.transform); document.getElementById("zoom-val").textContent = Math.round(e.transform.k * 100) + "%"; });
    svg.call(zoom).on("dblclick.zoom", null);

    var defs = svg.append("defs");
    defs.append("radialGradient").attr("id", "causal-bg").attr("cx", "50%").attr("cy", "50%").attr("r", "60%").selectAll("stop").data([{o:0,c:"rgba(59,130,246,0.06)"},{o:1,c:"rgba(0,0,0,0)"}]).enter().append("stop").attr("offset", function (d) { return d.o * 100 + "%"; }).attr("stop-color", function (d) { return d.c; });
    gMain.append("rect").attr("x", -W * 2).attr("y", -H * 2).attr("width", W * 5).attr("height", H * 5).attr("fill", "url(#causal-bg)");

    Object.keys(rts).forEach(function (t) {
      var c = REL_COL[t] || "#94a3b8";
      defs.append("marker").attr("id", "arr-" + t).attr("viewBox", "0 -4 8 8").attr("refX", 8).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto").append("path").attr("d", "M0,-3L8,0L0,3").attr("fill", c).attr("opacity", 0.55);
      defs.append("marker").attr("id", "arr-hl-" + t).attr("viewBox", "0 -4 8 8").attr("refX", 8).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto").append("path").attr("d", "M0,-3L8,0L0,3").attr("fill", c).attr("opacity", 1);
    });

    sim = d3.forceSimulation(nodeData).force("link", d3.forceLink(linkData).id(function (d) { return d.id; }).distance(LINK_DIST)).force("charge", d3.forceManyBody().strength(MANY_BODY)).force("center", d3.forceCenter(W / 2, H / 2)).force("collide", d3.forceCollide().radius(function (d) { return d.radius + COLLIDE_PAD; }));
    draw(); fitView();
  }

  function draw() {
    console.log("[draw] start: " + nodeData.length + " nodes, " + linkData.length + " edges");

    /* 边 */
    var linkG = gMain.append("g").attr("class", "links").selectAll("g").data(linkData).enter().append("g").attr("class", "link-group");
    linkG.on("click", function (ev, d) { ev.stopPropagation(); showEdge(d); });
    linkG.on("mouseenter", function (ev, d) { showEdgeLabel(d, d3.select(this)); });
    linkG.on("mouseleave", function () { d3.select(this).select(".link-label-wrap").remove(); });
    linkG.append("path").attr("class", "link-path").attr("stroke", function (d) { return REL_COL[d.type] || "#94a3b8"; }).attr("stroke-width", function (d) { return SW[d.strength] || 1.2; }).attr("fill", "none").attr("opacity", 0.4).attr("marker-end", function (d) { return "url(#arr-" + d.type + ")"; });
    linkG.append("path").attr("class", "link-glow").attr("stroke-width", function (d) { return GW[d.strength] || 2.0; }).attr("fill", "none").attr("opacity", 0);
    linkG.each(function (d) { var g = d3.select(this); for (var k = 0; k < 2; k++) { g.append("polygon").attr("points", "-2.5,-2.5 2.5,-2.5 0,4").attr("fill", REL_COL[d.type] || "#60a5fa").attr("opacity", 0).attr("class", "link-flow"); } });
    console.log("[draw] links: " + gMain.selectAll(".links g").size());

    /* 节点 */
    var nodeSel = gMain.append("g").attr("class", "nodes").selectAll("g").data(nodeData).enter().append("g").attr("class", "node-group");
    console.log("[draw] node enter done, count: " + gMain.selectAll(".nodes g").size());

    nodeSel.call(d3.drag().on("start", function (ev, d) { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }).on("drag", function (ev, d) { d.fx = ev.x; d.fy = ev.y; }).on("end", function (ev, d) { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    nodeSel.on("click", function (ev, d) { ev.stopPropagation(); if (selectedId === d.id) { selectedId = null; resetHL(); closeDrawer(); } else { selectedId = d.id; showNode(d); hlById(d.id); } });
    nodeSel.on("mouseenter", function (ev, d) { if (!selectedId) hlById(d.id); });
    nodeSel.on("mouseleave", function () { if (!selectedId) resetHL(); });

    nodeSel.append("circle").attr("class", "node-glow").attr("r", function (d) { return d.radius + 3; }).attr("fill", function (d) { return d.color; }).attr("fill-opacity", 0.12).attr("stroke", "none").style("filter", "blur(6px)");
    nodeSel.append("circle").attr("class", "node-circle").attr("r", function (d) { return d.radius; }).attr("fill", function (d) { return d.color; }).attr("fill-opacity", 0.55).attr("stroke", function (d) { return d.color; }).attr("stroke-width", 1.5);
    nodeSel.append("text").attr("class", "node-label").attr("dy", function (d) { return d.radius + 16; }).attr("text-anchor", "middle").text(function (d) { return d.label.length > 30 ? d.label.slice(0, 28) + "..." : d.label; });
    console.log("[draw] nodes rendered, circles: " + document.querySelectorAll(".node-circle").length);

    /* 构建侧边栏树 */
    if (!_treeBuilt) { buildTree(); _treeBuilt = true; }

    svg.on("click", function () { selectedId = null; resetHL(); document.getElementById("drawer-body").innerHTML = "<div class=\"drawer-empty\"><div class=\"drawer-empty-icon\">⬡</div>点击图谱中的节点或边查看详情</div>"; closeDrawer(); });

    /* tick */
    sim.on("tick", function () {
      linkG.each(function (d) { var p = edgePath(d); d3.select(this).select(".link-path").attr("d", p); d3.select(this).select(".link-glow").attr("d", p); });
      nodeSel.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    /* 流动箭头动画 */
    var flowPhase = 0;
    (function loop() { flowPhase += 0.012; linkG.each(function (d) { var el = d3.select(this); el.selectAll(".link-flow").each(function (_, i) { var t = ((flowPhase + i * 0.5) % 1 + 1) % 1; d3.select(this).attr("transform", "translate(" + (d.source.x + (d.target.x - d.source.x) * t) + "," + (d.source.y + (d.target.y - d.source.y) * t) + ") rotate(" + (Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) + ")"); }); }); requestAnimationFrame(loop); })();
  }

  /* hover 边 */
  function showEdgeLabel(d, sel) { sel.select(".link-path").attr("opacity", 0.9).attr("stroke-width", HW[d.strength] || 1.4).attr("marker-end", function () { return "url(#arr-hl-" + d.type + ")"; }); sel.select(".link-glow").attr("opacity", 0.25).attr("stroke", REL_COL[d.type] || "#60a5fa").attr("stroke-width", GW[d.strength] || 2.0); sel.selectAll(".link-flow").attr("opacity", 0.9); var mx = (d.source.x + d.target.x) / 2, my = (d.source.y + d.target.y) / 2; var w = gMain.append("g").attr("class", "link-label-wrap"); w.append("rect").attr("class", "link-label-bg").attr("x", mx - d.type.length * 4 - 4).attr("y", my - 10).attr("rx", 4).attr("ry", 4).attr("width", d.type.length * 8 + 8).attr("height", 18); w.append("text").attr("class", "link-label-text").attr("x", mx).attr("y", my + 3).attr("text-anchor", "middle").text(d.type); }

  /* 高亮 */
  function hlById(id) { var ids = getReachable(id); gMain.selectAll(".node-group").classed("dim", function (n) { return !ids.has(n.id); }).classed("highlight", function (n) { return n.id === id; }); gMain.selectAll(".link-group").classed("dim", function (l) { return !ids.has(l.source.id) || !ids.has(l.target.id); }).filter(function (l) { return ids.has(l.source.id) && ids.has(l.target.id); }).each(function (l) { d3.select(this).select(".link-path").attr("opacity", 0.9).attr("stroke-width", HW[l.strength] || 1.4).attr("marker-end", function () { return "url(#arr-hl-" + l.type + ")"; }); d3.select(this).select(".link-glow").attr("opacity", 0.25).attr("stroke", REL_COL[l.type] || "#60a5fa").attr("stroke-width", GW[l.strength] || 2.0); d3.select(this).selectAll(".link-flow").attr("opacity", 0.9); }); }
  function resetHL() { gMain.selectAll(".node-group").classed("dim", false).classed("highlight", false); gMain.selectAll(".link-group").classed("dim", false).select(".link-path").attr("opacity", 0.4).attr("stroke-width", function (d) { return SW[d.strength] || 1.2; }).attr("marker-end", function (d) { return "url(#arr-" + d.type + ")"; }); gMain.selectAll(".link-group").select(".link-glow").attr("opacity", 0); gMain.selectAll(".link-group").selectAll(".link-flow").attr("opacity", 0); gMain.selectAll(".link-label-wrap").remove(); }

  /* 节点详情 */
  function showNode(d) {
    var rel = linkData.filter(function (l) { return l.source.id === d.id || l.target.id === d.id; });
    var out = rel.filter(function (l) { return l.source.id === d.id; });
    var inc = rel.filter(function (l) { return l.target.id === d.id; });
    var c = GROUP_CONFIG[d.group] || GROUP_CONFIG.factor;

    /* 类型徽章颜色: cause=绿, trigger/drive=黄, 其他=红 */
    function relBadge(t) {
      if (t === "cause") return "badge-green";
      if (t === "trigger" || t === "drive") return "badge-amber";
      return "badge badge-rose";
    }

    var h = "<div class=\"info-card\">";
    h += "<span class=\"tag\" style=\"background:" + c.color + "22;color:" + c.color + ";\">" + c.label + "</span>";
    h += "<h4>" + d.label + "</h4>";
    h += "<div class=\"meta\"><span>出边: " + out.length + "</span><span>入边: " + inc.length + "</span></div>";

    /* 关联关系列表 */
    if (rel.length) {
      h += "<div class=\"rt-sect-t\">关联关系 (" + rel.length + ")</div><div class=\"rt-edge-list\">";
      rel.forEach(function (l) {
        var isH = l.source.id === d.id, o = isH ? l.target : l.source;
        var oc = GROUP_CONFIG[o.group] || GROUP_CONFIG.factor;
        h += "<div class=\"rt-edge-row\" onclick=\"window.__sidebarClick('" + o.id + "')\">";
        h += "<span class=\"badge " + relBadge(l.type) + "\" style=\"font-size:10px;padding:1px 5px;\">" + l.type + "</span>";
        h += "<span class=\"rt-edge-arr\">" + (isH ? "→" : "←") + "</span>";
        h += "<span class=\"rt-edge-ds\" style=\"background:" + oc.color + ";\"></span>";
        h += "<span class=\"rt-edge-tg\">" + o.label + "</span></div>";

        /* 展开详情：描述/强度/时间滞后/机制/置信度 */
        if (l.desc) {
          h += "<div class=\"rt-edge-sub\">";
          if (l.desc) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">关系描述</span><span class=\"rt-sub-val\">" + escHtml(l.desc) + "</span></div>";
          if (l.rawStrength) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">强度</span><span class=\"rt-sub-val\">" + escHtml(l.rawStrength) + "</span></div>";
          if (l.timeLag) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">时间滞后</span><span class=\"rt-sub-val\">" + escHtml(l.timeLag) + "</span></div>";
          if (l.mechanism) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">机制</span><span class=\"rt-sub-val\">" + escHtml(l.mechanism) + "</span></div>";
          h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">置信度</span><span class=\"rt-sub-val\" style=\"color:#10b981;\">90%</span></div>";
          h += "</div>";
        }
      });
      h += "</div>";
    }

    /* 来源文献 */
    h += "<div class=\"rt-sect-t\" style=\"margin-top:14px;\">来源文献 <span class=\"rt-sect-cnt\">· 2</span></div>";
    h += "<div class=\"doi-chip\"><span class=\"doi-dt\">DOI</span><div class=\"doi-dc\"><div class=\"doi-title\">Anomalies of Meiyu onset/retreat and large-scale circulations</div><div class=\"doi-key\">10.1007/s00376-021-0285-5 · 2021</div></div></div>";
    h += "<div class=\"doi-chip\" style=\"margin-top:6px;\"><span class=\"doi-dt\">DOI</span><div class=\"doi-dc\"><div class=\"doi-title\">Causes (A, B) of extreme Meiyu season in 2020</div><div class=\"doi-key\">10.1007/s00376-021-1171-0 · 2021</div></div></div>";

    h += "</div>";
    document.getElementById("drawer-body").innerHTML = h;
    document.querySelector(".drawer-title").textContent = "节点详情";
    openDrawer();
  }

  /* 边详情 */
  function showEdge(d) {
    var c = REL_COL[d.type] || "#94a3b8", sc = GROUP_CONFIG[d.source.group] || GROUP_CONFIG.factor, tc = GROUP_CONFIG[d.target.group] || GROUP_CONFIG.factor;
    function relBadge(t) { if (t === "cause") return "badge-green"; if (t === "trigger" || t === "drive") return "badge-amber"; return "badge badge-rose"; }

    var h = "<div class=\"info-card\">";
    h += "<span class=\"badge " + relBadge(d.type) + "\" style=\"font-size:10px;padding:2px 6px;margin-bottom:4px;\">" + d.type + "</span>";
    h += "<h4>" + d.source.label + "</h4>";
    h += "<div style=\"font-size:20px;color:var(--text-3);text-align:center;margin:10px 0;\">↓</div>";
    h += "<h4>" + d.target.label + "</h4>";
    h += "<div class=\"meta\"><span style=\"color:" + sc.color + ";\">● " + sc.label + "</span><span style=\"color:var(--text-3)\">→</span><span style=\"color:" + tc.color + ";\">● " + tc.label + "</span></div>";

    /* 详情 */
    if (d.desc) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">关系描述</span><span class=\"rt-sub-val\">" + escHtml(d.desc) + "</span></div>";
    if (d.rawStrength) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">强度</span><span class=\"rt-sub-val\">" + escHtml(d.rawStrength) + "</span></div>";
    if (d.timeLag) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">时间滞后</span><span class=\"rt-sub-val\">" + escHtml(d.timeLag) + "</span></div>";
    if (d.mechanism) h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">机制</span><span class=\"rt-sub-val\">" + escHtml(d.mechanism) + "</span></div>";
    h += "<div class=\"rt-sub-row\"><span class=\"rt-sub-key\">置信度</span><span class=\"rt-sub-val\" style=\"color:#10b981;\">90%</span></div>";

    /* 来源文献 */
    h += "<div class=\"rt-sect-t\" style=\"margin-top:14px;\">来源文献 <span class=\"rt-sect-cnt\">· 2</span></div>";
    h += "<div class=\"doi-chip\"><span class=\"doi-dt\">DOI</span><div class=\"doi-dc\"><div class=\"doi-title\">Anomalies of Meiyu onset/retreat and large-scale circulations</div><div class=\"doi-key\">10.1007/s00376-021-0285-5 · 2021</div></div></div>";
    h += "<div class=\"doi-chip\" style=\"margin-top:6px;\"><span class=\"doi-dt\">DOI</span><div class=\"doi-dc\"><div class=\"doi-title\">Causes (A, B) of extreme Meiyu season in 2020</div><div class=\"doi-key\">10.1007/s00376-021-1171-0 · 2021</div></div></div>";

    h += "</div>";
    document.getElementById("drawer-body").innerHTML = h;
    document.querySelector(".drawer-title").textContent = "关系详情";
    openDrawer();
  }

  /* 缩放 */
  function zoomIn() { zoom.scaleBy(svg.transition().duration(200), 1.3); }
  function zoomOut() { zoom.scaleBy(svg.transition().duration(200), 0.7); }
  function fitView() { if (!gMain.selectAll(".node-group").size()) return; try { var b = gMain.node().getBBox(), w = svgEl.clientWidth, h = svgEl.clientHeight, s = Math.min(w / (b.width + 80), h / (b.height + 80)); var t = d3.zoomIdentity.translate(w / 2, h / 2).scale(Math.max(0.1, Math.min(s, 5))).translate(-(b.x + b.width / 2), -(b.y + b.height / 2)); svg.transition().duration(400).call(zoom.transform, t); } catch (e) {} }
  function resetView() { zoom.transform(svg.transition().duration(400), d3.zoomIdentity); document.getElementById("zoom-val").textContent = "100%"; }
  function initGraphOnResize() { if (gMain && gMain.selectAll(".node-group").size() > 0) { fitView(); return; } initGraph(); }
  window.addEventListener("resize", function () { if (sim && gMain && gMain.selectAll(".node-group").size() > 0) sim.force("center", d3.forceCenter(svgEl.clientWidth / 2, svgEl.clientHeight / 2)).alpha(0.3).restart(); });
  window.addEventListener("DOMContentLoaded", function () { setTimeout(initGraph, 300); });
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(initGraph, 100);

  /* ══════════════════════════════════════════════════════
     侧边栏搜索 + 关系链节点树
     ══════════════════════════════════════════════════════ */
  var _outEdges = {}, _inDeg = {};
  function buildTree() {
    _outEdges = {}; _inDeg = {};
    linkData.forEach(function (l) {
      var s = l.source.id, t = l.target.id;
      (_outEdges[s] = _outEdges[s] || []).push({ id: t, label: l.target.label, group: l.target.group, type: l.type });
      _inDeg[t] = (_inDeg[t] || 0) + 1;
      if (!_inDeg[s]) _inDeg[s] = 0;
    });
    nodeData.forEach(function (n) { if (_inDeg[n.id] === undefined) _inDeg[n.id] = 0; });
    renderTree("");
  }

  function renderTree(query) {
    var tree = document.getElementById("node-tree");
    var html = "";
    var q = (query || "").trim().toLowerCase();

    if (q) {
      /* 搜索模式：过滤匹配节点 */
      var matched = nodeData.filter(function (n) { return n.label.toLowerCase().indexOf(q) >= 0; });
      if (matched.length === 0) {
        html = "<div style=\"padding:12px 10px;font-size:11px;color:var(--text-3);text-align:center\">无匹配节点</div>";
      } else {
        html += "<div class=\"search-hint\">" + matched.length + " 个节点</div>";
        matched.forEach(function (n) {
          html += "<div class=\"tree-item\" data-id=\"" + n.id + "\" onclick=\"window.__sidebarClick('" + n.id + "')\"><span class=\"tree-dot\" style=\"background:" + (n.color || "#8b5cf6") + ";\"></span><span class=\"tree-name\">" + escHtml(n.label) + "</span></div>";
        });
      }
    } else {
      /* 关系链模式：根节点 → 子节点 */
      var rootIds = nodeData.filter(function (n) { return _inDeg[n.id] <= 1 && (_outEdges[n.id] || []).length >= 1; }).map(function (n) { return n.id; });
      var covered = new Set();
      rootIds.sort(function (a, b) { return (_outEdges[b] || []).length - (_outEdges[a] || []).length; });

      rootIds.forEach(function (rid) {
        html += renderTreeItem(rid, 0, covered);
      });
      /* 未覆盖的孤立节点 */
      nodeData.forEach(function (n) {
        if (!covered.has(n.id) && _inDeg[n.id] <= 1) {
          html += "<div class=\"tree-item\" data-id=\"" + n.id + "\" onclick=\"window.__sidebarClick('" + n.id + "')\"><span class=\"tree-dot\" style=\"background:" + (n.color || "#8b5cf6") + ";\"></span><span class=\"tree-name\">" + escHtml(n.label) + "</span></div>";
          covered.add(n.id);
        }
      });
    }

    tree.innerHTML = html;
  }

  function renderTreeItem(id, depth, covered) {
    covered.add(id);
    var n = nodeData.find(function (x) { return x.id === id; });
    if (!n) return "";
    var color = n.color || "#8b5cf6";
    var children = _outEdges[id] || [];
    var hasChildren = children.length > 0;
    var indent = depth > 0 ? " padding-left:" + (10 + depth * 14) + "px;" : "";
    var html = "";

    if (hasChildren) {
      html += "<div class=\"tree-group\" data-root=\"" + id + "\">";
      html += "<div class=\"tree-item\" data-id=\"" + id + "\" style=\"" + indent + "\" onclick=\"window.__sidebarClick('" + id + "');event.stopPropagation();\"><span class=\"tree-toggle open\" onclick=\"window.__sidebarToggle(event, '" + id + "')\">▶</span><span class=\"tree-dot\" style=\"background:" + color + ";\"></span><span class=\"tree-name\">" + escHtml(n.label) + "</span></div>";
      html += "<div class=\"tree-children\" id=\"tree-kids-" + id + "\">";
      children.forEach(function (ch) {
        var chN = nodeData.find(function (x) { return x.id === ch.id; });
        if (!chN) return;
        covered.add(ch.id);
        var chColor = chN.color || "#8b5cf6";
        html += "<div class=\"tree-item child\" data-id=\"" + ch.id + "\" onclick=\"window.__sidebarClick('" + ch.id + "')\"><span class=\"tree-arrow\">→</span><span class=\"tree-dot\" style=\"background:" + chColor + ";\"></span><span class=\"tree-name\">" + escHtml(chN.label) + "</span><span class=\"tree-arrow\" style=\"font-size:9px;color:var(--text-3);\">（" + ch.type + "）</span></div>";
      });
      html += "</div></div>";
    } else {
      html += "<div class=\"tree-item\" data-id=\"" + id + "\" style=\"" + indent + "\" onclick=\"window.__sidebarClick('" + id + "')\"><span class=\"tree-dot\" style=\"background:" + color + ";\"></span><span class=\"tree-name\">" + escHtml(n.label) + "</span></div>";
    }
    return html;
  }

  function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* 侧边栏搜索 */
  window.__sidebarSearch = function (q) { renderTree(q); };

  /* 折叠/展开 */
  window.__sidebarToggle = function (ev, id) {
    ev.stopPropagation();
    var kids = document.getElementById("tree-kids-" + id);
    var tog = ev.target;
    if (kids) { var open = !(kids.style.display === "none"); kids.style.display = open ? "none" : ""; tog.classList.toggle("open", !open); }
  };

  /* 点击节点 → 高亮 + 定位 + 右侧面板 */
  window.__sidebarClick = function (id) {
    var nd = nodeData.find(function (n) { return n.id === id; });
    if (!nd) return;

    /* 选中 + 高亮 */
    selectedId = id;
    hlById(id);

    /* 右侧面板 */
    showNode(nd);
    /* 侧边栏 active */
    var prevActive = document.querySelector("#node-tree .tree-item.active");
    if (prevActive) prevActive.classList.remove("active");
    var el = document.querySelector("#node-tree .tree-item[data-id=\"" + id + "\"]");
    if (el) el.classList.add("active");

    /* 居中到节点并适度放大 */
    if (sim && gMain && svgEl) {
      var pos = sim.nodes().find(function (s) { return s.id === id; });
      if (pos) {
        var currentK = d3.zoomTransform(svg.node()).k;
        // 太小时放大到 0.35 以上，避免节点淹没在全局视图中
        if (currentK < 0.35) {
          svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(svgEl.clientWidth / 2, svgEl.clientHeight / 2).scale(0.35).translate(-pos.x, -pos.y));
        } else {
          svg.transition().duration(400).call(zoom.translateTo, pos.x, pos.y);
        }
        // 同步缩放显示
        document.getElementById("zoom-val").textContent = Math.round(Math.max(currentK, 0.35) * 100) + "%";
      }
    }
  };

  /* 初始化树 */
  var _treeBuilt = false;
  function ensureTree() { if (!_treeBuilt && nodeData.length > 0) { buildTree(); _treeBuilt = true; } }
})();
</script>

<!-- ═══════════════════════════════════════════════════════════
     3D 视图控制器（保留，之后补充）