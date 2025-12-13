# 工作流列表管理页面 - 技术实现方案

## 1. 需求概述

在前端添加一个完整的工作流列表管理页面，支持以下功能：
- ✅ **查询现有工作流** - 展示所有工作流列表
- ✅ **编辑工作流** - 点击编辑按钮加载并编辑工作流
- ✅ **执行工作流** - 点击执行按钮直接运行工作流
- ✅ **删除工作流** - 点击删除按钮删除工作流
- ✅ **创建工作流** - 创建新的工作流
- ✅ **搜索和过滤** - 支持按名称搜索、状态过滤、排序等
- ✅ **分页** - 处理大量工作流数据

---

## 2. 现有实现分析

### 2.1 已有组件

项目中已经存在 `WorkflowListModal.tsx`，这是一个 **模态对话框** 形式的工作流列表组件，功能包括：

**已实现的功能：**
- ✅ 获取工作流列表 (`api.getWorkflows()`)
- ✅ 选择工作流并加载到编辑器 (`handleSelect`)
- ✅ 删除工作流 (`handleDelete`)
- ✅ 创建新工作流 (`handleCreate`)

**现有局限性：**
- ❌ 以模态框形式展示，不是完整页面
- ❌ 缺少执行工作流功能
- ❌ 缺少编辑按钮（目前是点击整个卡片加载工作流）
- ❌ 无搜索和过滤功能
- ❌ 无分页支持
- ❌ 无工作流执行历史查看
- ❌ 无批量操作功能

### 2.2 后端 API

后端已经提供了完整的工作流管理 API（位于 `src/server/api/controllers/workflow.controller.ts`）：

| API 端点 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `/api/workflows` | GET | 获取工作流列表（支持分页和过滤） | ✅ 可用 |
| `/api/workflows/:id` | GET | 获取单个工作流详情 | ✅ 可用 |
| `/api/workflows` | POST | 创建新工作流 | ✅ 可用 |
| `/api/workflows/:id` | PUT | 更新工作流 | ✅ 可用 |
| `/api/workflows/:id` | DELETE | 删除工作流 | ✅ 可用 |
| `/api/workflows/:id/execute` | POST | 执行工作流 | ✅ 可用 |
| `/api/workflows/:id/executions` | GET | 获取执行历史 | ✅ 可用 |
| `/api/workflows/stats` | GET | 获取统计数据 | ✅ 可用 |
| `/api/workflows/templates` | GET | 获取模板列表 | ✅ 可用 |

### 2.3 前端 API 客户端

现有的 `src/api/client.ts` 提供了部分接口封装：

**已封装的方法：**
```typescript
✅ api.getWorkflows(): Promise<WorkflowSummary[]>
✅ api.getWorkflow(id): Promise<WorkflowRecord>
✅ api.createWorkflow(name, content): Promise<WorkflowRecord>
✅ api.updateWorkflow(id, name, content): Promise<WorkflowRecord>
✅ api.deleteWorkflow(id): Promise<void>
✅ api.executeWorkflow(workflow, workflowId?): Promise<ServerExecutionResponse>
```

**需要新增的方法：**
```typescript
❌ api.getWorkflowsPaginated(params): Promise<PaginatedWorkflows> // 分页查询
❌ api.executeWorkflowById(id, input?): Promise<ExecutionResult> // 通过 ID 执行
❌ api.getWorkflowExecutions(id, params): Promise<ExecutionHistory[]> // 获取执行历史
❌ api.getWorkflowStats(): Promise<WorkflowStats> // 获取统计数据
```

---

## 3. 技术方案设计

### 3.1 整体架构

采用 **独立页面** 方案，而非模态对话框：

```
/workflows (工作流管理页面)
  ├── WorkflowListPage.tsx       // 主页面组件
  │   ├── WorkflowToolbar.tsx    // 工具栏（搜索、过滤、新建）
  │   ├── WorkflowTable.tsx      // 工作流表格
  │   ├── WorkflowCard.tsx       // 工作流卡片（网格视图）
  │   └── WorkflowActionMenu.tsx // 操作菜单（编辑、执行、删除）
  └── ExecutionHistoryModal.tsx  // 执行历史模态框
```

### 3.2 路由设计

在 `App.tsx` 中添加路由支持：

```typescript
// 使用 React Router 或简单的状态管理
enum AppView {
  EDITOR = 'editor',
  WORKFLOW_LIST = 'workflow_list'
}

const [currentView, setCurrentView] = useState<AppView>(AppView.EDITOR);
```

或者直接扩展 `HeaderToolbar` 添加导航：

```typescript
<HeaderToolbar 
  onRunWorkflow={handleRunWorkflow}
  onNavigateToList={() => setCurrentView('workflow_list')}
/>
```

### 3.3 组件设计

#### 3.3.1 WorkflowListPage 组件

**功能职责：**
- 管理工作流列表状态（数据、加载状态、分页）
- 提供搜索、过滤、排序功能
- 协调各子组件

**状态管理：**
```typescript
interface WorkflowListState {
  workflows: WorkflowRecord[];
  loading: boolean;
  error: string | null;
  
  // 分页
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  
  // 搜索和过滤
  filters: {
    searchQuery: string;
    status?: 'draft' | 'published' | 'archived';
    sortBy: 'name' | 'updatedAt' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  };
  
  // 视图模式
  viewMode: 'table' | 'grid';
  
  // 选中项
  selectedIds: string[];
}
```

**核心方法：**
```typescript
const loadWorkflows = async (params?: QueryParams) => {
  setLoading(true);
  try {
    const result = await api.getWorkflowsPaginated({
      limit: pagination.pageSize,
      offset: pagination.page * pagination.pageSize,
      search: filters.searchQuery,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    });
    setWorkflows(result.data);
    setPagination({ ...pagination, total: result.total });
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

const handleEdit = (id: string) => {
  // 加载工作流到编辑器
  const workflow = await api.getWorkflow(id);
  onLoadWorkflow(workflow.content, id);
  setCurrentView('editor');
};

const handleExecute = async (id: string) => {
  // 执行工作流
  try {
    const result = await api.executeWorkflowById(id);
    notify('Workflow executed successfully', 'success');
    // 可选：打开执行历史模态框
  } catch (error) {
    notify('Execution failed: ' + error.message, 'error');
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure?')) return;
  await api.deleteWorkflow(id);
  loadWorkflows(); // 刷新列表
  notify('Workflow deleted', 'success');
};

const handleBatchDelete = async () => {
  if (!confirm(`Delete ${selectedIds.length} workflows?`)) return;
  await Promise.all(selectedIds.map(id => api.deleteWorkflow(id)));
  setSelectedIds([]);
  loadWorkflows();
};
```

#### 3.3.2 WorkflowToolbar 组件

**UI 布局：**
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [Status ▼] [Sort ▼] [Grid/Table] [+ New]    │
└─────────────────────────────────────────────────────────────┘
```

**功能：**
- 搜索框（实时搜索或防抖搜索）
- 状态过滤下拉框
- 排序选项
- 视图切换（表格/网格）
- 新建工作流按钮
- 批量操作（当选中多项时显示）

#### 3.3.3 WorkflowTable 组件

**表格列定义：**

| 列名 | 宽度 | 内容 | 排序 |
|-----|------|------|------|
| ☑️ 选择 | 50px | 复选框 | - |
| 📝 名称 | 25% | 工作流名称 + 描述 | ✓ |
| 📊 状态 | 10% | 状态标签 | ✓ |
| 👤 创建者 | 15% | 用户名 | ✓ |
| 📅 更新时间 | 15% | 时间戳 | ✓ |
| 🔢 版本 | 8% | 版本号 | - |
| 🎬 操作 | 27% | 编辑/执行/删除/历史 | - |

**操作按钮：**
```typescript
<div className="action-buttons">
  <button onClick={() => onEdit(workflow.id)}>
    <Edit size={16} /> 编辑
  </button>
  <button onClick={() => onExecute(workflow.id)}>
    <Play size={16} /> 执行
  </button>
  <button onClick={() => onShowHistory(workflow.id)}>
    <History size={16} /> 历史
  </button>
  <button onClick={() => onDelete(workflow.id)}>
    <Trash2 size={16} /> 删除
  </button>
</div>
```

#### 3.3.4 WorkflowCard 组件（网格视图）

**卡片布局：**
```
┌──────────────────────────┐
│ 📝 Workflow Name         │
│ ─────────────────────    │
│ Description text here... │
│                          │
│ 👤 Creator  📅 2h ago    │
│                          │
│ [Edit] [▶ Run] [Delete]  │
└──────────────────────────┘
```

### 3.4 数据流设计

```
用户交互 → WorkflowListPage → API Client → Backend API
                ↓                             ↓
         State Update  ←──────── Response ←──┘
                ↓
         子组件重新渲染
```

**状态提升：**
- 所有核心状态存储在 `WorkflowListPage`
- 子组件通过 props 接收数据和回调函数
- 使用 Zustand 或 React Context（如果需要跨组件共享）

### 3.5 样式设计

采用与现有 UI 一致的设计风格：

**颜色方案：**
```css
--primary: #3B82F6;     /* 蓝色 - 主要操作 */
--success: #10B981;     /* 绿色 - 成功状态 */
--warning: #F59E0B;     /* 橙色 - 警告 */
--danger: #EF4444;      /* 红色 - 删除操作 */
--gray-50: #F9FAFB;     /* 背景色 */
--gray-900: #111827;    /* 文字色 */
```

**响应式设计：**
- 桌面端：表格视图优先
- 平板/移动端：自动切换到卡片视图
- 使用 Tailwind CSS 的响应式断点

---

## 4. 实现步骤

### 阶段 1：扩展 API 客户端 (1-2小时)

**文件：** `src/api/client.ts`

```typescript
// 1. 添加新的类型定义
export interface PaginatedWorkflows {
  data: WorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface QueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionHistoryItem {
  id: string;
  workflow_id: string;
  status: 'success' | 'error' | 'running';
  trigger_type: string;
  created_at: string;
  finished_at?: string;
  duration_ms?: number;
  logs?: string[];
}

// 2. 添加新的 API 方法
async getWorkflowsPaginated(params: QueryParams): Promise<PaginatedWorkflows> {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v != null)
  ).toString();
  
  const res = await fetch(`${API_BASE}/workflows?${queryString}`, {
    headers: this.getHeaders()
  });
  
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

async executeWorkflowById(id: string, input?: any): Promise<ServerExecutionResponse> {
  const res = await fetch(`${API_BASE}/workflows/${id}/execute`, {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify({ input })
  });
  
  if (!res.ok) throw new Error('Execution failed');
  return res.json();
}

async getWorkflowExecutions(
  id: string, 
  params?: { limit?: number; offset?: number }
): Promise<{ data: ExecutionHistoryItem[]; total: number }> {
  const queryString = params 
    ? `?${new URLSearchParams(Object.entries(params) as any).toString()}`
    : '';
    
  const res = await fetch(`${API_BASE}/workflows/${id}/executions${queryString}`, {
    headers: this.getHeaders()
  });
  
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}
```

### 阶段 2：创建工作流列表页面组件 (3-4小时)

**文件：** `src/components/workflow-list/WorkflowListPage.tsx`

完整代码见附录 A。

**子组件：**
1. `WorkflowToolbar.tsx` - 搜索和过滤工具栏
2. `WorkflowTable.tsx` - 表格视图
3. `WorkflowCard.tsx` - 卡片组件
4. `ExecutionHistoryModal.tsx` - 执行历史模态框
5. `WorkflowActionMenu.tsx` - 操作菜单（带下拉）

### 阶段 3：集成到主应用 (1-2小时)

**文件：** `src/App.tsx`

```typescript
// 1. 添加视图状态
const [appView, setAppView] = useState<'editor' | 'workflows'>('editor');

// 2. 修改 HeaderToolbar
<HeaderToolbar 
  onRunWorkflow={handleRunWorkflow}
  currentView={appView}
  onViewChange={setAppView}
/>

// 3. 条件渲染视图
{appView === 'editor' ? (
  <div className="flex-1 relative">
    {/* 现有的编辑器界面 */}
  </div>
) : (
  <WorkflowListPage 
    onEditWorkflow={(workflow, id) => {
      wfStore.loadWorkflow(workflow);
      wfStore.setCurrentWorkflowId(id);
      setAppView('editor');
    }}
    onExecuteWorkflow={handleExecuteWorkflowById}
  />
)}
```

### 阶段 4：优化和测试 (2-3小时)

**优化项：**
1. ✅ 添加加载骨架屏
2. ✅ 实现防抖搜索
3. ✅ 添加缓存机制（避免重复请求）
4. ✅ 优化表格性能（虚拟滚动，如果数据量大）
5. ✅ 添加键盘快捷键（如 Ctrl+K 打开搜索）
6. ✅ 错误处理和重试机制

**测试用例：**
1. 分页功能测试
2. 搜索和过滤测试
3. 批量操作测试
4. 执行工作流测试
5. 删除确认测试
6. 响应式布局测试

---

## 5. UI/UX 设计细节

### 5.1 交互设计

**操作反馈：**
- 点击"执行"按钮后，显示加载指示器
- 执行完成后，显示 Toast 通知
- 删除操作需要二次确认
- 批量操作显示进度条

**状态指示：**
```typescript
// 工作流状态标签
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
};
```

**执行状态：**
```typescript
// 执行历史状态
const ExecutionStatus = ({ status }: { status: string }) => {
  const config = {
    success: { icon: CheckCircle, color: 'text-green-500' },
    error: { icon: XCircle, color: 'text-red-500' },
    running: { icon: Loader2, color: 'text-blue-500 animate-spin' }
  };
  
  const { icon: Icon, color } = config[status];
  return <Icon className={color} size={16} />;
};
```

### 5.2 空状态设计

```typescript
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
    <FileQuestion size={64} className="mb-4 opacity-50" />
    <h3 className="text-lg font-medium">No workflows found</h3>
    <p className="text-sm mt-2">Create your first workflow to get started</p>
    <button 
      onClick={() => onCreateNew()} 
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      + Create Workflow
    </button>
  </div>
);
```

### 5.3 加载状态

```typescript
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="animate-pulse">
        <div className="h-16 bg-slate-200 rounded-lg"></div>
      </div>
    ))}
  </div>
);
```

---

## 6. 性能优化

### 6.1 前端优化

**虚拟化列表（可选）：**
如果工作流数量超过 100 个，使用 `react-window` 或 `react-virtual` 实现虚拟滚动。

```typescript
import { FixedSizeList } from 'react-window';

const WorkflowVirtualList = ({ workflows }) => (
  <FixedSizeList
    height={600}
    itemCount={workflows.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <WorkflowRow workflow={workflows[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

**防抖搜索：**
```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setFilters({ ...filters, searchQuery: query });
    loadWorkflows();
  }, 500),
  [filters]
);
```

**缓存策略：**
```typescript
// 使用 SWR 或 React Query
import useSWR from 'swr';

const { data, error, mutate } = useSWR(
  ['/api/workflows', filters, pagination],
  () => api.getWorkflowsPaginated({ ...filters, ...pagination }),
  { revalidateOnFocus: false }
);
```

### 6.2 后端优化

**数据库索引：**
确保在以下字段上建立索引：
- `workflows.tenant_id`
- `workflows.name`
- `workflows.status`
- `workflows.updated_at`
- `workflows.created_at`

**查询优化：**
后端 API 已经支持分页和过滤，确保使用：
```sql
SELECT * FROM workflows 
WHERE tenant_id = ? 
  AND name LIKE ? 
  AND status = ?
ORDER BY updated_at DESC 
LIMIT ? OFFSET ?;
```

---

