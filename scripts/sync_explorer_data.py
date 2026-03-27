#!/usr/bin/env python3
"""
全量同步 explorer_data.json
数据来源：
  Sheet1 "ERA5和其他数据源组合调研(补充算法组的数据源信息)" → items 基础字段
  Sheet2 "数据源对应的文献以及数据使用方法和条目需求"       → method / paper_req / paper_ids
  Sheet3 "文献列表"                                      → papers 列表 + paper_models
"""

import json, re, openpyxl
from collections import defaultdict
from pathlib import Path

EXCEL_PATH = Path("/home/user/Ontology/data/data_explorer.xlsx")
JSON_PATH  = Path("/home/user/Ontology/data/explorer_data.json")

# ─────────────────────────────────────────
# METHOD CONFIG RULES（来自 data_explorer.html）
# ─────────────────────────────────────────
METHOD_CONFIG_RULES = {
    # 原有规则
    "微调":           "微调",
    "增加输入通道":   "输入通道",
    "特征融合":       "特征融合",
    "与主干融合":     "特征融合",
    "设计CNN":        "特征融合",
    "后处理":         "后处理校正",
    "图神经网络":     "图GNN",
    "条件注入":       "条件注入",
    # 补充未覆盖类型
    "随机森林回归":       "随机森林回归",
    "梯度提升算法":       "梯度提升算法",
    "随机森林分类器":     "随机森林分类器",
    "多元回归方法":       "多元回归方法",
    "作为输入变量":       "作为输入变量",
    "静态通道直接输入":   "作为静态通道",
    "高分辨率静态通道":   "作为高分辨率静态通道",
    "作为边界特征输入":   "作为边界特征输入",
    "作为动态通道":       "作为动态通道",
}

# ─────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────
def clean(val):
    """清理单元格文本：去首尾空白、折叠换行/多空格为单空格"""
    if val is None:
        return ""
    s = str(val).strip()
    s = re.sub(r'\n+', ' ', s)
    s = re.sub(r' {2,}', ' ', s)
    return s

def parse_prio(val):
    s = str(val) if val else ""
    if "🔴" in s: return "red"
    if "🟡" in s: return "yellow"
    if "🟢" in s: return "green"
    return ""

def parse_diff(val):
    """⭐ 的数量 → 1~4"""
    s = str(val) if val else ""
    count = s.count("⭐")
    return max(1, min(count, 4)) if count else 0

def extract_paper_ids(text):
    """从 [n] 和 {n} 中提取所有论文编号（去重排序）"""
    return sorted(set(int(m) for m in re.findall(r'[\[{](\d+)', text)))

def get_label(detail):
    """从 detail 文本匹配 METHOD_CONFIG_RULES，返回标准标签；无匹配则返回原文"""
    for kw, tag in METHOD_CONFIG_RULES.items():
        if kw in detail:
            return tag
    return detail.rstrip("。").strip()

# algo_tags 规范化映射（原始标签 → 统一标签）
ALGO_TAG_NORMALIZE = {
    "自回归 / 滑动平均类":              "自回归/滑动平均类",
    "分解 - 预测混合框架":              "分解-预测混合框架",
    "循环神经网络":                     "循环神经网络及其变体",
    "注意力与 Transformer":            "注意力与Transformer架构",
    "注意力与Transformer":             "注意力与Transformer架构",
    "（传统统计与时间序列模型）其他统计模型": "其他统计模型",
    "集成方法基础基准与回归类":          "基础基准与回归类",
    "(概率预测与不确定性量化)其他":      "（概率预测）其他",
    "星阕大模型":                       "星阙大模型",
}

def split_algo_tags(val):
    """算法分类列：处理多种分隔符（，、、,），并规范化标签名称"""
    if not val:
        return []
    tags = [t.strip() for t in re.split(r'[，、,]', str(val)) if t.strip()]
    return [ALGO_TAG_NORMALIZE.get(t, t) for t in tags]


# cat 关键字 → 分类标签
CAT_KEYWORDS = {
    "气象与环境":       "met",
    "空间与地理地形":   "geo",
    "风场运行与机组状态": "farm",
    "风速本体及时序特征": "feat",
    "本体外扩展":       "ext",
}

def derive_cat(onto_text):
    """从对应本体节点文本中匹配关键字，返回分类标签列表"""
    return [tag for kw, tag in CAT_KEYWORDS.items() if kw in onto_text]

# ─────────────────────────────────────────
# 读取现有 JSON（保留 usage_flag）
# ─────────────────────────────────────────
with open(JSON_PATH, encoding="utf-8") as f:
    existing = json.load(f)

usage_flag_map = {item["id"]: item.get("usage_flag", "") for item in existing["items"]}

# ─────────────────────────────────────────
# 打开 Excel
# ─────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)

# ═══════════════════════════════════════════
# SHEET 1 → 每个 ID 的基础字段（首次出现优先）
# 列映射（0-indexed）：
#   [0]  ID                    → id
#   [1]  数据类型分类            → cat_label
#   [2]  数据名称               → name
#   [7]  地理覆盖范围            → geo
#   [8]  分辨率（时/空）         → res
#   [9]  数据格式               → fmt
#   [10] 核心字段               → effect
#   [12] 数据摘要               → summary
#   [13] 数据集规模              → scale
#   [16] 用途                   → necessity
#   [18] 对应本体节点            → onto / cat（关键字派生）
#   [19] 是否(开源/下载/有无数据) → avail
#   [20] 下载链接               → source
#   [22] 数据获取难度            → diff
#   [23] 成本/费用              → cost
#   [24] 历史数据年限            → history
#   [25] 优先级                 → prio
# ═══════════════════════════════════════════
ws1 = wb["ERA5和其他数据源组合调研"]
sheet1_data = {}      # id → dict of basic fields
seen_ids_s1 = set()

for row in ws1.iter_rows(min_row=2, values_only=True):
    bid = row[0]
    if not bid:
        continue
    bid = str(bid).strip()
    if bid in seen_ids_s1:
        continue          # 忽略重复行
    seen_ids_s1.add(bid)

    onto = clean(row[18])
    sheet1_data[bid] = {
        "id":         bid,
        "name":       clean(row[2]),
        "cat_label":  clean(row[1]),
        "cat":        derive_cat(onto),
        "onto":       onto,
        "res":        clean(row[8]),
        "prio":       parse_prio(row[25]),
        "fmt":        clean(row[9]),
        "avail":      clean(row[19]),
        "source":     clean(row[20]),
        "diff":       parse_diff(row[22]),
        "cost":       clean(row[23]),
        "delay":      "",
        "history":    clean(row[24]),
        "geo":        clean(row[7]),
        "necessity":  clean(row[16]),
        "effect":     clean(row[10]),
        "summary":    clean(row[12]),
        "scale":      clean(row[13]),
    }

print(f"Sheet1 解析完成：{len(sheet1_data)} 条")

# ═══════════════════════════════════════════
# SHEET 2 → methods 对象数组（每行一条）
# col[1]=编号, col[4]=数据使用(detail), col[5]=对应论文与数据量需求(paper_req)
# ═══════════════════════════════════════════
ws2 = wb["使用ERA5数据源对应的文献及条目"]
sheet2_data = defaultdict(list)   # id → [{detail, paper_req}, ...]
current_id = None

for row in ws2.iter_rows(min_row=2, values_only=True):
    bid = row[1]
    if bid:
        current_id = str(bid).strip()
    if not current_id:
        continue

    detail    = clean(row[4])
    paper_req = clean(row[5])

    if detail:
        sheet2_data[current_id].append({
            "detail":    detail,
            "paper_req": paper_req,
        })

print(f"Sheet2 解析完成：{len(sheet2_data)} 个 ID")

# ═══════════════════════════════════════════
# SHEET 3 → papers 列表 + paper_algo 映射
# ═══════════════════════════════════════════
ws3 = wb["文献列表"]
papers_new = []        # 全量 papers 列表
paper_algo = {}        # paper_id(str) → [tag, ...]

PAPER_FIELDS = [
    ("doi",              1),
    ("uses_era5",        2),
    ("title",            3),
    ("year",             4),
    ("open_source",      5),
    ("spatial_res",      6),
    ("temporal_res",     7),
    ("wind_height",      8),
    ("terrain",          9),
    ("met_input",       10),
    ("sensor_input",    11),
    ("dataset_method",  12),
    ("dataset_link",    13),
    ("spatial_input",   14),
    ("local_met_input", 15),
    ("temporal_feature",16),
    ("output_form",     17),
    ("algorithm",       18),
    ("physics_fusion",  19),
    ("loss_func",       20),
    ("performance",     21),
    ("business_map",    22),
]

for row in ws3.iter_rows(min_row=2, values_only=True):
    pid = row[0]
    if pid is None:
        continue
    try:
        pid_int = int(pid)
    except (ValueError, TypeError):
        continue

    paper_obj = {"paper_id": pid_int}
    for field, idx in PAPER_FIELDS:
        paper_obj[field] = clean(row[idx])

    # 算法分类（X列，index 23）直接写入 paper 对象
    algo_tags = split_algo_tags(row[23])
    paper_obj["algo_tags"] = algo_tags
    paper_algo[str(pid_int)] = algo_tags

    papers_new.append(paper_obj)

papers_new.sort(key=lambda p: p["paper_id"])
print(f"Sheet3 解析完成：{len(papers_new)} 篇文献，"
      f"{sum(1 for v in paper_algo.values() if v)} 篇有算法分类")

# ═══════════════════════════════════════════
# 构建 items（只更新 Sheet1 中存在的条目）
# ═══════════════════════════════════════════
new_items = []

for bid, s1 in sheet1_data.items():
    # Sheet2 → methods 对象数组
    methods = []
    for row_data in sheet2_data.get(bid, []):
        detail    = row_data["detail"]
        paper_req = row_data["paper_req"]
        paper_ids = extract_paper_ids(paper_req)
        methods.append({
            "label":      get_label(detail),
            "detail":     detail,
            "paper_req":  paper_req,
            "paper_ids":  paper_ids,
            "era5_model": "星阙大模型",
        })

    item = {
        "id":         s1["id"],
        "name":       s1["name"],
        "cat":        s1["cat"],
        "cat_label":  s1["cat_label"],
        "onto":       s1["onto"],
        "prio":       s1["prio"],
        "fmt":        s1["fmt"],
        "res":        s1["res"],
        "avail":      s1["avail"],
        "source":     s1["source"],
        "cost":       s1["cost"],
        "delay":      s1["delay"],
        "history":    s1["history"],
        "geo":        s1["geo"],
        "necessity":  s1["necessity"],
        "effect":     s1["effect"],
        "summary":    s1["summary"],
        "scale":      s1["scale"],
        "diff":       s1["diff"],
        "methods":    methods,
        "usage_flag": usage_flag_map.get(bid, ""),
    }
    new_items.append(item)

# 保持与原 JSON 相同的排列顺序（新 ID 追加到末尾）
original_order = [item["id"] for item in existing["items"]]
order_map = {bid: i for i, bid in enumerate(original_order)}
new_items.sort(key=lambda x: order_map.get(x["id"], 9999))

print(f"items 构建完成：{len(new_items)} 条")

# ═══════════════════════════════════════════
# 写出新 JSON
# ═══════════════════════════════════════════
output = {
    "items":  new_items,
    "papers": papers_new,
}

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ 同步完成！")
print(f"   items  : {len(new_items)} 条")
print(f"   papers : {len(papers_new)} 篇 (原 {len(existing['papers'])} 篇)")

# 验证 methods / algo_tags 填充情况
filled_items  = sum(1 for item in new_items if item["methods"])
filled_papers = sum(1 for p in papers_new if p["algo_tags"])
print(f"   items  methods 非空: {filled_items}/{len(new_items)} 条")
print(f"   papers algo_tags 非空: {filled_papers}/{len(papers_new)} 篇")

# 打印 methods 样例（前2条非空）
print("\n── methods 样例（前2条非空）──")
count = 0
for item in new_items:
    if item["methods"] and count < 2:
        print(f"  [{item['id']}] {item['name'][:20]}...")
        for m in item["methods"][:3]:
            print(f"    label={m['label']}  paper_ids={m['paper_ids']}  era5_model={m['era5_model']}")
        count += 1

# 统计新增papers
old_pids = set(p["paper_id"] for p in existing["papers"])
new_pids = set(p["paper_id"] for p in papers_new)
added = sorted(new_pids - old_pids)
print(f"\n── 新增论文 ID ({len(added)} 篇): {added} ──")

# ═══════════════════════════════════════════
# 计算 algo_tag_stats：每个算法标签对应多少个去重 item
# 逻辑：algo_tag → paper_ids → item_ids（去重后计数）
# ═══════════════════════════════════════════

# 1. paper_id → set of item_ids（从 methods 中汇总）
paper_to_items = defaultdict(set)
for item in new_items:
    for m in item["methods"]:
        for pid in m["paper_ids"]:
            paper_to_items[pid].add(item["id"])

# 2. algo_tag → set of paper_ids
algo_to_papers = defaultdict(set)
for paper in papers_new:
    pid = paper["paper_id"]
    for tag in paper.get("algo_tags", []):
        if tag:
            algo_to_papers[tag].add(pid)

# 3. algo_tag → set of item_ids（通过 paper_id 中转）→ 去重计数
algo_tag_stats = {}
for tag, pids in algo_to_papers.items():
    item_ids = set()
    for pid in pids:
        item_ids.update(paper_to_items.get(pid, set()))
    algo_tag_stats[tag] = {
        "paper_count": len(pids),
        "item_count":  len(item_ids),
        "item_ids":    sorted(item_ids),
    }

# 写回 JSON（新增顶层字段）
output["algo_tag_stats"] = algo_tag_stats
with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n── algo_tag_stats（按 item_count 降序）──")
for tag, stat in sorted(algo_tag_stats.items(), key=lambda x: -x[1]["item_count"]):
    print(f"  {tag:<20} papers={stat['paper_count']:>3}  items={stat['item_count']:>3}")
