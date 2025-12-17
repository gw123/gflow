# Plugin Management - Quick Start Guide

## 快速开始

### 访问插件管理页面

1. 启动应用后，进入首页
2. 点击 "Plugin Management" 卡片
3. 进入插件管理界面

### 创建插件

1. 点击 "Add Plugin" 按钮
2. 填写表单字段：
   - **Plugin Name**: 插件名称（必填）
   - **Kind**: 插件类型，如 `database`, `http` 等（必填）
   - **Endpoint**: 插件端点地址，如 `127.0.0.1:21212`（必填）
   - **Version**: 版本号，如 `1.0.0`（必填）
   - **Description**: 插件描述（可选）
   - **Enabled**: 是否启用（默认启用）
   - **Health Check**: 是否启用健康检查（默认启用）
3. 点击 "Create" 按钮提交

### 编辑插件

1. 在插件列表中找到要编辑的插件
2. 点击该行的 "Edit" 按钮
3. 修改表单字段
4. 点击 "Update" 按钮保存

### 删除插件

1. 在插件列表中找到要删除的插件
2. 点击该行的 "Delete" 按钮
3. 在确认对话框中点击确认

### 分页导航

- 使用 "Previous" 和 "Next" 按钮在页面间导航
- 页面信息显示当前页码和总数

## API 端点

### 获取插件列表
```bash
curl -X GET 'http://localhost:8100/api/v1/plugins?page_num=1&page_size=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 创建插件
```bash
curl -X POST 'http://localhost:8100/api/v1/plugins' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "my-plugin",
    "kind": "database",
    "endpoint": "127.0.0.1:21212",
    "enabled": true,
    "health_check": true,
    "description": "My plugin",
    "version": "1.0.0"
  }'
```

### 更新插件
```bash
curl -X PUT 'http://localhost:8100/api/v1/plugins/1' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "my-plugin",
    "kind": "database",
    "endpoint": "127.0.0.1:21212",
    "enabled": true,
    "health_check": true,
    "description": "Updated description",
    "version": "1.0.1"
  }'
```

### 删除插件
```bash
curl -X DELETE 'http://localhost:8100/api/v1/plugins/1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## 代码集成示例

### 在组件中使用 usePlugins Hook

```typescript
import { usePlugins } from '../hooks/usePlugins';

function MyComponent() {
  const { plugins, loading, error, loadPlugins, createPlugin } = usePlugins();

  useEffect(() => {
    loadPlugins(1, 10);
  }, []);

  const handleCreate = async () => {
    try {
      await createPlugin({
        name: 'new-plugin',
        kind: 'http',
        endpoint: '127.0.0.1:8080',
        enabled: true,
        health_check: true,
        description: 'New plugin',
        version: '1.0.0'
      });
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {plugins.map(p => <div key={p.id}>{p.name}</div>)}
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}
```

### 直接使用 API Client

```typescript
import { api } from '../api/client';

// 获取插件列表
const result = await api.getPlugins({ page_num: 1, page_size: 10 });
console.log(result.data);

// 创建插件
const plugin = await api.createPlugin({
  name: 'my-plugin',
  kind: 'database',
  endpoint: '127.0.0.1:21212',
  enabled: true,
  health_check: true,
  description: 'My plugin',
  version: '1.0.0'
});

// 更新插件
const updated = await api.updatePlugin(1, {
  name: 'my-plugin',
  kind: 'database',
  endpoint: '127.0.0.1:21212',
  enabled: false,
  health_check: true,
  description: 'Updated',
  version: '1.0.1'
});

// 删除插件
await api.deletePlugin(1);
```

## 文件位置

| 文件 | 位置 |
|------|------|
| API 客户端 | `src/api/client.ts` |
| 主页面 | `src/pages/PluginManagementPage.tsx` |
| 表格组件 | `src/components/PluginTable.tsx` |
| 表单组件 | `src/components/PluginForm.tsx` |
| 分页组件 | `src/components/Pagination.tsx` |
| 自定义 Hook | `src/hooks/usePlugins.ts` |
| 样式文件 | `src/styles/PluginManagement.css` |
| 文档 | `docs/plugin-management.md` |

## 常见问题

### Q: 如何禁用插件？
A: 编辑插件，取消勾选 "Enabled" 复选框，然后点击 "Update"。

### Q: 健康检查是什么？
A: 健康检查允许系统定期验证插件的可用性。启用此选项后，系统会定期检查插件端点的健康状态。

### Q: 如何处理插件连接失败？
A: 检查端点地址是否正确，确保插件服务正在运行，并且网络连接正常。

### Q: 可以批量删除插件吗？
A: 当前版本需要逐个删除。批量操作功能可在未来版本中添加。

## 故障排除

### 插件列表为空
- 确保已创建至少一个插件
- 检查网络连接和 API 服务器状态
- 查看浏览器控制台的错误信息

### 创建/更新失败
- 检查所有必填字段是否已填写
- 验证端点地址格式是否正确
- 确保有足够的权限执行操作

### 分页不工作
- 刷新页面
- 检查浏览器控制台的错误信息
- 确保后端 API 返回正确的分页信息

## 支持

如有问题或需要帮助，请参考完整文档：`docs/plugin-management.md`
