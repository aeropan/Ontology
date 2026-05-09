# 本体智见平台 — 项目概览

## 一、项目简介

本体智见平台是一个**本体知识图谱系统**，聚焦于气候/地理/风电领域的数据展示、方法分类与文献信息管理。核心用户为"图谱工程师"，帮助其完成从文献抽取、本体构建到行业洞察的全流程工作。

- **技术栈**：纯 HTML + CSS + JavaScript，无框架，无构建步骤，浏览器直接打开
- **样式体系**：`styles/shared.css` 统一 CSS 变量（深色主题设计系统）
- **组件库**：`scripts/components.js` 可复用交互组件（工厂函数模式）
- **数据管道**：Excel → Python 脚本 → JSON → HTML 内嵌

---

## 二、架构设计

### 整体结构：iframe Shell 模式

```
index.html（Shell 外壳）
├── 左侧固定导航栏
├── 顶部面包屑栏
└── 右侧 iframe 内容区
    ├── main.html（多页面视图切换）
    ├── IndustryInsights_*.html（行业洞察模块）
    ├── RAGrule_*.html（RAG增强管理模块）
    ├── data_explorer.html（数据浏览器，旧版备份）
    └── 其他独立页面
```

### 路由机制

- **跨文件切换**：Shell 通过 `iframe.src` 加载不同 HTML 文件；对 `main.html` 使用 `?page=xxx` URL 参数直接定位子页面，避免加载时闪现首页
- **同文件内切换**：通过 `postMessage` 发送 `{ type: 'GOTO', page: 'xxx' }` 指令
- **面包屑同步**：子页面通过 `postMessage` 发送 `{ type: 'NAV', crumbs: [...], navId: '...' }` 更新 Shell 面包屑
- **路由配置**：Shell 中的 `NAV_MAP` 对象统一管理所有导航项

### Shell 导航同步机制（IFRAME_NAVIGATED）

部分页面通过 `location.href` 在 iframe 内部跳转（如 ke 流程各步骤、行业洞察子页面），Shell 无法感知，导致 `currentFile` 状态过时、侧边栏点击失效。

**解决方案**：`components.js` 在加载时自动执行，读取自身 `window.location.pathname`，向父窗口发送 `{ type: 'IFRAME_NAVIGATED', file: '文件名' }`，Shell 收到后更新 `currentFile`。

```
任意子页面加载
  → components.js 自动执行
  → postMessage({ type: 'IFRAME_NAVIGATED', file: 'xxx.html' })
  → index.html 更新 currentFile
  → 侧边栏导航恢复正常
```

**约定**：新建任何在 iframe 内运行的页面，引入 `components.js` 即可，无需手动添加任何通知代码。

### main.html 内部页面

`main.html` 是最大的文件（~10870行），包含 18 个 page 视图，通过 `display:none/block` 切换：

| 页面 ID | 功能 |
|---------|------|
| `page-home` | 主页仪表盘 |
| `page-global-library` | 全局文献库 |
| `page-tc-list` / `page-tc-detail-*` | 任务中心（列表+详情） |
| `page-ke-tasks` / `page-ke-library` / `page-ke-config` / `page-ke-review` | 知识抽取与融合 |
| `page-onto-list` / `page-onto-preview` / `page-onto-editor` / `page-onto-text-view` / `page-onto-versions` | 本体中心 |
| `page-biz-list` / `page-biz-detail` | 业务本体生成 |

---

## 三、文件清单与功能说明

### 核心页面

| 文件 | 行数 | 功能 |
|------|------|------|
| `index.html` | ~406 | Shell 外壳：侧边栏导航 + 面包屑 + iframe |
| `main.html` | ~10870 | 核心多功能页：主页、任务中心、知识抽取、本体中心、业务本体 |
| `data_explorer.html` | ~5195 | 行业洞察旧版备份：ERA5 数据源交互式浏览器 |

### 知识抽取与融合模块（4个独立文件）

从 `main.html` 的任务列表进入后，各步骤为独立 HTML 页面，形成串行流水线：

```
main.html(ke-tasks) → ke_literature → ke_qa → ke_extract_config → ke_review → graph.html
```

| 文件 | 功能 |
|------|------|
| `ke_literature.html` | 上传文献（步骤1） |
| `ke_qa.html` | 文献质检（步骤2） |
| `ke_extract_config.html` | 抽取配置与结果（步骤3） |
| `ke_review.html` | 结果确认与审核（步骤4） |

### 本体图谱编辑器（1个文件）

| 文件 | 功能 |
|------|------|
| `graph.html` | 本体图谱编辑器（2D/3D 可视化、节点关系编辑、数据挂载） |

### 行业洞察模块（7个文件）

入口由侧边栏直接加载，内部各步骤通过 `location.href` 串联：

| 文件 | 功能 |
|------|------|
| `IndustryInsights_list.html` | 洞察任务列表（卡片式，支持筛选/搜索/新建弹窗）← 侧边栏入口 |
| `IndustryInsights_setting.html` | 新建洞察：配置数据源与参数 |
| `IndustryInsights_config.html` | 洞察参数详细配置 |
| `IndustryInsights_progress.html` | 执行进度（步骤条+日志） |
| `IndustryInsights_detail.html` | 洞察结果详情（结论面板+图表+方法统计） |
| `IndustryInsights_templatelist.html` | 洞察模板列表 |
| `IndustryInsights_templatedetail.html` | 洞察模板详情与编辑 |

### RAG增强管理模块（2个文件）

| 文件 | 功能 |
|------|------|
| `RAGrule_list.html` | 规则集列表（卡片+下拉菜单：修改/复制/删除）← 侧边栏入口 |
| `RAGrule_detail.html` | 规则集详情与编辑 |

### 业务本体生成模块（4个文件）

| 文件 | 功能 |
|------|------|
| `arrange_list.html` | 业务本体列表 ← 侧边栏入口 |
| `arrange_template.html` | 从模板新建业务本体 |
| `Arrange.html` | 业务本体排版编辑器 |
| `arrange_compare.html` | 业务本体对比视图 |

### 其他页面

| 文件 | 功能 |
|------|------|
| `setting_backup.html` | 数据分析设置（备份） |

### 样式与脚本

| 文件 | 功能 |
|------|------|
| `styles/shared.css` | 全局设计规范：CSS 变量、重置样式、通用组件样式 |
| `scripts/components.js` | 通用交互组件库；含 Shell 导航同步自动机制（见下文） |

### 数据与脚本

| 文件 | 功能 |
|------|------|
| `data/data_explorer.xlsx` | 数据源（Excel，人工维护） |
| `data/explorer_data.json` | 由脚本自动生成，勿手动修改 |
| `data/method_taxonomy.json` | 方法三级分类体系（父→子→孙），供 update_data.py 和前端使用 |
| `data/method_config.json` | 方法配置 |
| `update_data.py` | 数据更新脚本：读取 Excel → 生成 JSON → 内嵌进 HTML |

### 静态资源

| 文件 | 功能 |
|------|------|
| `asset/logo.png` | 平台 Logo |
| `asset/ezgif-*.gif` | 动图资源 |
| `logo.png` | 根目录 Logo（index.html 引用） |

---

## 四、数据文件说明

### 数据更新流程

```
data/data_explorer.xlsx          ← 人工维护的数据源
        │
        ▼  update_data.py
        ├── data/explorer_data.json   ← 中间产物（可查错）
        └── data_explorer.html        ← 数据内嵌进 JS 变量 EXPLORER_DATA
```

操作步骤：
1. 替换 `data/data_explorer.xlsx`
2. 运行 `python update_data.py`
3. 重新打开 `data_explorer.html` 即可看到最新数据

### method_taxonomy.json 结构

三级分类：`父类(parents)` → `子类(children)` → `孙类(grandchildren)`

当前包含的父类：
- 星阙大模型
- 传统统计与时间序列模型
- 经典机器学习模型
- 神经网络与深度学习模型
- 时空预测与图神经网络模型
- 集成、组合与优化模型
- 概率预测与不确定性量化方法
- 气象与物理类专业模型
- 其他与特定范式模型
- 微调 / 输入通道 / 特征融合 / 后处理校正 / 条件注入
- 其他（未知方法自动归入）

---

## 五、样式与组件规范

### CSS 变量体系（shared.css）

```css
/* 背景层级（从深到浅） */
--bg-0 ~ --bg-4

/* 边框 */
--border-1, --border-2

/* 文字 */
--text-1（主）, --text-2（次）, --text-3（占位/禁用）

/* 品牌色 + dim 变体 */
--blue / --blue-dim
--cyan / --cyan-dim
--purple / --purple-dim
--green / --green-dim
--amber / --amber-dim
--rose / --rose-dim

/* 渐变 */
--grad-1（蓝→紫）, --grad-2（青→蓝）, --grad-3（紫→粉）

/* 字体 */
--font-sans: 'Noto Sans SC'
--font-mono: 'JetBrains Mono'
```

### 通用组件（shared.css 已定义样式）

- **按钮**：`.btn .btn-primary / .btn-secondary / .btn-ghost / .btn-danger` + `.btn-sm / .btn-lg`
- **徽章**：`.badge .badge-blue / .badge-cyan / .badge-purple / .badge-green / .badge-amber / .badge-rose`
- **模态框**：`.modal-overlay > .modal > .modal-header + .modal-body + .modal-footer`
- **关闭按钮**：`.btn-close`
- **空状态**：`.empty-state > .empty-icon + .empty-text`

### components.js 组件模式

每个组件为工厂函数，返回统一控制对象：

```javascript
const comp = createXxx({ onConfirm(result) {}, onCancel() {} });
comp.open();     // 打开/显示
comp.close();    // 关闭/隐藏
comp.destroy();  // 销毁并清理事件监听
```

### 字体引入（每个页面 <head> 必须包含）

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 六、新页面融合流程

### 1. 设计新页面

向大模型提供样式规范（CSS 变量、字体、body 样式），要求：
- 不含侧边栏和顶部栏（Shell 已有）
- body 样式：`background: var(--bg); min-height: 100vh; overflow-y: auto; margin: 0; padding: 24px;`
- 弹窗用 CSS class 控制，不用 `alert()`
- 引入 `styles/shared.css`

### 2. 融合到 Shell

在 `index.html` 中修改两处：

**A. 侧边栏加导航项：**
```html
<div class="nav-item" id="nav-xxx" onclick="navigate('new_page.html', null, ['显示名称'])">
  <svg class="nav-icon" ...>...</svg>
  显示名称
</div>
```

**B. NAV_MAP 注册路由：**
```javascript
'nav-xxx': { file: 'new_page.html', page: null, crumbs: ['显示名称'] },
```

### 3. 子页面通知 Shell 更新面包屑

```javascript
function notifyShell(crumbs) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'NAV', crumbs: crumbs }, '*');
  }
}
```

---

## 七、Git 与版本管理

### .gitignore 规则

当前排除的文件/目录：
- `.env` — 环境变量
- `.vscode/` — VSCode 配置
- `backup/` — 备份目录
- `data/data_explorer_backup.xlsx` — 数据备份
- `update_data.py` — 数据更新脚本
- `scripts/algo_tag_stats_spec.md` — 规格文档
- `README.md` — 说明文档
- `数据更新操作手册.md` / `新功能页面融合手册.md` — 操作手册

### 提交规范（Conventional Commits）

```
feat: 新功能
fix: 修复 bug
docs: 文档变更
style: 格式调整（不影响逻辑）
refactor: 重构
chore: 构建/工具/配置变更
```

示例：
```
feat(IndustryInsights): 列表页增加批量删除功能
fix(RAGrule): 修复规则集删除后列表未刷新
chore: 添加 .gitignore
```

### 远程仓库

- GitHub: `https://github.com/aeropan/Ontology.git`
- 主分支: `main`
- 已有 PR 合并历史，建议继续使用分支 + PR 工作流

---

## 八、关键约定

### 命名规范

- 行业洞察模块：`IndustryInsights_*.html`
- RAG规则模块：`RAGrule_*.html`
- 页面文件名：英文小写 + 下划线，不含中文和空格
- CSS 变量：`--bg-0~4`（背景层级）、`--text-1~3`（文字层级）、`--{color}-dim`（半透明变体）

### 弹窗规范

- 使用 `.modal-overlay` + `.modal` 结构
- 通过 `classList.add/remove('active')` 控制显示
- 弹窗 `z-index` 不超过 1000
- 不使用 `alert()` / `confirm()`

### 大文件注意

- `main.html`（~10870行）是项目中最大的文件，包含 18 个 page 视图
- `data_explorer.html`（~5195行）是第二大文件，数据内嵌
- 编辑大文件时，指定具体区域或行号，避免整文件重写

### PowerShell 环境注意

- 项目运行在 Windows PowerShell 环境
- 不支持 `&&` 连接命令，需分步执行
- `git commit -m` 的消息用单引号包裹避免引号嵌套问题