// 示例：如何使用 getNodeTemplates API

import { api } from './client';

// 获取节点模板列表
async function fetchNodeTemplates() {
  try {
    const response = await api.getNodeTemplates();
    
    console.log('API Response:', response);
    console.log('Status:', response.code, response.code_en);
    console.log('Message:', response.message);
    
    // 遍历所有分类
    Object.entries(response.data).forEach(([category, categoryData]) => {
      console.log(`\n分类: ${category}`);
      console.log(`描述: ${categoryData.description}`);
      console.log(`模板数量: ${categoryData.templates.length}`);
      
      // 遍历该分类下的所有模板
      categoryData.templates.forEach(template => {
        console.log(`  - ${template.name} (${template.type})`);
        if (template.credentialType) {
          console.log(`    凭证类型: ${template.credentialType}`);
        }
      });
    });
    
    return response;
  } catch (error) {
    console.error('获取节点模板失败:', error);
    throw error;
  }
}

// 使用示例
export { fetchNodeTemplates };
