# 本体智见平台 - 项目说明

## 项目简介
这是一个**气候/地理数据本体知识图谱平台**，用于展示和探索 ERA5 等数据源的方法分类与文献信息。

## 技术栈
- 前端：纯 HTML + CSS + JavaScript（无框架，单文件）
- 数据：JSON 文件（由 Python 脚本从 Excel 生成）
- 无构建步骤，直接用浏览器打开 HTML 文件即可运行

## 文件结构
```
index.html          # 平台首页/入口
main.html           # 主界面（本体图谱展示）
data_explorer.html  # 数据探索器页面
data/
  explorer_data.json      # 数据探索器的数据源（自动生成，不要手动编辑）
  method_config.json      # 方法配置
  method_taxonomy.json    # 方法分类体系
  *.xlsx                  # Excel 原始数据
scripts/
  sync_explorer_data.py   # 从 Excel 同步数据到 explorer_data.json
```

## 重要规则
- `data/explorer_data.json` 是由脚本自动生成的，**不要手动修改**
- 数据更新流程：修改 Excel → 运行 `python scripts/sync_explorer_data.py`
- 三个 HTML 文件的 CSS 变量（颜色、字体等）保持一致

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
**🔴 结果已完成**
```

## explorer_data.json 字段映射（Sheet1 → JSON）

数据来源：`data/data_explorer.xlsx` → Sheet `ERA5和其他数据源组合调研`（0-indexed）

| JSON 字段 | Excel 列索引 | Excel 列名 | 说明 |
|-----------|-------------|-----------|------|
| `id` | `[0]` | ID | 数据源编号 |
| `cat_label` | `[1]` | 数据类型分类 | 分类文字标签（直接取值） |
| `name` | `[2]` | 数据名称 | |
| `geo` | `[7]` | 地理覆盖范围 | |
| `res` | `[8]` | 分辨率（时/空） | |
| `fmt` | `[9]` | 数据格式 | |
| `effect` | `[10]` | 核心字段 | |
| `summary` | `[12]` | 数据摘要 | |
| `scale` | `[13]` | 数据集规模 | |
| `necessity` | `[16]` | 用途 | |
| `onto` / `cat` | `[18]` | 对应本体节点 | `onto` 直接取值；`cat` 由关键字派生（见下） |
| `avail` | `[19]` | 是否(开源/下载/有无数据) | |
| `source` | `[20]` | 下载链接 | |
| `diff` | `[22]` | 数据获取难度 | ⭐ 数量解析为整数 1~4 |
| `cost` | `[23]` | 成本/费用 | |
| `history` | `[24]` | 历史数据年限 | |
| `prio` | `[25]` | 优先级 | 🔴=red / 🟡=yellow / 🟢=green |
| `delay` | —— | （无对应列） | 固定为空字符串 |
| `usage_flag` | —— | （无对应列） | 从现有 JSON 保留，不覆盖 |
| `cat` / `cat_label` | —— | — | `cat_label` 取 `[1]`；`cat` 由 `[18]` 关键字派生 |

### cat 关键字映射规则（扫描 `[18]` 对应本体节点）

| 关键字 | cat 值 |
|--------|--------|
| 气象与环境 | `met` |
| 空间与地理地形 | `geo` |
| 风场运行与机组状态 | `farm` |
| 风速本体及时序特征 | `feat` |
| 本体外扩展 | `ext` |

一条数据可同时匹配多个关键字，`cat` 为列表（如 `["met", "geo"]`）。

### algo_tags 规范化映射（Sheet3 算法分类列 `[23]`）

| 原始标签 | 统一后标签 |
|---------|----------|
| 自回归 / 滑动平均类 | 自回归/滑动平均类 |
| 分解 - 预测混合框架 | 分解-预测混合框架 |
| 循环神经网络 | 循环神经网络及其变体 |
| 注意力与 Transformer | 注意力与Transformer架构 |
| 注意力与Transformer | 注意力与Transformer架构 |
| （传统统计与时间序列模型）其他统计模型 | 其他统计模型 |
| 集成方法基础基准与回归类 | 基础基准与回归类 |
| (概率预测与不确定性量化)其他 | （概率预测）其他 |
| 星阕大模型 | 星阙大模型 |

## methods 字段结构

`items[].methods` 是一个对象数组，每条对应 Sheet2 或 ext xlsx 的一行：

```json
{
  "label":      "输入通道",
  "detail":     "增加输入通道: 插值后作为海洋表面风输入。",
  "paper_req":  "{115} (276577条, +AIA-1056 276577条)",
  "paper_ids":  [115],
  "era5_model": "星阙大模型"
}
```

| 字段 | 说明 |
|------|------|
| `label` | 标准化标签，由 METHOD_CONFIG_RULES 或 METHOD_CONFIG_RULES_2 派生 |
| `detail` | 原始行文本（直接取值，不做处理） |
| `paper_req` | 论文与数据量需求原文 |
| `paper_ids` | 从 `paper_req` 中提取的论文 ID 列表（解析 `[n]` 和 `{n}`） |
| `era5_model` | 来源为 Sheet2 → `"星阙大模型"`；来源为 ext xlsx → `""` |

## METHOD_CONFIG_RULES（Sheet2 数据源，era5_model = "星阙大模型"）

关键字匹配（`kw in detail`），命中则返回对应标签：

| 关键字 | label 标签 |
|--------|-----------|
| 微调 | 微调 |
| 增加输入通道 | 输入通道 |
| 特征融合 | 特征融合 |
| 与主干融合 | 特征融合 |
| 设计CNN | 特征融合 |
| 后处理 | 后处理校正 |
| 图神经网络 | 图GNN |
| 条件注入 | 条件注入 |
| 随机森林回归 | 随机森林回归 |
| 梯度提升算法 | 梯度提升算法 |
| 随机森林分类器 | 随机森林分类器 |
| 多元回归方法 | 多元回归方法 |
| 作为输入变量 | 作为输入变量 |
| 静态通道直接输入 | 作为静态通道 |
| 高分辨率静态通道 | 作为高分辨率静态通道 |
| 作为边界特征输入 | 作为边界特征输入 |
| 作为动态通道 | 作为动态通道 |

无匹配时 label 直接取 detail 原文（去尾部句号）。

## METHOD_CONFIG_RULES_2（ext xlsx 数据源，era5_model = ""）

精确匹配（`dict.get(raw, raw)`），仅列出需要规范化的变体，其余原文即为标签：

| 原始值 | label 标签 |
|--------|-----------|
| 循环神经网络 | 循环神经网络及其变体 |
| 注意力与 Transformer | 注意力与Transformer架构 |
| 分解 - 预测混合框架 | 分解-预测混合框架 |
| 自回归 / 滑动平均类 | 自回归/滑动平均类 |
| 集成方法基础基准与回归类 | 基础基准与回归类 |
| （传统统计与时间序列模型）其他统计模型 | 其他统计模型 |
| (概率预测与不确定性量化)其他 | （概率预测）其他 |

## 语言
- 与用户交流时使用**中文**
- 代码注释可以用中文
