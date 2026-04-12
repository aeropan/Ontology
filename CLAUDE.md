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
