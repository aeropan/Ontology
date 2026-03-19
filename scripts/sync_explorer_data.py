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

EXCEL_PATH = Path("/home/user/Ontology/data/【图谱组】ERA5和其他数据源组合调研3.18(新).xlsx")
JSON_PATH  = Path("/home/user/Ontology/data/explorer_data.json")

# ─────────────────────────────────────────
# METHOD CONFIG RULES（来自 data_explorer.html）
# ─────────────────────────────────────────
METHOD_CONFIG_RULES = {
    "微调":       "微调",
    "增加输入通道": "输入通道",
    "特征融合":   "特征融合",
    "与主干融合":  "特征融合",
    "设计CNN":    "特征融合",
    "后处理":     "后处理校正",
    "图神经网络":  "图GNN",
    "条件注入":   "条件注入",
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

def extract_methods(method_lines):
    """根据 METHOD_CONFIG_RULES 从方法文本行提取去重标签列表"""
    tags = set()
    for line in method_lines:
        for kw, tag in METHOD_CONFIG_RULES.items():
            if kw in line:
                tags.add(tag)
    return sorted(tags)

def split_algo_tags(val):
    """算法分类列：处理多种分隔符（，、、,）"""
    if not val:
        return []
    tags = [t.strip() for t in re.split(r'[，、,]', str(val)) if t.strip()]
    return tags


# ─────────────────────────────────────────
# 读取现有 JSON（保留 cat / cat_label 映射）
# ─────────────────────────────────────────
with open(JSON_PATH, encoding="utf-8") as f:
    existing = json.load(f)

cat_map = {item["id"]: (item["cat"], item["cat_label"]) for item in existing["items"]}

# ─────────────────────────────────────────
# 打开 Excel
# ─────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)

# ═══════════════════════════════════════════
# SHEET 1 → 每个 ID 的基础字段（首次出现优先）
# ═══════════════════════════════════════════
ws1 = wb["ERA5和其他数据源组合调研(补充算法组的数据源信息)"]
sheet1_data = {}      # id → dict of basic fields
seen_ids_s1 = set()

for row in ws1.iter_rows(min_row=2, values_only=True):
    bid = row[1]
    if not bid:
        continue
    bid = str(bid).strip()
    if bid in seen_ids_s1:
        continue          # 忽略重复行
    seen_ids_s1.add(bid)

    sheet1_data[bid] = {
        "id":         bid,
        "name":       clean(row[3]),
        "onto":       clean(row[5]),
        "res":        clean(row[6]),
        "prio":       parse_prio(row[7]),
        "fmt":        clean(row[8]),
        "avail":      clean(row[9]),
        "source":     clean(row[10]),
        "diff":       parse_diff(row[16]),
        "cost":       clean(row[18]),
        "delay":      clean(row[19]),
        "history":    clean(row[20]),
        "geo":        clean(row[21]),
        "necessity":  clean(row[22]),
        "effect":     clean(row[23]),
        "usage_flag": clean(row[2]),
    }

print(f"Sheet1 解析完成：{len(sheet1_data)} 条")

# ═══════════════════════════════════════════
# SHEET 2 → method / paper_req / paper_ids
# ═══════════════════════════════════════════
ws2 = wb["数据源对应的文献以及数据使用方法和条目需求"]
sheet2_data = defaultdict(lambda: {"method_lines": [], "paper_reqs": []})
current_id = None

for row in ws2.iter_rows(min_row=2, values_only=True):
    bid = row[1]
    if bid:
        current_id = str(bid).strip()
    if not current_id:
        continue

    e = clean(row[4])   # 数据使用
    f = clean(row[5])   # 对应论文与数据量需求

    if e:
        sheet2_data[current_id]["method_lines"].append(e)
    if f:
        sheet2_data[current_id]["paper_reqs"].append(f)

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
    # cat / cat_label 保留现有 JSON 的手工标注值
    cat, cat_label = cat_map.get(bid, ([], ""))

    # Sheet2 字段
    s2 = sheet2_data.get(bid, {"method_lines": [], "paper_reqs": []})
    method_lines  = s2["method_lines"]
    paper_reqs    = s2["paper_reqs"]
    paper_req_str = " ".join(paper_reqs)
    paper_ids     = extract_paper_ids(paper_req_str)
    methods       = extract_methods(method_lines)

    # paper_models：从 Sheet3 算法分类中提取
    paper_models = {}
    for pid in paper_ids:
        tags = paper_algo.get(str(pid), [])
        if tags:
            paper_models[str(pid)] = tags

    item = {
        "id":           s1["id"],
        "name":         s1["name"],
        "cat":          cat,
        "cat_label":    cat_label,
        "onto":         s1["onto"],
        "prio":         s1["prio"],
        "fmt":          s1["fmt"],
        "res":          s1["res"],
        "avail":        s1["avail"],
        "source":       s1["source"],
        "cost":         s1["cost"],
        "delay":        s1["delay"],
        "history":      s1["history"],
        "geo":          s1["geo"],
        "necessity":    s1["necessity"],
        "effect":       s1["effect"],
        "diff":         s1["diff"],
        "method":       methods,
        "paper_req":    paper_req_str,
        "paper_ids":    paper_ids,
        "paper_models": paper_models,
        "usage_flag":   s1["usage_flag"],
    }
    new_items.append(item)

# 保持与原 JSON 相同的排列顺序（按原有 items 顺序）
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

# 验证 paper_models / algo_tags 填充情况
filled_items   = sum(1 for item in new_items if item["paper_models"])
filled_papers  = sum(1 for p in papers_new if p["algo_tags"])
print(f"   items  paper_models 非空: {filled_items}/{len(new_items)} 条")
print(f"   papers algo_tags    非空: {filled_papers}/{len(papers_new)} 篇")

# 打印 paper_models 样例
print("\n── paper_models 样例（前3条非空）──")
count = 0
for item in new_items:
    if item["paper_models"] and count < 3:
        sample = {k: v for k, v in list(item["paper_models"].items())[:3]}
        print(f"  [{item['id']}] {item['name'][:20]}...")
        for pid, tags in sample.items():
            print(f"    paper_id={pid}: {tags}")
        count += 1

# 统计新增papers
old_pids = set(p["paper_id"] for p in existing["papers"])
new_pids = set(p["paper_id"] for p in papers_new)
added = sorted(new_pids - old_pids)
print(f"\n── 新增论文 ID ({len(added)} 篇): {added} ──")
