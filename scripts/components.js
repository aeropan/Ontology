/**
 * components.js — 通用交互组件库
 *
 * 使用方式：在页面底部以 module 方式引入
 *   <script type="module">
 *     import { createXxx } from './scripts/components.js';
 *   </script>
 *
 * ============================================================
 * 调用规范
 * ============================================================
 *
 * 每个组件均为工厂函数，返回统一的控制对象：
 *
 *   const comp = createXxx(options)
 *   comp.open()      // 打开 / 显示组件
 *   comp.close()     // 关闭 / 隐藏组件
 *   comp.destroy()   // 销毁组件，移除 DOM 并清理所有事件监听
 *
 * options 通用字段（各组件按需使用）：
 *   onConfirm(result)  确认/提交回调，result 为组件返回的数据
 *   onCancel()         取消/关闭回调
 *
 * 示例：
 *   const picker = createOntologyPicker({
 *     multiSelect: true,
 *     onConfirm: (nodes) => console.log('选中节点', nodes),
 *     onCancel:  () => console.log('已取消'),
 *   })
 *   picker.open()
 *
 * ============================================================
 * 工具函数
 * ============================================================
 */

/**
 * 创建并挂载模态框覆盖层
 * @param {string} innerHtml  - modal 内部 HTML
 * @returns {{ overlay: HTMLElement, modal: HTMLElement }}
 */
function _createModalDOM(innerHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
  document.body.appendChild(overlay);

  // 点击遮罩层关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  return { overlay, modal: overlay.querySelector('.modal') };
}

/**
 * 绑定 Escape 键关闭模态框
 * @param {HTMLElement} overlay
 * @returns {Function} 移除监听的函数（在 destroy 时调用）
 */
function _bindEscClose(overlay) {
  const handler = (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}


/* ============================================================
   页面顶部导航栏组件 (PageTopbar)
   ============================================================ */

/**
 * 模块导航配置表
 * 根据模块标识自动生成面包屑路径
 */
const MODULE_CONFIG = {
  knowledge: { name: '知识抽取与融合', path: '#' },
  literature: { name: '文献库', path: 'literature_list.html' },
  ontology: { name: '本体中心', path: 'ontology_center.html' },
  rag: { name: 'RAG增强管理', path: 'rag_management.html' },
  business: { name: '业务本体生成', path: 'arrange_list.html' },
  industry: { name: '行业洞察', path: 'IndustryInsights_list.html' }
};

/**
 * 创建并挂载页面顶部导航栏（全局函数方式）
 *
 * @param {Object} options
 *   - module      {string}   模块标识
 *   - pageName    {string}   当前页面名称
 *   - subPages    {Array}    多级面包屑 [{name:'',path:''}, ...]
 *   - container   {HTMLElement} 挂载容器，默认 document.body
 *   - showBack    {boolean}  是否显示返回按钮，默认 true
 *   - onBack      {Function} 返回按钮点击回调
 */
function renderPageTopbar(options = {}) {
  const {
    module = '',
    pageName = '',
    subPages = [],
    container = document.body,
    showBack = true,
    onBack = null
  } = options;

  // 获取模块配置
  const moduleConf = MODULE_CONFIG[module] || { name: module || '未知模块', path: '#' };

  // 构建面包屑 HTML
  let breadcrumbHtml = `<a href="${moduleConf.path}" class="topbar-module">${moduleConf.name}</a>`;

  // 添加中间层级
  subPages.forEach(sub => {
    breadcrumbHtml += `<span class="topbar-sep">›</span><a href="${sub.path || '#'}" class="topbar-sub">${sub.name}</a>`;
  });

  // 添加当前页面
  breadcrumbHtml += `<span class="topbar-sep">›</span><span class="topbar-current">${pageName}</span>`;

  // 右侧操作区
  let rightHtml = '';
  if (showBack) {
    rightHtml = `<button class="topbar-back" onclick="${onBack ? onBack.toString() + '()' : 'history.back()'}">← 返回</button>`;
  }

  // 创建 DOM
  const topbar = document.createElement('div');
  topbar.className = 'page-topbar';
  topbar.innerHTML = `
    <nav class="topbar-breadcrumb">${breadcrumbHtml}</nav>
    <div class="topbar-actions">${rightHtml}</div>
  `;

  // 插入到容器最前面
  if (container.firstChild) {
    container.insertBefore(topbar, container.firstChild);
  } else {
    container.appendChild(topbar);
  }

  return topbar;
}

// 导出为全局函数（供传统 script 调用）
window.renderPageTopbar = renderPageTopbar;


/* ============================================================
   Toast 提示（showToast）
   ============================================================
   依赖：styles/shared.css 中的 #toast-container / .toast 样式
   页面需包含 <div id="toast-container"></div>，
   或由本函数首次调用时自动创建。

   调用示例：
     showToast('操作成功')
     showToast('数据挂载中…', 2200)
     setTimeout(() => showToast('挂载完成，为 1 个节点挂载数据'), 2000)
   ============================================================ */

function showToast(msg, duration = 2800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

// 挂载到 window 供非模块页面直接调用
window.showToast = showToast;


/* ============================================================
   跨页面跳转（gotoExternal）
   ============================================================
   页面内如需跳转到另一个 HTML 文件，禁止直接使用 location.href，
   必须通过 gotoExternal(file) 让 Shell 先处理 opacity 遮罩或转场动效。

   - 目标为 Arrange_white.html 时：通知 Shell 播放全屏 3D 转场并顶层跳转
   - 其他页面：沿用 NAVIGATE_TO 消息，由 Shell 代为 navigate
   ============================================================ */
function gotoExternal(file) {
  if (!file) return;
  // iframe 内统一发消息给 Shell，由 index.html 决定转场或直接 navigate
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'NAVIGATE_TO', file: file }, '*');
    return;
  }
  // 独立打开（非 iframe）时直接跳转
  window.location.href = file;
}
window.gotoExternal = gotoExternal;


/* ============================================================
   组件注册区
   新增组件时在此处 export，并遵循上方调用规范
   ============================================================ */

// export function createUploadModal(options = {}) {
//   /**
//    * 上传文献组件
//    * options:
//    *   accept       {string}    允许的文件类型，默认 '.pdf,.docx'
//    *   onConfirm    {Function}  上传成功回调，参数为文件对象
//    *   onCancel     {Function}  取消回调
//    */
// }

// export function createOntologyPicker(options = {}) {
//   /**
//    * 选择本体节点组件
//    * options:
//    *   multiSelect  {boolean}   是否多选，默认 false
//    *   onConfirm    {Function}  确认回调，参数为选中节点数组
//    *   onCancel     {Function}  取消回调
//    */
// }


/* ============================================================
   Shell 导航同步（IFRAME_NAVIGATED）
   ============================================================
   当本页面运行在 index.html 的 iframe 内时，自动通知 Shell
   更新 currentFile，保证侧边栏导航始终可用。

   机制：页面脚本执行时（同步），读取自身 window.location.pathname
   提取文件名，通过 postMessage 发给父窗口（index.html）。

   新建页面只需引入 components.js，无需任何额外代码。
   ============================================================ */
(function notifyShellNavigation() {
  if (window.parent === window) return; // 非 iframe 环境，跳过
  const file = window.location.pathname.split('/').pop().split('?')[0];
  if (file) {
    window.parent.postMessage({ type: 'IFRAME_NAVIGATED', file }, '*');
  }
})();
