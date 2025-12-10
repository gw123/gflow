#!/usr/bin/env node

import fs from 'fs';
import yaml from 'js-yaml';

// 要验证的YAML文件列表
const yamlFiles = [
  'examples/tpls/http-api/gateway-trigger.yaml',
  'examples/tpls/http-api/gateway-advanced.yaml'
];

console.log('🔍 开始验证YAML文件语法...\n');

let allValid = true;

for (const file of yamlFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const data = yaml.load(content);
    console.log(`✅ ${file} - 语法正确`);
    console.log(`   └─ 工作流名称: ${data.name || '未指定'}`);
    console.log(`   └─ 节点数量: ${data.nodes ? data.nodes.length : 0}`);
    console.log(`   └─ 连接数量: ${data.connections ? Object.keys(data.connections).length : 0}`);
  } catch (error) {
    console.error(`❌ ${file} - 语法错误:`);
    console.error(`   └─ ${error.message}`);
    allValid = false;
  }
  console.log('');
}

if (allValid) {
  console.log('🎉 所有YAML文件语法验证通过！');
  process.exit(0);
} else {
  console.error('❌ 部分YAML文件存在语法错误！');
  process.exit(1);
}
