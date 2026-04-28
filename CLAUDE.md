# 本体智见平台 - 项目说明

## 项目简介
这是一个**本体知识图谱平台**，以气候/地理数据的展示和探索、ERA5等数据源的方法分类与文献信息。

## 技术栈
- 前端：纯 HTML + CSS + JavaScript（无框架，单文件）
- 数据：JSON 文件（由 Python 脚本从 Excel 生成）
- 无构建步骤，直接用浏览器打开 HTML 文件即可运行

## 通用样式与组件规范

### 样式（styles/shared.css）
- **新建页面**时，`<head>` 必须引入 `styles/shared.css`
- CSS 变量优先使用 `shared.css` 中已定义的，**不要在页面内重新定义同名变量**
- 变量命名规范：`--bg-0~4`（背景层级）、`--text-1~3`（文字层级）、`--border-1~2`（边框）、`--{color}-dim`（半透明变体）
- 字体引入模板（复制到新页面 `<head>`）：
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  ```

### 交互组件（scripts/components.js）
- 有**复用性**的交互组件（模态框、选择器、上传框等）统一写入 `scripts/components.js` 并 `export`
- 每个组件为**工厂函数**，返回统一控制对象：
  ```js
  const comp = createXxx({ onConfirm(result) {}, onCancel() {} })
  comp.open()     // 打开/显示
  comp.close()    // 关闭/隐藏
  comp.destroy()  // 销毁并清理事件监听
  ```
- 页面专属的一次性组件无需放入此文件，直接写在页面 `<script>` 内即可
- **新建页面**时，`<head>` 必须同时引入：
  ```html
  <link rel="stylesheet" href="styles/shared.css">
  <script src="scripts/components.js"></script>
  ```

### Toast 提示（showToast）
- 样式已定义在 `styles/shared.css`，函数已定义在 `scripts/components.js`
- 页面引入 `components.js` 后直接调用 `window.showToast(msg, duration?)`，**禁止**在页面内自行实现
- 页面需包含 `<div id="toast-container"></div>`（或由 `showToast` 首次调用时自动创建）
- 调用示例：
  ```js
  window.showToast('操作成功')                          // 默认 2.8s 后消失
  window.showToast('数据挂载中…', 2200)                 // 自定义时长
  setTimeout(() => window.showToast('挂载完成'), 2000)  // 延迟连续提示
  ```

## 颜色层级与组件规范（重要）

### 背景层级（必须遵守，禁止随意混用）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-0` | #080c18 | 页面最底层背景 |
| `--bg-1` | #0d1220 | 侧边栏 / 次级面板 |
| `--bg-2` | #0f1729 | 卡片 / 表单输入框（凹陷感） |
| `--bg-3` | #131d30 | Modal 主体 / 悬浮面板 |
| `--bg-4` | #1a2540 | Modal header/footer、下拉菜单（最高层） |

**典型层级关系**：页面(`--bg-0`) → 卡片(`--bg-2`) → Modal body(`--bg-3`) → Modal header/footer & 输入框(`--bg-4` / `--bg-2`) → 下拉(`--bg-4`)

> 输入框在 modal 内用 `--bg-2`，形成"凹陷"视觉；在普通页面上同样用 `--bg-2`。

### 必须使用 shared.css 组件，不自定义

| 需求 | 正确做法 |
|------|---------|
| 按钮 | `class="btn btn-primary"` / `btn-ghost` / `btn-secondary` / `btn-danger` |
| 表单字段 | `class="form-group"` + `form-label` + `form-input` / `form-select` / `form-textarea` |
| 下拉菜单 | `class="dropdown"` + `dropdown-item`，JS 切换 `.open` |
| 模态框 | `class="modal-overlay"` + `modal` + `modal-header` + `modal-body` + `modal-footer`，JS 切换 `.active` |
| 关闭按钮 | `class="btn-close"` |
| 徽章 | `class="badge badge-{color}"` |
| 空状态 | `class="empty-state"` |
| 滚动条 | 全局已统一（shared.css 自动生效）；代码/编辑器区域额外加 `class="scrollbar-code"` |

### 禁止事项
- 禁止在页面 `<style>` 内重新定义 `--bg-*`、`--text-*`、`--border-*` 等已有变量
- 禁止为上述组件创建页面专属的平行类（如 `ntpl-btn-primary`、`my-modal` 等）
- 禁止使用硬编码颜色值替代 CSS 变量（如 `background: #0f1729` 应改为 `var(--bg-2)`）
- Focus 状态必须包含 `box-shadow: 0 0 0 2px var(--blue-dim)`，不得仅改 border-color

## 用户背景
- 解释代码改动时，说明"为什么"，不只是"做了什么"
- 可以使用技术语言和复杂工具，优先保证解决效率

## 工作流程（重要）
- 用户描述需求并询问"有没有问题"时，只需回答是否有疑问，**不要开始执行任何修改**
- 必须等用户明确说"开始"、"去做"、"执行"等指令后，才开始实际修改文件或代码
- 每个任务完成后，在回复最后加一条分割线，并用以下格式标注完成状态：

```
---
** ✅️结果已完成**
```

## 语言
- 与用户交流时使用**中文**
- 代码注释可以用中文
