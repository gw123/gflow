
import React from 'react';
import { X, User, LogOut, Calendar, Mail, Shield } from 'lucide-react';
import { User as UserType } from '../../api/client';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onLogout: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-r from-blue-500 to-indigo-600">
            <button 
                onClick={onClose} 
                className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
            >
                <X size={16} />
            </button>
            <div className="absolute -bottom-8 left-6">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg text-slate-300">
                     <User size={32} />
                </div>
            </div>
        </div>

        {/* Body */}
        <div className="pt-10 px-6 pb-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.username}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-1">
                    <Shield size={10} /> Member
                </span>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Mail size={16} className="text-slate-400"/>
                    <span>{user.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Calendar size={16} className="text-slate-400"/>
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-mono text-xs text-slate-400 px-1 bg-slate-100 dark:bg-slate-800 rounded">ID</span>
                    <span className="font-mono text-xs">{user.id}</span>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors font-medium text-sm"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
