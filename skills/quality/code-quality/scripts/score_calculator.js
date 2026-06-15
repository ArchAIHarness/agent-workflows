#!/usr/bin/env node

/**
 * 代码质量评分计算器
 * 
 * 使用方式：
 * node score_calculator.js '[{"dimension":"代码规范性","severity":"P0","count":1},{"dimension":"基础健壮性","severity":"P1","count":2}]'
 * 
 * 维度权重：
 * 代码规范性: 5
 * 基础健壮性: 10
 * 业务逻辑正确性: 20
 * 整体性能优化: 10
 * 并发与线程安全: 10
 * 资源管理合理性: 8
 * 异常处理与容错性: 10
 * 代码安全合规: 12
 * 可维护与可扩展性: 10
 * 工程化交付质量: 5
 */

const DIMENSIONS = {
  '代码规范性': 5,
  '基础健壮性': 10,
  '业务逻辑正确性': 20,
  '整体性能优化': 10,
  '并发与线程安全': 10,
  '资源管理合理性': 8,
  '异常处理与容错性': 10,
  '代码安全合规': 12,
  '可维护与可扩展性': 10,
  '工程化交付质量': 5
};

const SEVERITY_DEDUCTION = {
  'P0': 10,
  'P1': 5,
  'P2': 3,
  'P3': 1
};

const SEVERITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

function calculateScore(problems) {
  const dimensionDeductions = {};
  
  for (const [dim, weight] of Object.entries(DIMENSIONS)) {
    dimensionDeductions[dim] = 0;
  }
  
  let totalP0 = 0;
  let totalP1 = 0;
  let totalP2 = 0;
  let totalP3 = 0;
  
  const problemList = [];
  
  for (const problem of problems) {
    const { dimension, severity, count = 1 } = problem;
    
    if (!DIMENSIONS[dimension]) {
      console.warn(`警告: 未知维度 "${dimension}"，已忽略`);
      continue;
    }
    
    const deduction = (SEVERITY_DEDUCTION[severity] || 0) * count;
    const currentDeduction = dimensionDeductions[dimension];
    const maxDeduction = DIMENSIONS[dimension];
    
    dimensionDeductions[dimension] = Math.min(currentDeduction + deduction, maxDeduction);
    
    if (severity === 'P0') totalP0 += count;
    if (severity === 'P1') totalP1 += count;
    if (severity === 'P2') totalP2 += count;
    if (severity === 'P3') totalP3 += count;
    
    problemList.push({
      dimension,
      severity,
      count,
      deduction: Math.min(deduction, maxDeduction)
    });
  }
  
  let totalScore = 100;
  const dimensionScores = {};
  
  for (const [dim, deduction] of Object.entries(dimensionDeductions)) {
    const score = Math.max(0, DIMENSIONS[dim] - deduction);
    dimensionScores[dim] = score;
    totalScore -= deduction;
  }
  
  totalScore = Math.max(0, totalScore);
  
  let rating = '不合格';
  let ratingColor = '🔴';
  
  if (totalP0 > 0) {
    rating = '不合格';
    ratingColor = '🔴';
  } else if (totalScore >= 90) {
    rating = '优秀';
    ratingColor = '🟢';
  } else if (totalScore >= 80) {
    rating = '合格';
    ratingColor = '🟡';
  } else if (totalScore >= 70) {
    rating = '待整改';
    ratingColor = '🟠';
  } else {
    rating = '不合格';
    ratingColor = '🔴';
  }
  
  const result = {
    summary: {
      totalScore,
      rating,
      ratingColor,
      totalP0,
      totalP1,
      totalP2,
      totalP3
    },
    dimensions: {},
    totalDeduction: 100 - totalScore,
    canMerge: totalP0 === 0 && totalScore >= 70
  };
  
  for (const [dim, weight] of Object.entries(DIMENSIONS)) {
    const deduction = dimensionDeductions[dim];
    const score = dimensionScores[dim];
    
    result.dimensions[dim] = {
      weight,
      deduction,
      score
    };
  }
  
  return result;
}

function printResult(result) {
  console.log('\n========== 评分结果 ==========\n');
  
  console.log(`综合评分: ${result.summary.totalScore}/100 ${result.summary.ratingColor} ${result.rating}`);
  console.log(`是否允许合入: ${result.canMerge ? '✅ 允许' : '❌ 不允许'}`);
  console.log('\n问题统计:');
  console.log(`  P0 致命: ${result.summary.totalP0} 个`);
  console.log(`  P1 严重: ${result.summary.totalP1} 个`);
  console.log(`  P2 一般: ${result.summary.totalP2} 个`);
  console.log(`  P3 优化: ${result.summary.totalP3} 个`);
  
  console.log('\n各维度得分:');
  for (const [dim, data] of Object.entries(result.dimensions)) {
    const percentage = Math.round((data.score / data.weight) * 100);
    console.log(`  ${dim}: ${data.score}/${data.weight} (${percentage}%)`);
  }
  
  console.log('\n总扣分:', result.totalDeduction);
  console.log('\n==============================\n');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
代码质量评分计算器

使用方法:
  node score_calculator.js '<问题JSON>'
  node score_calculator.js --interactive

参数格式:
  [{"dimension":"维度名","severity":"P0/P1/P2/P3","count":数量}]

示例:
  node score_calculator.js '[{"dimension":"代码安全合规","severity":"P0","count":1}]'
  node score_calculator.js '[{"dimension":"基础健壮性","severity":"P1","count":2},{"dimension":"代码规范性","severity":"P2","count":3}]'

维度列表:
${Object.keys(DIMENSIONS).map(d => `  - ${d}: ${DIMENSIONS[d]}分`).join('\n')}

定级扣分:
  P0: -10分
  P1: -5分
  P2: -3分
  P3: -1分

评级标准:
  ≥90分: 优秀
  80-89分: 合格
  70-79分: 待整改
  <70分: 不合格
  
  存在P0问题: 直接不合格
`);
    process.exit(0);
  }
  
  if (args[0] === '--interactive' || args[0] === '-i') {
    console.log('交互模式暂未实现，请使用JSON参数');
    process.exit(1);
  }
  
  try {
    const problems = JSON.parse(args[0]);
    const result = calculateScore(problems);
    printResult(result);
    
    console.log('\nJSON输出:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('解析JSON失败:', error.message);
    console.log('\n使用 --help 查看帮助');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateScore, DIMENSIONS, SEVERITY_DEDUCTION };