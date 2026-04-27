/* global React, ReactDOM, GRAPH, GraphCanvas, TweaksPanel, TweakSection, TweakRadio, TweakToggle, useTweaks */
const { useState, useMemo, useEffect } = React;

/* ── Legend icons (A: geometric-abstract, tied to node shapes) ── */
const TYPE_ICONS = {
  class: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1" opacity=".6"/>
    </svg>
  ),
  property: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  ),
  instance: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" fill="currentColor" fillOpacity=".55" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  concept: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 2"/>
    </svg>
  ),
};

const TYPE_META = {
  class:    { cn:'类',   en:'Class'    },
  property: { cn:'属性', en:'Property' },
  instance: { cn:'实例', en:'Instance' },
  concept:  { cn:'概念', en:'Concept'  },
};

const STATE_META = {
  loaded:  { cn:'有数据', color:'#22c55e' },
  empty:   { cn:'无数据', color:'#8a96ad' },
  loading: { cn:'加载中', color:'#eab308' },
};

/* Business-type icons — shown in legend and inside node center */
const BIZ_META = {
  data:       { cn:'数据',     color:'#22c55e', path:'M3 5.5 C3 4 6 3 8 3 C10 3 13 4 13 5.5 L13 10.5 C13 12 10 13 8 13 C6 13 3 12 3 10.5 Z M3 8 C3 9.5 6 10.5 8 10.5 C10 10.5 13 9.5 13 8' },
  algorithm:  { cn:'算法',     color:'#3b82f6', path:'M3 3 L6 3 L6 6 L3 6 Z M10 3 L13 3 L13 6 L10 6 Z M3 10 L6 10 L6 13 L3 13 Z M10 10 L13 10 L13 13 L10 13 Z M6 4.5 L10 4.5 M6 11.5 L10 11.5 M4.5 6 L4.5 10 M11.5 6 L11.5 10' },
  model:      { cn:'模型',     color:'#8b5cf6', path:'M8 2 L13 5 L13 11 L8 14 L3 11 L3 5 Z M8 2 L8 14 M3 5 L13 11 M13 5 L3 11' },
  metric:     { cn:'指标',     color:'#06b6d4', path:'M3 13 L3 9 L5 9 L5 13 M6.5 13 L6.5 6 L8.5 6 L8.5 13 M10 13 L10 3 L12 3 L12 13' },
  task:       { cn:'任务',     color:'#f59e0b', path:'M4 3 L12 3 L12 13 L4 13 Z M6 6 L10 6 M6 8.5 L10 8.5 M6 11 L9 11' },
  constraint: { cn:'约束',     color:'#ec4899', path:'M8 2 L13 4.5 L13 8.5 C13 11 11 13 8 14 C5 13 3 11 3 8.5 L3 4.5 Z' },
  property:   { cn:'属性',     color:'#64748b', path:'M8 2 L13 5 L13 11 L8 14 L3 11 L3 5 Z M8 2 L8 14' },
};

/* ── Left panel ── */
function LeftPanel({ data, selectedId, onSelect }) {
  // group L1 parents + their L2/L3 children
  const adj = useMemo(() => {
    const a = {};
    data.edges.forEach(e => {
      (a[e.from] = a[e.from] || []).push(e.to);
    });
    return a;
  }, [data]);

  const l1 = data.nodes.filter(n => n.level === 'L1');

  return (
    <aside className="left">
      <div className="search">
        <span>⌕</span><span>搜索节点…</span>
      </div>

      <div className="sec-lbl">本体层级</div>
      <div style={{display:'flex',flexDirection:'column',gap:2,overflow:'auto',maxHeight:260}}>
        {l1.map(p => (
          <React.Fragment key={p.id}>
            <div className={`tree-item ${selectedId===p.id?'active':''}`} onClick={()=>onSelect(p.id)}>
              <span className="d" style={{background:STATE_META[p.state].color}}/>
              <span className="n">{p.label}</span>
            </div>
            {(adj[p.id]||[]).slice(0,4).map(cid => {
              const c = data.nodes.find(n=>n.id===cid);
              if(!c) return null;
              return (
                <div key={cid} className={`tree-item ${selectedId===cid?'active':''}`}
                     style={{paddingLeft:20}} onClick={()=>onSelect(cid)}>
                  <span className="d" style={{background:STATE_META[c.state].color}}/>
                  <span className="n" style={{fontSize:11.5}}>{c.label}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="sec-lbl">数据状态</div>
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        {Object.entries(STATE_META).map(([k,v]) => (
          <div key={k} className="state-row">
            <span className="state-dot" style={{background:v.color,color:v.color}}/>
            <span>{v.cn}</span>
          </div>
        ))}
      </div>

      <div className="sec-lbl">节点类型</div>
      <div className="legend-grid">
        {Object.entries(TYPE_META).map(([k,v]) => (
          <div key={k} className="legend-item" style={{color:'#8eaac8'}}>
            <span className="legend-icon">{TYPE_ICONS[k]}</span>
            <span>{v.cn}</span>
            <span className="legend-k">{v.en.slice(0,4)}</span>
          </div>
        ))}
      </div>

      <div className="sec-lbl">业务类型</div>
      <div className="legend-grid">
        {Object.entries(BIZ_META).map(([k,v]) => (
          <div key={k} className="legend-item" style={{color:v.color}}>
            <span className="legend-icon">
              <svg viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity=".6"/>
                <path d={v.path} fill="none" stroke="currentColor" strokeWidth="1.2"
                      strokeLinecap="round" strokeLinejoin="round" transform="translate(3 3) scale(0.625)"/>
              </svg>
            </span>
            <span>{v.cn}</span>
          </div>
        ))}
      </div>

      <div className="sec-lbl">层级标签</div>
      <div className="level-chips">
        {['L1','L2','L3'].map((lv,i) => (
          <span key={lv} className="level-chip" style={{color:['#e6edf7','#a6b3c8','#6e7c94'][i]}}>
            <span className="lc" style={{width:[8,6,4][i],height:[8,6,4][i]}}/>
            {lv}
          </span>
        ))}
      </div>
    </aside>
  );
}

/* ── Mini neighborhood graph in detail panel ── */
function MiniGraph({ data, centerId }) {
  const W = 268, H = 130;
  const center = data.nodes.find(n => n.id === centerId);
  const edges  = data.edges.filter(e => e.from === centerId || e.to === centerId).slice(0,6);
  const neighborIds = edges.map(e => e.from === centerId ? e.to : e.from);
  const nb = data.nodes.filter(n => neighborIds.includes(n.id));

  const cx = W/2, cy = H/2;
  const layout = {};
  layout[centerId] = { x:cx, y:cy };
  nb.forEach((n,i) => {
    const a = (i / nb.length) * Math.PI * 2 - Math.PI/2;
    layout[n.id] = { x: cx + Math.cos(a) * 48, y: cy + Math.sin(a) * 42 };
  });

  const stateColor = (s) => STATE_META[s].color;

  return (
    <div className="mini">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {edges.map((e,i) => {
          const a = layout[e.from], b = layout[e.to];
          if(!a||!b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                       stroke="#6b7a95" strokeWidth="1" strokeOpacity=".4"
                       strokeDasharray={e.dashed?'3 3':''}/>;
        })}
        {nb.map(n => (
          <g key={n.id}>
            <circle cx={layout[n.id].x} cy={layout[n.id].y} r="7"
                    fill={stateColor(n.state)} fillOpacity="0.25"
                    stroke={stateColor(n.state)} strokeWidth="1"/>
          </g>
        ))}
        {center && (
          <g>
            <circle cx={cx} cy={cy} r="14" fill={stateColor(center.state)} fillOpacity="0.1"
                    stroke={stateColor(center.state)} strokeWidth="1.4"/>
            <circle cx={cx} cy={cy} r="10" fill={stateColor(center.state)} fillOpacity="0.3"/>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ── Right panel ── */
function RightPanel({ data, selectedId, onSelect }) {
  if (!selectedId) {
    return (
      <aside className="right">
        <div className="rt-empty">
          选中画布中的节点<br/>查看详情、关联关系与文献
        </div>
      </aside>
    );
  }
  const n = data.nodes.find(x => x.id === selectedId);
  if (!n) return null;

  const related = data.edges
    .map(e => {
      if (e.from === selectedId) return { other: e.to, rel: e.relation, dir:'out', dashed:e.dashed };
      if (e.to === selectedId)   return { other: e.from, rel: e.relation, dir:'in', dashed:e.dashed };
      return null;
    })
    .filter(Boolean);

  const stateColor = STATE_META[n.state].color;

  return (
    <aside className="right">
      <div className="rt-hd">
        <div className="rt-title">节点详情</div>
        <button className="rt-x" onClick={()=>onSelect(null)}>×</button>
      </div>

      <div className="rt-card">
        <div className="rt-node" style={{color:stateColor}}>
          <div className="rt-avatar">{TYPE_ICONS[n.type]}</div>
          <div style={{minWidth:0}}>
            <div className="rt-nm">{n.label}</div>
            <div className="rt-tags">
              <span className="rt-tag">{TYPE_META[n.type].cn} · {TYPE_META[n.type].en}</span>
              <span className="rt-tag l">{n.level}</span>
              <span className="rt-tag" style={{color:stateColor}}>● {STATE_META[n.state].cn}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rt-sect">
        <div className="rt-sect-t">1-hop 邻域</div>
        <MiniGraph data={data} centerId={selectedId}/>
      </div>

      {n.refs && n.refs.length > 0 && (
        <div className="rt-sect">
          <div className="rt-sect-t">关联文献 · {n.refs.length}</div>
          {n.refs.map((r,i) => (
            <div key={i} className="doi-chip">
              <span className="dt">{(r.type||'DOI').toUpperCase()}</span>
              <div className="dc">
                <div className="dttl">{r.title}</div>
                <div className="dk">{r.key}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rt-sect">
        <div className="rt-sect-t">语义关系 · {related.length}</div>
        <div className="edge-list">
          {related.map((r,i) => {
            const other = data.nodes.find(x => x.id === r.other);
            if (!other) return null;
            return (
              <div key={i} className="edge-row" onClick={()=>onSelect(r.other)}>
                <span className="rel">{r.rel}</span>
                <span className="arr">{r.dir==='out'?'→':'←'}</span>
                <span className="ds" style={{background:STATE_META[other.state].color}}/>
                <span className="tg">{other.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rt-actions">
        <button className="rt-btn">编辑</button>
        <button className="rt-btn primary">居中到节点</button>
      </div>
    </aside>
  );
}

/* ── Top bar ── */
function TopBar({ data }) {
  const typeCount = data.nodes.reduce((a,n)=>{ a[n.type]=(a[n.type]||0)+1; return a; },{});
  return (
    <div className="top">
      <div>
        <div className="brand">MINGXUAN_TEST_DATABASE</div>
        <div className="sub">基于本体 · {data.nodes.length} 个节点 · {data.edges.length} 条关系</div>
      </div>
      <div className="stats">
        <span>节点<b>{data.nodes.length}</b></span>
        <span>关系<b>{data.edges.length}</b></span>
        <span>类型<b>{Object.keys(typeCount).length}</b></span>
        <span>文献<b>{data.nodes.reduce((a,n)=>a+(n.refs?.length||0),0)}</b></span>
      </div>
    </div>
  );
}

/* ── Root ── */
function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="page">
      <TopBar data={window.GRAPH}/>
      <LeftPanel data={window.GRAPH} selectedId={selectedId} onSelect={setSelectedId}/>
      <GraphCanvas data={window.GRAPH} tweaks={tweaks} selectedId={selectedId} onSelect={setSelectedId}/>
      <RightPanel data={window.GRAPH} selectedId={selectedId} onSelect={setSelectedId}/>

      <TweaksPanel>
        <TweakSection label="边与关系"/>
        <TweakToggle label="曲线边" value={tweaks.curveEdges}
          onChange={v=>setTweak('curveEdges',v)}/>
        <TweakRadio label="边标签" value={tweaks.edgeLabelMode}
          options={[{value:'hover',label:'悬停'},{value:'always',label:'始终'}]}
          onChange={v=>setTweak('edgeLabelMode',v)}/>
        <TweakSection label="节点标签"/>
        <TweakRadio label="显示" value={tweaks.labelMode}
          options={[{value:'always',label:'始终'},{value:'hover',label:'悬停'},{value:'selected',label:'选中'}]}
          onChange={v=>setTweak('labelMode',v)}/>
        <TweakSection label="布局"/>
        <TweakRadio label="密度" value={tweaks.density}
          options={[{value:'compact',label:'紧凑'},{value:'standard',label:'标准'},{value:'loose',label:'宽松'}]}
          onChange={v=>setTweak('density',v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
