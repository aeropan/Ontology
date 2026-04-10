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
