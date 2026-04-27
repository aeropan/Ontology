/* global React */
/* GraphCanvas — standalone knowledge-graph visualizer.
   Props: data {nodes,edges}, tweaks, onSelect, selectedId
   Zero external deps. Uses a small custom force-layout that runs once on mount. */

(function(){
  const { useEffect, useMemo, useRef, useState, useCallback } = React;

  /* ─── Layout constants ────────────────────────────────────── */
  const W = 1100, H = 720;
  const SIZE = { L1: 34, L2: 24, L3: 18 };
  const HUB = { L1: 1.6, L2: 1.2, L3: 1.0 }; // glow multiplier

  // Node fill by data state (only colour channel we spend)
  const STATE_COLOR = {
    loaded:  '#22c55e',  // green — 有数据
    empty:   '#8a96ad',  // gray  — 无数据
    loading: '#eab308',  // yellow — 加载中
  };

  // Business-type icon (rendered at node center)
  const BIZ_ICON = {
    data:       'M3 5.5 C3 4 6 3 8 3 C10 3 13 4 13 5.5 L13 10.5 C13 12 10 13 8 13 C6 13 3 12 3 10.5 Z M3 8 C3 9.5 6 10.5 8 10.5 C10 10.5 13 9.5 13 8',     // cylinder
    algorithm:  'M3 3 L6 3 L6 6 L3 6 Z M10 3 L13 3 L13 6 L10 6 Z M3 10 L6 10 L6 13 L3 13 Z M10 10 L13 10 L13 13 L10 13 Z M6 4.5 L10 4.5 M6 11.5 L10 11.5 M4.5 6 L4.5 10 M11.5 6 L11.5 10', // flowchart
    model:      'M8 2 L13 5 L13 11 L8 14 L3 11 L3 5 Z M8 2 L8 14 M3 5 L13 11 M13 5 L3 11',    // cube wire
    metric:     'M3 13 L3 9 L5 9 L5 13 M6.5 13 L6.5 6 L8.5 6 L8.5 13 M10 13 L10 3 L12 3 L12 13', // bar chart
    task:       'M4 3 L12 3 L12 13 L4 13 Z M6 6 L10 6 M6 8.5 L10 8.5 M6 11 L9 11', // doc w/ lines
    constraint: 'M8 2 L13 4.5 L13 8.5 C13 11 11 13 8 14 C5 13 3 11 3 8.5 L3 4.5 Z', // shield
  };

  /* ─── Concentric ring layout: L1 center, L2 mid ring, L3 outer ring ─── */
  function runRingLayout(nodes, edges, { layout = 'ring', width = W, height = H } = {}) {
    const cx = width/2, cy = height/2;
    const adj = {};
    edges.forEach(e => {
      adj[e.from] = adj[e.from] || new Set();
      adj[e.to]   = adj[e.to]   || new Set();
      adj[e.from].add(e.to);
      adj[e.to].add(e.from);
    });

    const L1 = nodes.filter(n => n.level === 'L1');
    const L2 = nodes.filter(n => n.level === 'L2');
    const L3 = nodes.filter(n => n.level === 'L3');
    const pos = {};

    // Sort L2/L3 by their strongest L1/L2 parent to cluster them angularly.
    const parentAngle = {};
    const placeRing = (list, radius, baseAngleFn) => {
      // Sort: nodes sharing a parent stay adjacent.
      const ordered = [...list].sort((a,b) => (baseAngleFn(a) - baseAngleFn(b)));
      const n = ordered.length || 1;
      ordered.forEach((node, i) => {
        const a = baseAngleFn(node, i, n);
        pos[node.id] = { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
        parentAngle[node.id] = a;
      });
    };

    // L1 on inner ring (or single center if only 1)
    if (L1.length === 1) {
      pos[L1[0].id] = { x: cx, y: cy };
      parentAngle[L1[0].id] = 0;
    } else {
      L1.forEach((n, i) => {
        const a = (i / L1.length) * Math.PI * 2 - Math.PI/2;
        pos[n.id] = { x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 120 };
        parentAngle[n.id] = a;
      });
    }

    // L2 mid ring — each node placed near its L1 parent's angle
    const l2Radius = 230;
    const l2Groups = {};
    L2.forEach(n => {
      const parents = [...(adj[n.id] || [])].filter(pid => L1.find(p => p.id === pid));
      const key = parents[0] || '__free';
      (l2Groups[key] = l2Groups[key] || []).push(n);
    });
    let l2Count = 0;
    const totalL2 = L2.length;
    Object.keys(l2Groups).forEach(pid => {
      const group = l2Groups[pid];
      const pAngle = pid === '__free' ? 0 : parentAngle[pid];
      // spread group within a sector around the parent angle
      const spread = Math.min(Math.PI * 0.7, (group.length / totalL2) * Math.PI * 2 * 1.1);
      group.forEach((n, i) => {
        const a = pAngle + (group.length === 1 ? 0 : (i / (group.length-1) - 0.5) * spread);
        pos[n.id] = { x: cx + Math.cos(a) * l2Radius, y: cy + Math.sin(a) * l2Radius };
        parentAngle[n.id] = a;
        l2Count++;
      });
    });

    // L3 outer ring — each near its strongest non-L3 parent angle
    const l3Radius = 340;
    const l3Groups = {};
    L3.forEach(n => {
      const parents = [...(adj[n.id] || [])].filter(pid => {
        const p = nodes.find(x => x.id === pid);
        return p && p.level !== 'L3';
      });
      const key = parents[0] || '__free';
      (l3Groups[key] = l3Groups[key] || []).push(n);
    });
    Object.keys(l3Groups).forEach(pid => {
      const group = l3Groups[pid];
      const pAngle = pid === '__free' ? 0 : (parentAngle[pid] ?? 0);
      const spread = Math.min(Math.PI * 0.5, group.length * 0.22);
      group.forEach((n, i) => {
        const a = pAngle + (group.length === 1 ? 0 : (i / (group.length-1) - 0.5) * spread);
        pos[n.id] = { x: cx + Math.cos(a) * l3Radius, y: cy + Math.sin(a) * l3Radius };
        parentAngle[n.id] = a;
      });
    });

    // Anti-overlap relax: push nodes apart if they end up too close.
    const minDist = { L1: 110, L2: 95, L3: 85 };
    for (let iter = 0; iter < 80; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const ni = nodes[i], nj = nodes[j];
          const a = pos[ni.id], b = pos[nj.id];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
          const minD = Math.max(minDist[ni.level] || 80, minDist[nj.level] || 80) * 0.85;
          if (d < minD) {
            const push = (minD - d) / 2;
            a.x -= (dx/d) * push; a.y -= (dy/d) * push;
            b.x += (dx/d) * push; b.y += (dy/d) * push;
          }
        }
      }
    }

    // Clamp
    nodes.forEach(n => {
      const p = pos[n.id];
      p.x = Math.max(70, Math.min(width - 70, p.x));
      p.y = Math.max(60, Math.min(height - 60, p.y));
    });

    return { pos, adj };
  }

  /* ─── Node shape — outer ring by type ─────────────────────── */
  function NodeShape({ node, x, y, r, color, dim, selected, hovered, highlighted }) {
    const alpha = dim ? 0.18 : 1;
    const ringColor = color;
    const innerFill = `${color}`;
    const innerOp = 0.18;
    const glowR = r * HUB[node.level] * 1.9;

    return (
      <g style={{ opacity: alpha, transition: 'opacity .25s ease' }}>
        {/* outer glow */}
        {(selected || hovered || highlighted) && (
          <circle cx={x} cy={y} r={glowR} fill={color} opacity={selected ? 0.35 : hovered ? 0.28 : 0.16}
                  style={{ filter: 'blur(12px)' }} />
        )}
        <circle cx={x} cy={y} r={r + 4} fill={color} opacity={0.12} style={{ filter:'blur(6px)' }}/>

        {/* shape variants */}
        {node.type === 'class' && (
          <>
            <circle cx={x} cy={y} r={r} fill={innerFill} fillOpacity={innerOp}
                    stroke={ringColor} strokeWidth={hovered||selected?2.2:1.6}/>
            <circle cx={x} cy={y} r={r - 5} fill="none" stroke={ringColor} strokeWidth={1} opacity={0.65}/>
          </>
        )}
        {node.type === 'property' && (
          <circle cx={x} cy={y} r={r} fill={innerFill} fillOpacity={innerOp}
                  stroke={ringColor} strokeWidth={hovered||selected?2.2:1.2}/>
        )}
        {node.type === 'instance' && (
          <circle cx={x} cy={y} r={r} fill={ringColor} fillOpacity={0.55}
                  stroke={ringColor} strokeWidth={hovered||selected?2.2:1.4}/>
        )}
        {node.type === 'concept' && (
          <circle cx={x} cy={y} r={r} fill={innerFill} fillOpacity={innerOp}
                  stroke={ringColor} strokeWidth={hovered||selected?2.2:1.4}
                  strokeDasharray="4 3"/>
        )}

        {/* selection pulse ring */}
        {selected && (
          <circle cx={x} cy={y} r={r + 8} fill="none" stroke={ringColor} strokeWidth={1.2} opacity={0.7}>
            <animate attributeName="r" values={`${r+8};${r+16};${r+8}`} dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
          </circle>
        )}

        {/* loading spin for 加载中 */}
        {node.state === 'loading' && (
          <circle cx={x} cy={y} r={r + 3} fill="none" stroke={color} strokeWidth={1.4}
                  strokeDasharray="6 200" strokeLinecap="round" opacity={0.85}>
            <animateTransform attributeName="transform" type="rotate"
                              from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="1.6s" repeatCount="indefinite"/>
          </circle>
        )}
      </g>
    );
  }

  /* ─── Path builder (line / curve) ─────────────────────────── */
  function edgePath(a, b, curve) {
    if (!curve) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const nx = -dy, ny = dx;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const off = Math.min(40, len * 0.18);
    return `M ${a.x} ${a.y} Q ${mx + nx/len*off} ${my + ny/len*off} ${b.x} ${b.y}`;
  }

  /* ─── Main component ───────────────────────────────────────── */
  function GraphCanvas({ data, tweaks, selectedId, onSelect }) {
    const svgRef = useRef(null);
    const [hoverId, setHoverId] = useState(null);
    const [hoverEdge, setHoverEdge] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x:0, y:0 });
    const panRef = useRef({ dragging:false, sx:0, sy:0, ox:0, oy:0 });

    const { pos, adj } = useMemo(() => runRingLayout(data.nodes, data.edges), [data]);

    const neighbors = useMemo(() => {
      if (!selectedId) return null;
      const n1 = adj[selectedId] || new Set();
      return new Set([selectedId, ...n1]);
    }, [selectedId, adj]);

    const hoverNeighbors = useMemo(() => {
      if (!hoverId || selectedId) return null;
      const n1 = adj[hoverId] || new Set();
      return new Set([hoverId, ...n1]);
    }, [hoverId, selectedId, adj]);

    // Zoom
    const onWheel = useCallback((e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.max(0.4, Math.min(2.4, z * (1 + delta))));
    }, []);

    // Pan
    const onMouseDown = (e) => {
      if (e.target.closest('[data-node]')) return;
      panRef.current = { dragging:true, sx:e.clientX, sy:e.clientY, ox:pan.x, oy:pan.y };
    };
    const onMouseMove = (e) => {
      if (!panRef.current.dragging) return;
      setPan({ x: panRef.current.ox + (e.clientX - panRef.current.sx),
               y: panRef.current.oy + (e.clientY - panRef.current.sy) });
    };
    const onMouseUp = () => { panRef.current.dragging = false; };

    useEffect(() => {
      const el = svgRef.current;
      if (!el) return;
      el.addEventListener('wheel', onWheel, { passive:false });
      return () => el.removeEventListener('wheel', onWheel);
    }, [onWheel]);

    // Label visibility
    const shouldShowLabel = (id) => {
      if (tweaks.labelMode === 'always') return true;
      if (tweaks.labelMode === 'selected')
        return selectedId === id || (neighbors && neighbors.has(id));
      if (tweaks.labelMode === 'hover')
        return hoverId === id || (hoverNeighbors && hoverNeighbors.has(id)) || selectedId === id;
      return true;
    };

    const shouldShowEdgeLabel = (e) => {
      if (tweaks.edgeLabelMode === 'always') return true;
      const touchesSel = selectedId && (e.from === selectedId || e.to === selectedId);
      const touchesHv  = hoverId && (e.from === hoverId || e.to === hoverId);
      const isHovered  = hoverEdge === `${e.from}-${e.to}`;
      return touchesSel || touchesHv || isHovered;
    };

    const isDim = (id) => {
      if (selectedId && neighbors) return !neighbors.has(id);
      return false;
    };

    const density = tweaks.density === 'compact' ? 0.85 : tweaks.density === 'loose' ? 1.15 : 1;

    return (
      <div className="gc-wrap" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <svg ref={svgRef} className="gc-svg" viewBox={`0 0 ${W} ${H}`} onMouseDown={onMouseDown}>
          <defs>
            <marker id="arrow" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6"
                    orient="auto" markerUnits="strokeWidth">
              <path d="M0,-4 L8,0 L0,4" fill="#6b7a95" opacity="0.7"/>
            </marker>
            <marker id="arrow-hl" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6"
                    orient="auto" markerUnits="strokeWidth">
              <path d="M0,-4 L8,0 L0,4" fill="#60a5fa"/>
            </marker>
            <radialGradient id="gc-bg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.06)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#gc-bg)"/>

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom * density})`} style={{ transformOrigin:'center' }}>
            {/* edges */}
            {data.edges.map((e,i) => {
              const a = pos[e.from], b = pos[e.to];
              if (!a || !b) return null;
              const eid = `${e.from}-${e.to}`;
              const dimEdge = selectedId
                ? !(neighbors.has(e.from) && neighbors.has(e.to))
                : hoverId
                  ? !(hoverNeighbors.has(e.from) && hoverNeighbors.has(e.to))
                  : false;
              const isHL = !dimEdge && (selectedId && (e.from===selectedId||e.to===selectedId) || hoverEdge===eid);
              return (
                <g key={i} style={{ opacity: dimEdge ? 0.1 : 1, transition:'opacity .25s' }}>
                  <path d={edgePath(a, b, tweaks.curveEdges)}
                        fill="none"
                        stroke={isHL ? '#60a5fa' : '#6b7a95'}
                        strokeWidth={isHL ? 1.8 : 1}
                        strokeOpacity={isHL ? 0.9 : 0.45}
                        strokeDasharray={e.dashed ? '4 4' : ''}
                        markerEnd={`url(#${isHL?'arrow-hl':'arrow'})`}
                        onMouseEnter={()=>setHoverEdge(eid)}
                        onMouseLeave={()=>setHoverEdge(null)}
                        style={{ cursor:'pointer' }}/>
                  {/* wider invisible hit area */}
                  <path d={edgePath(a, b, tweaks.curveEdges)}
                        fill="none" stroke="transparent" strokeWidth={14}
                        onMouseEnter={()=>setHoverEdge(eid)}
                        onMouseLeave={()=>setHoverEdge(null)}/>
                  {shouldShowEdgeLabel(e) && (()=>{
                    const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
                    return (
                      <g pointerEvents="none">
                        <rect x={mx - e.relation.length*4 - 4} y={my - 9} rx="4" ry="4"
                              width={e.relation.length*8 + 8} height={16}
                              fill="#0f1828" stroke="rgba(96,165,250,.35)" strokeWidth=".5" opacity="0.92"/>
                        <text x={mx} y={my + 3} textAnchor="middle" fontSize="10"
                              fill="#93c5fd" fontFamily="JetBrains Mono, monospace" letterSpacing=".02em">
                          {e.relation}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* nodes */}
            {data.nodes.map(n => {
              const p = pos[n.id];
              if (!p) return null;
              const r = SIZE[n.level];
              const color = STATE_COLOR[n.state];
              const selected = selectedId === n.id;
              const hovered = hoverId === n.id;
              const highlighted = (neighbors && neighbors.has(n.id)) || (hoverNeighbors && hoverNeighbors.has(n.id));
              const dim = isDim(n.id);
              const show = shouldShowLabel(n.id);
              return (
                <g key={n.id} data-node={n.id}
                   onMouseEnter={()=>setHoverId(n.id)}
                   onMouseLeave={()=>setHoverId(null)}
                   onClick={(e)=>{ e.stopPropagation(); onSelect(n.id === selectedId ? null : n.id); }}
                   style={{ cursor:'pointer' }}>
                  <NodeShape node={n} x={p.x} y={p.y} r={r} color={color}
                             dim={dim} selected={selected} hovered={hovered}
                             highlighted={highlighted && !dim}/>
                  {show && (
                    <g pointerEvents="none" style={{ opacity: dim ? 0.25 : 1, transition:'opacity .25s' }}>
                      <rect x={p.x - Math.min(n.label.length*5+8, 90)} y={p.y + r + 4}
                            width={Math.min(n.label.length*10+16, 180)} height={18} rx="4" ry="4"
                            fill="#0c1424" opacity="0.78"/>
                      <text x={p.x} y={p.y + r + 16} textAnchor="middle"
                            fontSize={n.level==='L1'?12:11}
                            fill={selected || hovered ? '#fff' : '#cfd7e6'}
                            fontWeight={n.level==='L1'?600:500}>
                        {n.label.length > 12 ? n.label.slice(0,12)+'…' : n.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* zoom controls */}
        <div className="gc-zoom">
          <button onClick={()=>setZoom(z=>Math.min(2.4, z*1.2))}>+</button>
          <span>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.max(0.4, z/1.2))}>−</button>
          <button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} title="重置">⟲</button>
        </div>

        {/* hover tooltip */}
        {hoverId && !selectedId && (() => {
          const n = data.nodes.find(x => x.id === hoverId);
          const p = pos[hoverId];
          if (!n || !p) return null;
          const color = STATE_COLOR[n.state];
          return (
            <div className="gc-tip" style={{ left: p.x * zoom * density + pan.x + 20, top: p.y * zoom * density + pan.y - 10 }}>
              <div className="gc-tip-hd">
                <span className="gc-tip-dot" style={{background:color}}/>
                <b>{n.label}</b>
              </div>
              <div className="gc-tip-meta">
                <span>{({class:'类 Class', property:'属性 Property', instance:'实例 Instance', concept:'概念 Concept'})[n.type]}</span>
                <span className="gc-tip-l">{n.level}</span>
                <span>{(adj[n.id]||new Set()).size} 连接</span>
              </div>
              <div className="gc-tip-state">
                {n.state === 'loaded' && '● 有数据'}
                {n.state === 'empty'  && '● 无数据'}
                {n.state === 'loading'&& '● 加载中'}
                {n.refs && ` · ${n.refs.length} 条文献`}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  window.GraphCanvas = GraphCanvas;
})();
