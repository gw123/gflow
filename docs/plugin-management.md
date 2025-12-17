# Plugin Management Module

## Overview

The Plugin Management module provides a comprehensive interface for managing plugins in the G-Flow workflow automation platform. It allows users to create, read, update, and delete plugins through a user-friendly web interface.

## Features

- **List Plugins**: View all registered plugins with pagination support
- **Create Plugin**: Register new plugins with endpoint configuration
- **Edit Plugin**: Update existing plugin settings
- **Delete Plugin**: Remove plugins from the system
- **Health Check**: Enable/disable health checks for plugins
- **Status Management**: Enable/disable plugins as needed

## API Integration

The module integrates with the following backend API endpoints:

### Get Plugins List
```
GET /api/v1/plugins?page_num=1&page_size=10
```

Response:
```json
{
  "code": "200",
  "code_en": "SUCCESS",
  "pagination": {
    "total_count": 10,
    "has_more": true,
    "last_id": 10,
    "page_size": 10,
    "page_num": 1
  },
  "data": [
    {
      "id": 1,
      "name": "my-plugin",
      "kind": "database",
      "endpoint": "127.0.0.1:21212",
      "enabled": true,
      "health_check": true,
      "description": "My custom plugin",
      "version": "1.0.0",
      "user_id": 1
    }
  ]
}
```

### Get Plugin Details
```
GET /api/v1/plugins/{id}
```

### Create Plugin
```
POST /api/v1/plugins
Content-Type: application/json

{
  "name": "my-plugin",
  "kind": "database",
  "endpoint": "127.0.0.1:21212",
  "enabled": true,
  "health_check": true,
  "description": "My custom plugin",
  "version": "1.0.0"
}
```

### Update Plugin
```
PUT /api/v1/plugins/{id}
Content-Type: application/json

{
  "name": "my-plugin",
  "kind": "database",
  "endpoint": "127.0.0.1:21212",
  "enabled": true,
  "health_check": true,
  "description": "Updated description",
  "version": "1.0.1"
}
```

### Delete Plugin
```
DELETE /api/v1/plugins/{id}
```

## File Structure

```
src/
├── api/
│   └── client.ts                 # API client with plugin methods
├── pages/
│   ├── PluginManagementPage.tsx  # Main plugin management page
│   └── Wrappers.tsx              # Page wrapper with navigation
├── components/
│   ├── PluginTable.tsx           # Plugin list table component
│   ├── PluginForm.tsx            # Plugin form component
│   └── Pagination.tsx            # Pagination component
├── hooks/
│   └── usePlugins.ts             # Custom hook for plugin state management
└── styles/
    └── PluginManagement.css      # Styling for plugin management
```

## Components

### PluginManagementPage
Main page component that orchestrates the plugin management interface.

**Features:**
- Display plugin list with pagination
- Create new plugins
- Edit existing plugins
- Delete plugins
- Error handling and loading states

### PluginTable
Reusable table component for displaying plugins.

**Props:**
- `plugins`: Array of Plugin objects
- `loading`: Loading state
- `onEdit`: Callback for edit action
- `onDelete`: Callback for delete action

### PluginForm
Reusable form component for creating/editing plugins.

**Props:**
- `plugin`: Optional plugin object for editing
- `loading`: Loading state
- `onSubmit`: Callback for form submission
- `onCancel`: Callback for cancel action

### Pagination
Reusable pagination component.

**Props:**
- `currentPage`: Current page number
- `totalCount`: Total number of items
- `pageSize`: Items per page
- `hasMore`: Whether more pages exist
- `loading`: Loading state
- `onPageChange`: Callback for page change

## Custom Hook: usePlugins

The `usePlugins` hook provides state management for plugin operations.

```typescript
const {
  plugins,
  loading,
  error,
  pagination,
  loadPlugins,
  createPlugin,
  updatePlugin,
  deletePlugin,
  clearError
} = usePlugins();
```

**Methods:**
- `loadPlugins(pageNum, pageSize)`: Fetch plugins with pagination
- `createPlugin(data)`: Create a new plugin
- `updatePlugin(id, data)`: Update an existing plugin
- `deletePlugin(id)`: Delete a plugin
- `clearError()`: Clear error message

## Usage Example

### Basic Usage
Navigate to the home page and click on "Plugin Management" to access the plugin management interface.

### Programmatic Usage
```typescript
import { usePlugins } from '../hooks/usePlugins';

function MyComponent() {
  const { plugins, loading, createPlugin } = usePlugins();

  const handleCreate = async () => {
    try {
      await createPlugin({
        name: 'my-plugin',
        kind: 'database',
        endpoint: '127.0.0.1:21212',
        enabled: true,
        health_check: true,
        description: 'My plugin',
        version: '1.0.0'
      });
    } catch (error) {
      console.error('Failed to create plugin:', error);
    }
  };

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

## API Client Methods

The `api` client provides the following plugin-related methods:

```typescript
// Get plugins with pagination
api.getPlugins({ page_num: 1, page_size: 10 })

// Get plugin details
api.getPlugin(id)

// Create plugin
api.createPlugin(pluginData)

// Update plugin
api.updatePlugin(id, pluginData)

// Delete plugin
api.deletePlugin(id)
```

## Error Handling

The module includes comprehensive error handling:

- API errors are caught and displayed to the user
- Form validation errors are shown inline
- Network errors are handled gracefully
- Loading states prevent duplicate submissions

## Styling

The module uses CSS with support for:
- Light and dark modes
- Responsive design for mobile devices
- Hover effects and transitions
- Accessible color schemes

## Future Enhancements

- Plugin health status monitoring
- Plugin version management
- Plugin dependency tracking
- Plugin marketplace integration
- Advanced filtering and search
- Bulk operations (enable/disable multiple plugins)
- Plugin logs and diagnostics
