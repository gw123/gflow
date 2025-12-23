import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useUserStore } from '../stores';
import SecretsManager from '../components/SecretsManager';
import { api } from '../api/client';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate('/')}
            className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700 transition-all"
        >
            <ArrowLeft size={16} />
            Back to Home
        </button>
    );
};

export const SecretsPage = () => {
  const navigate = useNavigate();
  const userStore = useUserStore();
  const ui = useUIStore();

  // Load local credentials on mount if not logged in
  useEffect(() => {
    if (!userStore.user) {
        const stored = localStorage.getItem('gflow_local_secrets');
        if (stored) {
            try {
                userStore.setCredentials(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse local secrets", e);
            }
        }
    } else {
        // Refresh from server
        userStore.fetchCredentials();
    }
  }, [userStore.user]); // Reload if auth state changes

  const handleSaveLocal = (creds: any[]) => {
      userStore.setCredentials(creds);
      if (!userStore.user) {
          localStorage.setItem('gflow_local_secrets', JSON.stringify(creds));
      }
  };

  const handleCredentialUpdate = async (item: any) => {
      // If server mode, re-fetch list
      if (userStore.user) {
          await userStore.fetchCredentials();
      } else {
          // In local mode, we need to update the list manually in SecretsManager logic
          // But SecretsManager calls onSave for local updates, so this might be redundant for local
          // However, we should ensure the item is saved if not handled by onSave
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 overflow-hidden flex flex-col">
       <BackButton />
       <div className="flex-1 mt-16 p-4 overflow-auto">
          <SecretsManager
             isOpen={true}
             onClose={() => navigate('/')}
             credentials={userStore.credentials}
             onSave={handleSaveLocal}
             onCredentialUpdate={handleCredentialUpdate}
             notify={ui.showToast}
             isServerMode={!!userStore.user}
             onServerCreate={userStore.user ? (s) => api.saveSecret(s) : undefined}
             onServerUpdate={userStore.user ? (s) => api.updateSecret(s) : undefined}
             onServerDelete={userStore.user ? (id) => api.deleteSecret(id) : undefined}
             onServerFetch={userStore.user ? (id) => api.getSecret(id) : undefined}
          />
       </div>
    </div>
  );
};

export default SecretsPage;