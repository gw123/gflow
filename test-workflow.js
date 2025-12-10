import fs from 'fs';
import yaml from 'js-yaml';
import axios from 'axios';

// 读取YAML文件
const yamlContent = fs.readFileSync('./examples/tpls/http-api/gateway-trigger.yaml', 'utf8');
// 转换为JSON
const workflow = yaml.load(yamlContent);

// 发送请求
axios.post('http://localhost:3001/api/execute', {
  workflow: workflow
}, {
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('✅ 工作流执行成功！');
  console.log('📋 结果:', JSON.stringify(response.data, null, 2));
}).catch(error => {
  console.error('❌ 工作流执行失败:', error.message);
  if (error.response) {
    console.error('📋 响应:', JSON.stringify(error.response.data, null, 2));
  }
});
