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

## 用户背景
- 解释代码改动时，说明"为什么"，不只是"做了什么"
- 可以使用技术语言和复杂工具，优先保证解决效率

## 工作流程（重要）
- 用户描述需求并询问"有没有问题"时，只需回答是否有疑问，**不要开始执行任何修改**
- 必须等用户明确说"开始"、"去做"、"执行"等指令后，才开始实际修改文件或代码

## 语言
- 与用户交流时使用**中文**
- 代码注释可以用中文
