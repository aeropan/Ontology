# algo_tag 统计规范

## 一、数据来源

`explorer_data.json` 顶层结构：
```
{
  "items":  [...],   // 数据源条目，每条含 paper_ids (int[]) 和 id (str)
  "papers": [...],   // 论文条目，每条含 paper_id (int) 和 algo_tags (str[])
  "algo_tag_stats": {...}  // 由 sync_explorer_data.py 自动生成
}
```

---

## 二、核心计算逻辑

### 步骤 1：paper_id → item_ids 反查表
遍历所有 `items`，对每条 item 的 `paper_ids` 列表中的每个 `paper_id`，
记录该 paper_id 被哪些 item.id 引用：

```python
paper_to_items = defaultdict(set)
for item in items:
    for pid in item["paper_ids"]:
        paper_to_items[pid].add(item["id"])
```

### 步骤 2：algo_tag → paper_ids 映射表
遍历所有 `papers`，对每篇论文的 `algo_tags` 列表中每个标签，
收集使用该标签的所有 paper_id：

```python
algo_to_papers = defaultdict(set)
for paper in papers:
    for tag in paper["algo_tags"]:
        algo_to_papers[tag].add(paper["paper_id"])
```

### 步骤 3：生成 algo_tag_stats
对每个 algo_tag，通过步骤1的反查表得到间接关联的 item_ids（去重）：

```python
algo_tag_stats[tag] = {
    "paper_count": len(algo_to_papers[tag]),         # 使用该标签的论文数（去重）
    "item_count":  len(union of item_ids),            # 涉及的数据源数（去重）
    "item_ids":    sorted(union of item_ids),         # 具体数据源 ID 列表
}
```

**关键**：item_count 是 item_ids 的**并集**大小，不是简单加总。

---

## 三、标签合并规则

原始数据中存在因空格/格式差异产生的同义重复键，统计时需合并：

| 合并后标签 | 原始键 |
|-----------|--------|
| 自回归/滑动平均类 | `自回归 / 滑动平均类`、`自回归/滑动平均类` |
| 分解-预测混合框架 | `分解 - 预测混合框架`、`分解-预测混合框架` |
| 循环神经网络及其变体 | `循环神经网络`、`循环神经网络及其变体` |
| 注意力与Transformer架构 | `注意力与 Transformer`、`注意力与Transformer` |
| 其他统计模型 | `其他统计模型`、`（传统统计与时间序列模型）其他统计模型` |
| 基础基准与回归类 | `基础基准与回归类`、`集成方法基础基准与回归类` |
| （概率预测）其他 | `(概率预测与不确定性量化)其他` |

合并方法：paper_ids 取**并集**，item_ids 取**并集**，再计数。

---

## 四、分组顺序与组内小计

按以下固定顺序展示，每组末尾附小计行（组内所有标签的 paper_ids/item_ids 并集）：

```
星阕大模型 ⭐
  └─ 星阕大模型

1. 传统统计与时间序列模型
  ├─ 自回归/滑动平均类
  ├─ 条件异方差类
  ├─ 指数平滑类
  ├─ 基础基准与回归类
  └─ 其他统计模型

2. 经典机器学习模型
  ├─ 支持向量机类
  ├─ 树模型与集成学习
  ├─ 最近邻算法
  ├─ 模糊系统与神经模糊
  └─ 其他

3. 神经网络与深度学习模型（核心架构）
  ├─ 前馈神经网络
  ├─ 循环神经网络及其变体
  ├─ 卷积神经网络
  ├─ 注意力与Transformer架构
  ├─ 自编码器与生成模型
  └─ 其他专门网络

4. 时空预测与图神经网络模型
  ├─ 时空模型
  └─ 图神经网络

5. 集成、组合与优化模型
  ├─ 集成方法
  ├─ 分解-预测混合框架
  └─ 优化算法增强模型

6. 概率预测与不确定性量化方法
  ├─ 分位数回归
  ├─ 贝叶斯方法
  ├─ 生成与扩散模型
  └─ 其他

7. 气象与物理类专业模型/方法
  ├─ 数值天气预报模型
  ├─ 物理降尺度与后处理
  └─ 计算流体动力学

8. 其他与特定范式模型
  ├─ 规则系统与灰色理论
  ├─ 强化学习组件
  ├─ 残差网络基础
  ├─ 符号回归
  └─ 特定损失函数训练
```

---

## 五、输出格式

Markdown 表格，列为：`分类 | 标签 | 论文数 | 涉及数据源数`

- 每组末尾加 **小计** 行（并集去重，非加总）
- 数据中无记录的标签显示 `—`
- 附注说明小计为并集计算

---

## 六、快速复现脚本

当收到新的 `explorer_data.json` 时，运行以下脚本即可：

```python
import json
from collections import defaultdict

with open("explorer_data.json", encoding="utf-8") as f:
    data = json.load(f)

items   = data["items"]
papers  = data["papers"]

# 反查表
paper_to_items = defaultdict(set)
for item in items:
    for pid in item["paper_ids"]:
        paper_to_items[pid].add(item["id"])

# 精确 paper_count（从 papers 源数据计算）
tag_papers = defaultdict(set)
for paper in papers:
    for tag in paper.get("algo_tags", []):
        if tag:
            tag_papers[tag].add(paper["paper_id"])

# algo_tag_stats（原始键，未合并）
raw = {}
for tag, pids in tag_papers.items():
    item_ids = set()
    for pid in pids:
        item_ids.update(paper_to_items.get(pid, set()))
    raw[tag] = {"paper_count": len(pids), "item_count": len(item_ids), "item_ids": sorted(item_ids)}

def get_stats(keys):
    """合并多个原始键，返回 (paper_count, item_count)"""
    item_ids  = set()
    paper_ids = set()
    for k in keys:
        if k in raw:
            item_ids.update(raw[k]["item_ids"])
        if k in tag_papers:
            paper_ids.update(tag_papers[k])
    return len(paper_ids), len(item_ids)

# 按分组输出（参考 algo_tag_stats_spec.md 中的 GROUPS 定义）
```
