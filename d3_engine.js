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
    linkData = G.edges.map(function (e, i) { return { id: "l" + i, source: idMap[e.from], target: idMap[e.to], type: e.relation || "cause", desc: e.desc || "", strength: normS(e.strength) }; });
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
  function showNode(d) { var rel = linkData.filter(function (l) { return l.source.id === d.id || l.target.id === d.id; }), out = rel.filter(function (l) { return l.source.id === d.id; }), inc = rel.filter(function (l) { return l.target.id === d.id; }), c = GROUP_CONFIG[d.group] || GROUP_CONFIG.factor; var h = "<div class=\"info-card\"><span class=\"tag\" style=\"background:" + c.color + "22;color:" + c.color + ";\">" + c.label + "</span><h4>" + d.label + "</h4><div class=\"meta\"><span>出边: " + out.length + "</span><span>入边: " + inc.length + "</span></div>"; if (rel.length) { h += "<div class=\"rt-sect-t\" style=\"margin-top:14px;margin-bottom:6px;\">关联关系 (" + rel.length + ")</div><div class=\"rt-edge-list\">"; rel.forEach(function (l) { var isH = l.source.id === d.id, o = isH ? l.target : l.source, oc = GROUP_CONFIG[o.group] || GROUP_CONFIG.factor; h += "<div class=\"rt-edge-row\"><span class=\"rt-edge-rel\">" + l.type + "</span><span class=\"rt-edge-arr\">" + (isH ? "→" : "←") + "</span><span class=\"rt-edge-ds\" style=\"background:" + oc.color + ";\"></span><span class=\"rt-edge-tg\">" + o.label + "</span></div>"; }); h += "</div>"; } h += "</div>"; document.getElementById("drawer-body").innerHTML = h; document.querySelector(".drawer-title").textContent = "节点详情"; openDrawer(); }
  function showEdge(d) { var c = REL_COL[d.type] || "#94a3b8", sc = GROUP_CONFIG[d.source.group] || GROUP_CONFIG.factor, tc = GROUP_CONFIG[d.target.group] || GROUP_CONFIG.factor; document.getElementById("drawer-body").innerHTML = "<div class=\"info-card\"><span class=\"tag\" style=\"background:" + c + "22;color:" + c + ";\">" + d.type + "</span><h4>" + d.source.label + "</h4><div style=\"font-size:20px;color:var(--text-3);text-align:center;margin:10px 0;\">↓</div><h4>" + d.target.label + "</h4><p>" + (d.desc || "") + "</p><div class=\"meta\"><span style=\"color:" + sc.color + ";\">● " + sc.label + "</span><span style=\"color:var(--text-3)\">→</span><span style=\"color:" + tc.color + ";\">● " + tc.label + "</span></div></div>"; document.querySelector(".drawer-title").textContent = "关系详情"; openDrawer(); }

  /* 缩放 */
  function zoomIn() { zoom.scaleBy(svg.transition().duration(200), 1.3); }
  function zoomOut() { zoom.scaleBy(svg.transition().duration(200), 0.7); }
  function fitView() { if (!gMain.selectAll(".node-group").size()) return; try { var b = gMain.node().getBBox(), w = svgEl.clientWidth, h = svgEl.clientHeight, s = Math.min(w / (b.width + 80), h / (b.height + 80)); var t = d3.zoomIdentity.translate(w / 2, h / 2).scale(Math.max(0.1, Math.min(s, 5))).translate(-(b.x + b.width / 2), -(b.y + b.height / 2)); svg.transition().duration(400).call(zoom.transform, t); } catch (e) {} }
  function resetView() { zoom.transform(svg.transition().duration(400), d3.zoomIdentity); document.getElementById("zoom-val").textContent = "100%"; }
  function initGraphOnResize() { if (gMain && gMain.selectAll(".node-group").size() > 0) { fitView(); return; } initGraph(); }
  window.addEventListener("resize", function () { if (sim && gMain && gMain.selectAll(".node-group").size() > 0) sim.force("center", d3.forceCenter(svgEl.clientWidth / 2, svgEl.clientHeight / 2)).alpha(0.3).restart(); });
  window.addEventListener("DOMContentLoaded", function () { setTimeout(initGraph, 300); });
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(initGraph, 100);
})();
</script>

<!-- ═══════════════════════════════════════════════════════════
     3D 视图控制器（保留，之后补充）