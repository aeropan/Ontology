/**
 * ontology_overview_data.js — 本体总览抽象数据
 *
 * 上层因果本体：3 个大节点（风力/光伏/地质）+ 12 个小节点
 * 下层要素本体：3 个大节点（风力/光伏/地质），每个大节点围绕 3~4 个小节点
 * size: 'large' | 'small'
 * cluster: 仅要素层，标识小节点归属哪个大节点
 */

window.ONTOLOGY_OVERVIEW_DATA = {
  // ============================================================
  // 因果本体层（上层 — 蓝色系）
  // ============================================================
  causalLayer: {
    name: '因果本体层',
    subtitle: '因果关系与影响机制',
    color: '#3b82f6',
    colorHex: 0x3b82f6,
    nodes: [
      { id: 'c01', label: '风力',   group: '核心', size: 'large' },
      { id: 'c02', label: '光伏',   group: '核心', size: 'large' },
      { id: 'c03', label: '地质',   group: '核心', size: 'large' },
      // 12 个小节点
      { id: 'c04', label: '成本上升',     group: '经济', size: 'small' },
      { id: 'c05', label: '技术创新',     group: '技术', size: 'small' },
      { id: 'c06', label: '需求波动',     group: '市场', size: 'small' },
      { id: 'c07', label: '资本流动',     group: '金融', size: 'small' },
      { id: 'c08', label: '政策变化',     group: '政策', size: 'small' },
      { id: 'c09', label: 'AI突破',       group: '技术', size: 'small' },
      { id: 'c10', label: '供应链中断',   group: '供应链', size: 'small' },
      { id: 'c11', label: '人口结构',     group: '社会', size: 'small' },
      { id: 'c12', label: '利率变动',     group: '金融', size: 'small' },
      { id: 'c13', label: '竞争加剧',     group: '市场', size: 'small' },
      { id: 'c14', label: '气候变化',     group: '环境', size: 'small' },
      { id: 'c15', label: '监管收紧',     group: '政策', size: 'small' },
    ],
    edges: [
      ['c01','c04'], ['c01','c05'], ['c01','c08'],
      ['c02','c05'], ['c02','c06'], ['c02','c12'],
      ['c03','c07'], ['c03','c14'], ['c03','c10'],
      ['c04','c06'], ['c05','c09'], ['c06','c13'],
      ['c07','c12'], ['c08','c15'], ['c10','c11'],
      ['c11','c06'], ['c13','c04'], ['c14','c10'],
    ],
  },

  // ============================================================
  // 要素本体层（下层 — 绿色系）
  // 每个大节点围绕 3~4 个小节点，高度错落
  // ============================================================
  elementLayer: {
    name: '要素本体层',
    subtitle: '核心要素与属性结构',
    color: '#10b981',
    colorHex: 0x10b981,
    nodes: [
      { id: 'e01', label: '风力',   group: '核心', size: 'large', cluster: null },
      { id: 'e02', label: '光伏',   group: '核心', size: 'large', cluster: null },
      { id: 'e03', label: '地质',   group: '核心', size: 'large', cluster: null },
      // 风力集群（8 个小节点，高度错落）
      { id: 'e11', label: '风场选址',   group: '风力', size: 'small', cluster: 'e01', heightOff: -0.50 },
      { id: 'e12', label: '风速预测',   group: '风力', size: 'small', cluster: 'e01', heightOff:  0.40 },
      { id: 'e13', label: '涡轮效率',   group: '风力', size: 'small', cluster: 'e01', heightOff: -0.25 },
      { id: 'e14', label: '并网调度',   group: '风力', size: 'small', cluster: 'e01', heightOff:  0.55 },
      { id: 'e15', label: '尾流效应',   group: '风力', size: 'small', cluster: 'e01', heightOff: -0.65 },
      { id: 'e16', label: '叶片设计',   group: '风力', size: 'small', cluster: 'e01', heightOff:  0.15 },
      { id: 'e17', label: '塔架高度',   group: '风力', size: 'small', cluster: 'e01', heightOff: -0.40 },
      { id: 'e18', label: '电网接入',   group: '风力', size: 'small', cluster: 'e01', heightOff:  0.30 },
      // 光伏集群（10 个小节点）
      { id: 'e21', label: '辐照资源',   group: '光伏', size: 'small', cluster: 'e02', heightOff: -0.55 },
      { id: 'e22', label: '组件效率',   group: '光伏', size: 'small', cluster: 'e02', heightOff:  0.35 },
      { id: 'e23', label: '储能配置',   group: '光伏', size: 'small', cluster: 'e02', heightOff: -0.70 },
      { id: 'e24', label: '逆变转换',   group: '光伏', size: 'small', cluster: 'e02', heightOff:  0.50 },
      { id: 'e25', label: '倾角优化',   group: '光伏', size: 'small', cluster: 'e02', heightOff: -0.20 },
      { id: 'e26', label: '阴影遮挡',   group: '光伏', size: 'small', cluster: 'e02', heightOff:  0.60 },
      { id: 'e27', label: '清洁维护',   group: '光伏', size: 'small', cluster: 'e02', heightOff: -0.45 },
      { id: 'e28', label: '温度系数',   group: '光伏', size: 'small', cluster: 'e02', heightOff:  0.10 },
      { id: 'e29', label: '并网逆变',   group: '光伏', size: 'small', cluster: 'e02', heightOff: -0.35 },
      { id: 'e30', label: '功率预测',   group: '光伏', size: 'small', cluster: 'e02', heightOff:  0.25 },
      // 地质集群（12 个小节点，更大的高度差）
      { id: 'e31', label: '地热评估',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.60 },
      { id: 'e32', label: '岩层结构',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.55 },
      { id: 'e33', label: '钻探深度',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.15 },
      { id: 'e34', label: '地震监测',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.70 },
      { id: 'e35', label: '矿物成分',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.45 },
      { id: 'e36', label: '地下水位',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.25 },
      { id: 'e37', label: '地质应力',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.35 },
      { id: 'e38', label: '板块运动',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.60 },
      { id: 'e39', label: '热导系数',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.50 },
      { id: 'e40', label: '孔隙压力',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.40 },
      { id: 'e41', label: '断层分布',   group: '地质', size: 'small', cluster: 'e03', heightOff: -0.25 },
      { id: 'e42', label: '地壳厚度',   group: '地质', size: 'small', cluster: 'e03', heightOff:  0.15 },
    ],
    // 仅同集群内连线（大节点 → 小节点）
    edges: [
      ['e01','e11'], ['e01','e12'], ['e01','e13'], ['e01','e14'], ['e01','e15'], ['e01','e16'], ['e01','e17'], ['e01','e18'],
      ['e02','e21'], ['e02','e22'], ['e02','e23'], ['e02','e24'], ['e02','e25'], ['e02','e26'], ['e02','e27'], ['e02','e28'], ['e02','e29'], ['e02','e30'],
      ['e03','e31'], ['e03','e32'], ['e03','e33'], ['e03','e34'], ['e03','e35'], ['e03','e36'],
      ['e03','e37'], ['e03','e38'], ['e03','e39'], ['e03','e40'], ['e03','e41'], ['e03','e42'],
    ],
  },

  // ============================================================
  // 层间映射（已移除，不渲染）
  // ============================================================
  crossMappings: [],

  // ============================================================
  // 统计面板数据
  // ============================================================
  stats: {
    causalNodes:  1248,
    causalEdges:  3672,
    elementNodes: 2763,
    elementEdges: 7834,
    totalNodes:   4011,
    totalEdges:   11506,
    layers:       2,
    updatedAt:    '2025-05-15',
  },
};
