import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useUserStore } from '../stores';
import ApiManager from '../components/ApiManager';
import { api, ApiRequest } from '../api/client';
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

export const ApiPage = () => {
  const navigate = useNavigate();
  const ui = useUIStore();
  const userStore = useUserStore();
  
  // We need to inject persistence logic into ApiManager or wrap it.
  // Since ApiManager handles loading internally via `api.getApis()`, we need to override that behavior 
  // or ensure `api.getApis` handles local storage when offline/not logged in.
  
  // However, ApiManager uses `api.getApis()` directly. 
  // To support local persistence without modifying ApiManager heavily, we can:
  // 1. Modify ApiClient to handle local storage fallback
  // 2. Or Modify ApiManager to accept external data/handlers (better for UI component)
  
  // Looking at ApiManager source, it uses `api.getApis()` and `api.saveApi()`.
  // The cleanest way without rewriting ApiManager is to make ApiClient smart about local storage.
  // BUT, the user asked to fix "similar issues", implying we should likely handle it at the Page level 
  // or Component level like SecretsPage.
  
  // SecretsPage passed `credentials` and `onSave` to SecretsManager.
  // ApiManager currently does NOT accept `apis` prop, it fetches them itself.
  
  // Let's rely on the fact that `api` client methods can be mocked or we can just let it be for now 
  // IF the ApiManager was designed to be standalone. 
  // But wait, `ApiManager.tsx` implementation shows it fetches data on mount.
  
  // To fix persistence for APIs properly, we should probably update `ApiManager` to accept props 
  // like `SecretsManager` does, OR update `api/client.ts` to support local storage.
  // Updating `api/client.ts` is more robust for the whole app.
  
  // Let's check `api/client.ts` again. It fetches from `${API_BASE}/apis`.
  // If we are offline or just want local persistence, we need a local store.
  
  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 overflow-hidden flex flex-col">
       <BackButton />
       <div className="flex-1 mt-16 p-4 overflow-auto">
          <ApiManager 
              isOpen={true} 
              onClose={() => navigate('/')} 
              notify={ui.showToast} 
          />
       </div>
    </div>
  );
};

export default ApiPage;
