/* global React, ReactDOM, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor, useTweaks */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ═══════════════════════════════════════════════════════════════════════════
   Demo data + helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const NODE_TYPES = [
  { k: 'class',    cn: '类',   tint: 't-class'    },
  { k: 'property', cn: '属性', tint: 't-property' },
  { k: 'instance', cn: '实例', tint: 't-instance' },
  { k: 'concept',  cn: '概念', tint: 't-concept'  },
];

const BIZ_TYPES = [
  { k: 'data',       cn: '数据' },
  { k: 'algorithm',  cn: '算法' },
  { k: 'model',      cn: '模型' },
  { k: 'metric',     cn: '指标' },
  { k: 'task',       cn: '任务' },
  { k: 'constraint', cn: '约束' },
];

// Canned library of references — powers suggest + deduplication.
const LIBRARY = [
  { id:'L-001', type:'doi',   key:'10.1038/s41586-023-06924-6',
    title:'Emergent abilities of large language models at trillion-parameter scale',
    meta:'Nature · 2023 · Wei, J. et al.' },
  { id:'L-002', type:'arxiv', key:'arXiv:2401.04088',
    title:'Mixture of experts for efficient foundation models',
    meta:'arXiv · 2024 · Jiang, A. et al.' },
  { id:'L-003', type:'doi',   key:'10.1145/3528223.3530127',
    title:'Graph-augmented retrieval for knowledge intensive tasks',
    meta:'KDD · 2023 · Chen, L. & Park, S.' },
  { id:'L-004', type:'arxiv', key:'arXiv:2310.11511',
    title:'Self-supervised ontology induction from scientific corpora',
    meta:'arXiv · 2023 · Park, S.' },
  { id:'L-005', type:'ref',   key:'ICLR-2024-472',
    title:'洞察时空：面向科研知识的本体自动构建',
    meta:'ICLR · 2024 · 张伟, 李娜' },
  { id:'L-006', type:'ref',   key:'NeurIPS-2022-3812',
    title:'Neural-symbolic reasoning over dynamic knowledge graphs',
    meta:'NeurIPS · 2022 · Kumar, R.' },
  { id:'L-007', type:'url',   key:'https://github.com/knowgraph/osint',
    title:'knowgraph/osint — open ontology alignment toolkit',
    meta:'GitHub · maintained 2024' },
  { id:'L-008', type:'doi',   key:'10.1109/TKDE.2022.3193012',
    title:'A survey on knowledge graph embedding',
    meta:'IEEE TKDE · 2022 · Ji, S. et al.' },
];

// Detect a pasted string's type: doi / arxiv / url / ref / invalid.
function detectType(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^10\.\d{4,9}\/\S+$/i.test(s))                return 'doi';
  if (/^(doi:)?10\.\d{4,9}\/\S+$/i.test(s))         return 'doi';
  if (/^arxiv:\s*\d{4}\.\d{4,5}(v\d+)?$/i.test(s))  return 'arxiv';
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(s))            return 'arxiv';
  if (/^https?:\/\//i.test(s))                      return 'url';
  if (/^[A-Z][A-Za-z]+-\d{4}-\d+$/.test(s))         return 'ref';
  if (s.length >= 3 && s.length <= 120)             return 'ref';
  return 'invalid';
}

function normalizeKey(raw, type) {
  let s = String(raw || '').trim();
  if (type === 'doi')   s = s.replace(/^doi:\s*/i, '');
  if (type === 'arxiv') s = s.replace(/^arxiv:\s*/i, 'arXiv:').replace(/^(\d)/, 'arXiv:$1');
  return s;
}

// Match a raw input against the library (loose substring over title+key).
function searchLibrary(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return LIBRARY.filter(e =>
    e.key.toLowerCase().includes(s) ||
    e.title.toLowerCase().includes(s) ||
    e.meta.toLowerCase().includes(s)
  ).slice(0, 5);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Ghost back-app shell — intentionally de-emphasised behind the scrim
   ═══════════════════════════════════════════════════════════════════════════ */

function AppShell() {
  return (
    <div className="app" aria-hidden="true">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">洞</div>
          <div>
            <div className="brand-name">洞察时空</div>
            <div className="brand-sub">Insight Synctime</div>
          </div>
        </div>
        <div className="nav-section">概览</div>
        <div className="nav-item"><span className="dot"/>主页</div>
        <div className="nav-item"><span className="dot"/>任务中心</div>
        <div className="nav-section">知识工厂</div>
        <div className="nav-item"><span className="dot"/>知识抽取与融合</div>
        <div className="nav-item"><span className="dot"/>文献库</div>
        <div className="nav-item active"><span className="dot"/>本体中心</div>
        <div className="nav-item"><span className="dot"/>RAG 增强管理</div>
        <div className="nav-section">服务中心</div>
        <div className="nav-item"><span className="dot"/>业务本体生成</div>
        <div className="nav-item"><span className="dot"/>行业洞察</div>
        <div className="nav-item"><span className="dot"/>API 管理</div>
      </aside>
      <section className="main">
        <div className="topbar">
          <div className="crumbs">
            <span>本体中心</span>
            <span className="slash">/</span>
            <span>AI_RESEARCH_INSTRUMENTS</span>
            <span className="slash">/</span>
            <span>图谱视图</span>
            <span className="pill ok">v2.3 · synced</span>
          </div>
          <div className="top-right">
            <span>节点 12,408</span>
            <span>边 31,972</span>
          </div>
        </div>
        <div className="work">
          <div className="tree">
            <div className="tree-search">
              <span>⌕</span>
              <span>搜索本体、节点…</span>
            </div>
            <div className="tree-node l1"><span className="caret">▾</span><span className="ic"/>Research_Instruments<span className="cnt">2,408</span></div>
            <div className="tree-node l2"><span className="caret">▾</span>Observability<span className="cnt">612</span></div>
            <div className="tree-node l3">TelemetryModel<span className="cnt">41</span></div>
            <div className="tree-node l3">TracePipeline<span className="cnt">28</span></div>
            <div className="tree-node l3">MetricStore<span className="cnt">19</span></div>
            <div className="tree-node l2"><span className="caret">▸</span>RetrievalAugment<span className="cnt">488</span></div>
            <div className="tree-node l2"><span className="caret">▸</span>EvaluationHarness<span className="cnt">204</span></div>
            <div className="tree-node l1"><span className="caret">▸</span><span className="ic"/>Synthetic_Corpora<span className="cnt">1,118</span></div>
            <div className="tree-node l1"><span className="caret">▸</span><span className="ic"/>Embedding_Models<span className="cnt">402</span></div>
            <div className="tree-node l1"><span className="caret">▸</span><span className="ic"/>Tool_Invocation<span className="cnt">318</span></div>
          </div>
          <div className="canvas">
            <div className="canvas-toolbar">
              <button className="tb-btn">布局</button>
              <button className="tb-btn">视图</button>
              <button className="tb-btn primary">过滤</button>
            </div>
            <svg className="ghost-graph" viewBox="0 0 600 400" width="80%" height="80%">
              <defs>
                <radialGradient id="gnode" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity=".8"/>
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
                </radialGradient>
              </defs>
              {Array.from({length:24}).map((_,i)=>{
                const cx = 60 + (i*73)%520;
                const cy = 40 + (i*101)%320;
                return <circle key={i} cx={cx} cy={cy} r={4 + (i%5)} fill="url(#gnode)"/>;
              })}
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ChipInput — the star of the show
   ═══════════════════════════════════════════════════════════════════════════ */

function ChipInput({ chips, onChange, showTypeHints }) {
  const [draft, setDraft] = useState('');
  const [focus, setFocus] = useState(false);
  const [sugIdx, setSugIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!draft.trim()) return [];
    const keys = new Set(chips.map(c => c.key));
    return searchLibrary(draft).filter(s => !keys.has(s.key));
  }, [draft, chips]);

  useEffect(() => { setSugIdx(0); }, [draft]);

  const commit = useCallback((raw, meta = {}) => {
    const parts = String(raw)
      .split(/[\n,;]+/g)
      .map(p => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const existing = new Set(chips.map(c => c.key));
    const next = [...chips];
    for (const p of parts) {
      const type = meta.type ?? detectType(p);
      if (!type) continue;
      const key = normalizeKey(p, type);
      if (existing.has(key)) continue;
      existing.add(key);
      const lib = LIBRARY.find(e => e.key === key);
      next.push({
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        key,
        type,
        title: meta.title ?? lib?.title ?? null,
        meta:  meta.meta  ?? lib?.meta  ?? null,
        invalid: type === 'invalid',
      });
    }
    onChange(next);
    setDraft('');
  }, [chips, onChange]);

  const removeAt = (i) => onChange(chips.filter((_,idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length && sugIdx >= 0) {
        const s = suggestions[sugIdx];
        commit(s.key, { type: s.type, title: s.title, meta: s.meta });
      } else if (draft.trim()) {
        commit(draft);
      }
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === 'Backspace' && !draft && chips.length) {
      removeAt(chips.length - 1);
    } else if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setSugIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setSugIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setDraft('');
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (/[\n,;]/.test(text)) {
      e.preventDefault();
      commit(text);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) commit(t);
    } catch {}
    inputRef.current?.focus();
  };

  const isEmpty = chips.length === 0 && !draft;

  return (
    <div className="suggest">
      <div
        ref={wrapRef}
        className={`chip-field ${focus ? 'focused' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className={`chip-field-top ${isEmpty ? 'empty' : ''}`}>
          {chips.map((c, i) => (
            <span
              key={c.id}
              className={`chip ${c.invalid ? 'invalid' : ''} ${c.type === 'doi' ? 'doi' : ''} ${c.type === 'url' ? 'url' : ''}`}
              title={c.title ? `${c.title}\n${c.meta || ''}` : c.key}
            >
              {showTypeHints && !c.invalid && (
                <span className="chip-num">{c.type.toUpperCase()}</span>
              )}
              <span className="chip-t">{c.title || c.key}</span>
              <button className="chip-x" onClick={(e)=>{e.stopPropagation();removeAt(i);}} aria-label="移除">×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="chip-input"
            value={draft}
            placeholder={chips.length ? '继续添加…' : '输入 DOI / arXiv ID / URL / 文献编号，回车添加'}
            onChange={(e)=>setDraft(e.target.value)}
            onFocus={()=>setFocus(true)}
            onBlur={()=>setTimeout(()=>setFocus(false), 120)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
        </div>
        <div className="chip-field-foot">
          <div className="hints">
            <span><kbd>Enter</kbd> 添加</span>
            <span><kbd>,</kbd> / <kbd>;</kbd> 分隔</span>
            <span className="paste" onClick={pasteFromClipboard}>从剪贴板粘贴多条</span>
          </div>
          <div className="chip-count">{chips.length} 条</div>
        </div>
      </div>

      {focus && suggestions.length > 0 && (
        <div className="suggest-pop">
          <div className="sug-hd">文献库匹配 · ↑↓ 选择 · Enter 添加</div>
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              className={`sug-item ${i === sugIdx ? 'active' : ''}`}
              onMouseDown={(e)=>{e.preventDefault();commit(s.key,{type:s.type,title:s.title,meta:s.meta});}}
              onMouseEnter={()=>setSugIdx(i)}
            >
              <span className={`sug-type ${s.type}`}>{s.type.toUpperCase()}</span>
              <div className="sug-col">
                <div className="sug-title">{s.title}</div>
                <div className="sug-meta">{s.key} · {s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Textarea variant — a lightweight alternative surfaced via Tweaks
   ═══════════════════════════════════════════════════════════════════════════ */

function TextareaInput({ value, onChange }) {
  return (
    <textarea
      className="ta-field"
      placeholder={"每行一条引用，支持：\n10.1038/s41586-023-06924-6\narXiv:2401.04088\nhttps://example.com/paper"}
      value={value}
      onChange={(e)=>onChange(e.target.value)}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   List variant — numbered rows with explicit add
   ═══════════════════════════════════════════════════════════════════════════ */

function ListInput({ chips, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    const keys = new Set(chips.map(c=>c.key));
    if (keys.has(t)) { setDraft(''); return; }
    const type = detectType(t);
    const lib = LIBRARY.find(e => e.key === t);
    onChange([...chips, {
      id:`c-${Date.now()}`, key:t, type,
      title: lib?.title ?? null, meta: lib?.meta ?? null, invalid: type==='invalid'
    }]);
    setDraft('');
  };
  return (
    <div className="list-field">
      {chips.length === 0 && (
        <div style={{padding:'16px 14px', color:'var(--text-4)', fontSize:12}}>暂无文献，从下方输入添加</div>
      )}
      {chips.map((c, i) => (
        <div className="list-row" key={c.id}>
          <span className="rn">{i+1}</span>
          <span className="tt">{c.title || c.key}</span>
          <span className={`tag-pill ${c.type}`}>{(c.type||'?').toUpperCase()}</span>
          <button className="rx" onClick={()=>onChange(chips.filter((_,idx)=>idx!==i))}>×</button>
        </div>
      ))}
      <div className="list-add">
        <input
          placeholder="DOI / arXiv / URL / 文献编号"
          value={draft}
          onChange={(e)=>setDraft(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); add(); } }}
        />
        <button onClick={add} disabled={!draft.trim()}>添加</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Simple — matches original screenshot (plain input). For comparison.
   ═══════════════════════════════════════════════════════════════════════════ */

function SimpleInput({ value, onChange }) {
  return (
    <input className="simple-field" placeholder="输入关键词或文献编号" value={value} onChange={e=>onChange(e.target.value)}/>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dialog
   ═══════════════════════════════════════════════════════════════════════════ */

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 6.2L5 8.7L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function TagCheckbox({ item, checked, disabled, onToggle, tintClass }) {
  return (
    <button
      type="button"
      className={`tag ${tintClass || ''} ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onToggle()}
      aria-pressed={checked}
      aria-disabled={disabled}
    >
      <span className="box"><CheckIcon/></span>
      <span className="k">{item.k}</span>
      <span className="cn">{item.cn}</span>
    </button>
  );
}

function FilterDialog({ tweaks, setTweak }) {
  const [nodeTypes, setNodeTypes] = useState(new Set(['class','property','instance','concept']));
  const [chips, setChips] = useState([
    { id:'seed-1', key:'10.1038/s41586-023-06924-6', type:'doi',
      title:'Emergent abilities of large language models at trillion-parameter scale',
      meta:'Nature · 2023 · Wei, J. et al.' },
    { id:'seed-2', key:'arXiv:2401.04088', type:'arxiv',
      title:'Mixture of experts for efficient foundation models',
      meta:'arXiv · 2024 · Jiang, A. et al.' },
  ]);
  const [textareaVal, setTextareaVal] = useState(
    '10.1038/s41586-023-06924-6\narXiv:2401.04088'
  );
  const [simpleVal, setSimpleVal] = useState('');
  const [bizTypes, setBizTypes] = useState(new Set());

  const toggleNode = (k) => {
    const n = new Set(nodeTypes);
    n.has(k) ? n.delete(k) : n.add(k);
    setNodeTypes(n);
  };
  const toggleBiz = (k) => {
    const n = new Set(bizTypes);
    n.has(k) ? n.delete(k) : n.add(k);
    setBizTypes(n);
  };

  const allNode = nodeTypes.size === NODE_TYPES.length;
  const allBiz  = bizTypes.size === BIZ_TYPES.length;

  const reset = () => {
    setNodeTypes(new Set(['class','property','instance','concept']));
    setChips([]);
    setTextareaVal('');
    setSimpleVal('');
    setBizTypes(new Set());
  };

  // Count references in a variant-aware way for the footer summary.
  const refCount = (() => {
    switch (tweaks.sourceVariant) {
      case 'textarea': return textareaVal.split('\n').map(s=>s.trim()).filter(Boolean).length;
      case 'simple':   return simpleVal.trim() ? 1 : 0;
      default:         return chips.length;
    }
  })();

  const totalFilters = nodeTypes.size + refCount + bizTypes.size;

  return (
    <>
      <div className="scrim"/>
      <div className="dialog" role="dialog" aria-labelledby="dlg-title">
        <div className="dlg-head">
          <div className="dlg-title">
            <span className="bar"/>
            <span id="dlg-title">图谱过滤</span>
            <span className="dlg-count">{totalFilters} 条规则</span>
          </div>
          <button className="dlg-x" aria-label="关闭">×</button>
        </div>

        <div className="dlg-body">
          {/* ── Node types ──────────────────────────────────────── */}
          <div className="sec">
            <div className="sec-hd">
              <div className="sec-hd-l">
                <span className="sec-label">节点类型</span>
                <span className="sec-key">type</span>
              </div>
              <span
                className="sec-action"
                onClick={()=>setNodeTypes(new Set(allNode ? [] : NODE_TYPES.map(n=>n.k)))}
              >
                {allNode ? '全部取消' : '全选'}
              </span>
            </div>
            <div className="tag-grid">
              {NODE_TYPES.map(n => (
                <TagCheckbox
                  key={n.k}
                  item={n}
                  tintClass={n.tint}
                  checked={nodeTypes.has(n.k)}
                  onToggle={()=>toggleNode(n.k)}
                />
              ))}
            </div>
          </div>

          {/* ── Source references ───────────────────────────────── */}
          <div className="sec">
            <div className="sec-hd">
              <div className="sec-hd-l">
                <span className="sec-label">来源文献</span>
                <span className="sec-key">source_references</span>
              </div>
              <span className="sec-action" title="切换输入形态（Tweaks 面板）">
                样式 · {({chips:'chips',textarea:'textarea',list:'list',simple:'simple'})[tweaks.sourceVariant]}
              </span>
            </div>

            {tweaks.sourceVariant === 'chips' && (
              <ChipInput chips={chips} onChange={setChips} showTypeHints={tweaks.showTypeHints}/>
            )}
            {tweaks.sourceVariant === 'textarea' && (
              <TextareaInput value={textareaVal} onChange={setTextareaVal}/>
            )}
            {tweaks.sourceVariant === 'list' && (
              <ListInput chips={chips} onChange={setChips}/>
            )}
            {tweaks.sourceVariant === 'simple' && (
              <SimpleInput value={simpleVal} onChange={setSimpleVal}/>
            )}
          </div>

          {/* ── Business type ───────────────────────────────────── */}
          <div className="sec">
            <div className="sec-hd">
              <div className="sec-hd-l">
                <span className="sec-label">业务类型</span>
                <span className="sec-key">business_type</span>
              </div>
              <span
                className="sec-action"
                onClick={()=>setBizTypes(new Set(allBiz ? [] : BIZ_TYPES.map(b=>b.k)))}
              >
                {allBiz ? '全部取消' : '全选'}
              </span>
            </div>
            <div className="sec-note">
              business_type 为空的节点不参与此维度过滤
            </div>
            <div className="tag-grid">
              {BIZ_TYPES.map(b => (
                <TagCheckbox
                  key={b.k}
                  item={b}
                  checked={bizTypes.has(b.k)}
                  onToggle={()=>toggleBiz(b.k)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="dlg-foot">
          <div className="foot-summary">
            将应用 <b>{totalFilters}</b> 条规则，预计命中 <b>{Math.max(0, 12408 - refCount * 312 - (4 - nodeTypes.size) * 980 - bizTypes.size * 142)}</b> / 12,408 节点
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn ghost" onClick={reset}>重置</button>
            <button className="btn primary">确认过滤</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Root
   ═══════════════════════════════════════════════════════════════════════════ */

function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    // derived soft + ring
    const hex = tweaks.accent.replace('#','');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r},${g},${b},.14)`);
    document.documentElement.style.setProperty('--accent-ring', `rgba(${r},${g},${b},.28)`);
    document.documentElement.style.setProperty('--accent-2', `rgba(${r+30},${Math.min(255,g+30)},${Math.min(255,b+30)},1)`);
  }, [tweaks.accent]);

  return (
    <>
      <AppShell/>
      <FilterDialog tweaks={tweaks} setTweak={setTweak}/>
      <TweaksPanel>
        <TweakSection label="来源文献输入方式"/>
        <TweakRadio
          label="变体"
          value={tweaks.sourceVariant}
          options={[
            { value: 'chips',    label: 'Chips' },
            { value: 'list',     label: 'List' },
            { value: 'textarea', label: 'Text' },
            { value: 'simple',   label: 'Simple' },
          ]}
          onChange={(v)=>setTweak('sourceVariant', v)}
        />
        <TweakToggle
          label="显示类型标签"
          value={tweaks.showTypeHints}
          onChange={(v)=>setTweak('showTypeHints', v)}
        />
        <TweakSection label="外观"/>
        <TweakColor
          label="主色"
          value={tweaks.accent}
          onChange={(v)=>setTweak('accent', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
