import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Key, Database, Globe, Wrench, Plus, 
  LogOut, UserCircle, Plug, Webhook
} from 'lucide-react';
import { useUserStore, useUIStore } from '../stores';

export const HomePage = () => {
  const navigate = useNavigate();
  const userStore = useUserStore();
  const ui = useUIStore();

  const handleLogin = () => {
      ui.setModalOpen('authModalOpen', true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 font-sans text-slate-900 dark:text-slate-100">
      <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
            <LayoutDashboard size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">G-Flow</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Workflow Automation Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             {userStore.user ? (
               <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pl-4 pr-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                 <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                   {userStore.user.username}
                 </span>
                 <button 
                    onClick={userStore.logout} 
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                    title="Logout"
                 >
                    <LogOut size={18} />
                 </button>
               </div>
            ) : (
                <button 
                    onClick={handleLogin} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg shadow-blue-600/20"
                >
                    <UserCircle size={18} />
                    Login
                </button>
            )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Workflows */}
        <div 
            onClick={() => navigate('/workflows')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Workflows</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Manage, monitor and execute your automation workflows. View execution history and logs.</p>
        </div>

        {/* Create Workflow */}
        <div 
            onClick={() => navigate('/editor')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-green-500/50 dark:hover:border-green-500/50 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Plus size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Create Workflow</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Design a new automation workflow from scratch using the visual editor.</p>
        </div>

        {/* Secrets */}
        <div 
            onClick={() => navigate('/secrets')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Key size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Secrets Management</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Securely store and manage API keys, passwords, and other sensitive credentials.</p>
        </div>
        
         {/* Storage */}
        <div 
            onClick={() => navigate('/storage')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Database size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Storage Management</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Browse and manage files, databases and persistent storage for your workflows.</p>
        </div>

        {/* APIs */}
        <div 
            onClick={() => navigate('/apis')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Globe size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">API Management</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Configure external API integrations and endpoints for use in your workflows.</p>
        </div>

        {/* Tools */}
        <div 
            onClick={() => navigate('/tools')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-pink-500/50 dark:hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Wrench size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Tools Management</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Manage and configure custom tools, plugins and extensions.</p>
        </div>

        {/* Plugins */}
        <div 
            onClick={() => navigate('/plugins')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Plug size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Plugin Management</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Register, configure and manage plugins for extending workflow capabilities.</p>
        </div>

        {/* Webhook Routes */}
        <div 
            onClick={() => navigate('/webhook-routes')} 
            className="group cursor-pointer p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Webhook size={28} />
              </div>
           </div>
           <h3 className="text-xl font-bold mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Webhook Routes</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Configure webhook routes to trigger workflows from external HTTP requests.</p>
        </div>
      </div>
    </div>
  );
};
