/**
 * API Routes - 路由定义
 */

import { Router } from 'express';
import { Database } from '../../db';
import { asyncHandler, createAuthMiddleware, createOptionalAuthMiddleware, requireRole, requireTenant } from '../middleware';
import { validate, schemas } from '../validators';
import {
  AuthController,
  WorkflowController,
  SecretController,
  AgentController,
  ApiController,
  StorageController,
  FormController,
  TagController
} from '../controllers';

export function createRoutes(db: Database): Router {
  const router = Router();
  
  // 中间件
  const auth = createAuthMiddleware(db);
  const optionalAuth = createOptionalAuthMiddleware(db);
  
  // 控制器实例
  const authCtrl = new AuthController(db);
  const workflowCtrl = new WorkflowController(db);
  const secretCtrl = new SecretController(db);
  const agentCtrl = new AgentController(db);
  const apiCtrl = new ApiController(db);
  const storageCtrl = new StorageController(db);
  const formCtrl = new FormController(db);
  const tagCtrl = new TagController(db);

  // ==================== Auth Routes ====================
  const authRouter = Router();
  authRouter.post('/register', validate(schemas.register), asyncHandler(authCtrl.register));
  authRouter.post('/login', validate(schemas.login), asyncHandler(authCtrl.login));
  authRouter.get('/me', auth, asyncHandler(authCtrl.me));
  authRouter.put('/me', auth, asyncHandler(authCtrl.updateProfile));
  authRouter.post('/change-password', auth, asyncHandler(authCtrl.changePassword));
  router.use('/auth', authRouter);

  // ==================== Workflow Routes ====================
  const workflowRouter = Router();
  workflowRouter.use(auth, requireTenant);
  workflowRouter.get('/', asyncHandler(workflowCtrl.list));
  workflowRouter.get('/templates', asyncHandler(workflowCtrl.getTemplates));
  workflowRouter.get('/stats', asyncHandler(workflowCtrl.getStats));
  workflowRouter.post('/', validate(schemas.createWorkflow), asyncHandler(workflowCtrl.create));
  workflowRouter.get('/:id', asyncHandler(workflowCtrl.get));
  workflowRouter.put('/:id', validate(schemas.updateWorkflow), asyncHandler(workflowCtrl.update));
  workflowRouter.delete('/:id', asyncHandler(workflowCtrl.delete));
  workflowRouter.post('/:id/execute', asyncHandler(workflowCtrl.execute));
  workflowRouter.get('/:id/executions', asyncHandler(workflowCtrl.getExecutions));
  router.use('/workflows', workflowRouter);

  // 直接执行工作流 (不需要保存)
  router.post('/execute', optionalAuth, asyncHandler(workflowCtrl.executeInline));

  // ==================== Secret Routes ====================
  const secretRouter = Router();
  secretRouter.use(auth, requireTenant);
  secretRouter.get('/', asyncHandler(secretCtrl.list));
  secretRouter.post('/', validate(schemas.createSecret), asyncHandler(secretCtrl.create));
  secretRouter.get('/:id', asyncHandler(secretCtrl.get));
  secretRouter.put('/:id', asyncHandler(secretCtrl.update));
  secretRouter.delete('/:id', asyncHandler(secretCtrl.delete));
  secretRouter.get('/:id/data', requireRole('admin'), asyncHandler(secretCtrl.getData));
  router.use('/secrets', secretRouter);

  // ==================== Agent Routes ====================
  const agentRouter = Router();
  agentRouter.use(auth, requireTenant);
  agentRouter.get('/', asyncHandler(agentCtrl.list));
  agentRouter.post('/', validate(schemas.createAgent), asyncHandler(agentCtrl.create));
  agentRouter.get('/:id', asyncHandler(agentCtrl.get));
  agentRouter.put('/:id', asyncHandler(agentCtrl.update));
  agentRouter.delete('/:id', asyncHandler(agentCtrl.delete));
  // Agent Tools
  agentRouter.get('/:id/tools', asyncHandler(agentCtrl.listTools));
  agentRouter.post('/:id/tools', asyncHandler(agentCtrl.addTool));
  agentRouter.put('/:id/tools/:toolId', asyncHandler(agentCtrl.updateTool));
  agentRouter.delete('/:id/tools/:toolId', asyncHandler(agentCtrl.deleteTool));
  // Agent MCPs
  agentRouter.get('/:id/mcps', asyncHandler(agentCtrl.listMcps));
  agentRouter.post('/:id/mcps', asyncHandler(agentCtrl.addMcp));
  agentRouter.put('/:id/mcps/:mcpId', asyncHandler(agentCtrl.updateMcp));
  agentRouter.delete('/:id/mcps/:mcpId', asyncHandler(agentCtrl.deleteMcp));
  router.use('/agents', agentRouter);

  // ==================== API Routes ====================
  const apiRouter = Router();
  apiRouter.use(auth, requireTenant);
  apiRouter.get('/', asyncHandler(apiCtrl.list));
  apiRouter.post('/', validate(schemas.createApi), asyncHandler(apiCtrl.create));
  apiRouter.get('/:id', asyncHandler(apiCtrl.get));
  apiRouter.put('/:id', asyncHandler(apiCtrl.update));
  apiRouter.delete('/:id', asyncHandler(apiCtrl.delete));
  apiRouter.post('/:id/test', asyncHandler(apiCtrl.test));
  router.use('/apis', apiRouter);

  // 代理请求 (公开)
  router.post('/proxy', asyncHandler(apiCtrl.proxy));

  // ==================== Storage Routes ====================
  const storageRouter = Router();
  storageRouter.use(auth, requireTenant);
  // Storage Engines
  storageRouter.get('/engines', asyncHandler(storageCtrl.listEngines));
  storageRouter.post('/engines', asyncHandler(storageCtrl.createEngine));
  storageRouter.get('/engines/:id', asyncHandler(storageCtrl.getEngine));
  storageRouter.put('/engines/:id', asyncHandler(storageCtrl.updateEngine));
  storageRouter.delete('/engines/:id', asyncHandler(storageCtrl.deleteEngine));
  // Files
  storageRouter.get('/files', asyncHandler(storageCtrl.listFiles));
  storageRouter.post('/files', asyncHandler(storageCtrl.createFile));
  storageRouter.get('/files/:id', asyncHandler(storageCtrl.getFile));
  storageRouter.put('/files/:id', asyncHandler(storageCtrl.updateFile));
  storageRouter.delete('/files/:id', asyncHandler(storageCtrl.deleteFile));
  // Stats
  storageRouter.get('/stats', asyncHandler(storageCtrl.getStats));
  router.use('/storage', storageRouter);

  // ==================== Form Routes ====================
  const formRouter = Router();
  formRouter.get('/', auth, requireTenant, asyncHandler(formCtrl.list));
  formRouter.post('/', auth, requireTenant, validate(schemas.createForm), asyncHandler(formCtrl.create));
  formRouter.get('/:id', auth, requireTenant, asyncHandler(formCtrl.get));
  formRouter.put('/:id', auth, requireTenant, asyncHandler(formCtrl.update));
  formRouter.delete('/:id', auth, requireTenant, asyncHandler(formCtrl.delete));
  formRouter.post('/:id/publish', auth, requireTenant, asyncHandler(formCtrl.publish));
  // Submissions
  formRouter.get('/:id/submissions', auth, requireTenant, asyncHandler(formCtrl.listSubmissions));
  formRouter.post('/:id/submit', optionalAuth, asyncHandler(formCtrl.submit)); // 公开提交
  formRouter.get('/:id/submissions/:submissionId', auth, requireTenant, asyncHandler(formCtrl.getSubmission));
  formRouter.delete('/:id/submissions/:submissionId', auth, requireTenant, asyncHandler(formCtrl.deleteSubmission));
  router.use('/forms', formRouter);

  // ==================== Tag Routes ====================
  const tagRouter = Router();
  tagRouter.use(auth, requireTenant);
  tagRouter.get('/', asyncHandler(tagCtrl.list));
  tagRouter.post('/', asyncHandler(tagCtrl.create));
  tagRouter.get('/entity', asyncHandler(tagCtrl.getEntityTags));
  tagRouter.post('/entity', asyncHandler(tagCtrl.addToEntity));
  tagRouter.delete('/entity', asyncHandler(tagCtrl.removeFromEntity));
  tagRouter.get('/:id', asyncHandler(tagCtrl.get));
  tagRouter.put('/:id', asyncHandler(tagCtrl.update));
  tagRouter.delete('/:id', asyncHandler(tagCtrl.delete));
  tagRouter.get('/:id/entities', asyncHandler(tagCtrl.getTagEntities));
  router.use('/tags', tagRouter);

  // ==================== Health Check ====================
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
