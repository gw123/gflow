
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Play, Loader2, Check, AlertTriangle, ArrowRight, Wand2, Bug } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import Markdown from 'markdown-to-jsx';
import { TEMPLATE_LIBRARY } from '../nodes';
import { CREDENTIAL_DEFINITIONS } from '../credential_definitions';

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  currentYaml: string;
  onApplyYaml: (yaml: string) => boolean;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isTyping?: boolean;
}

const AICopilot: React.FC<AICopilotProps> = ({ isOpen, onClose, currentYaml, onApplyYaml }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: "Hi! I'm your Workflow Copilot. I can help you:\n\n1. **Generate Workflows** from requirements.\n2. **Guide you** to fill parameters and secrets.\n3. **Audit & Test** your configuration for errors." 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Initialize Chat
  useEffect(() => {
    if (isOpen && !chatRef.current) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        You are an expert AI Workflow Architect for a low-code automation platform.
        
        YOUR GOAL:
        1. Generate valid YAML configurations based on user requests.
        2. Guide users to fix configuration errors (missing params, credentials).
        3. Explain node functionality.

        CONTEXT DATA:
        - Node Types Library: ${JSON.stringify(TEMPLATE_LIBRARY)}
        - Credential Definitions: ${JSON.stringify(CREDENTIAL_DEFINITIONS)}

        YAML SCHEMA RULES:
        - Root object: { name: string, nodes: [], connections: {} }
        - 'nodes': Array of { name, type, parameters: {}, global: {}, credentialType? }
        - 'connections': { "Source": [ [ { "node": "Target", "when": condition } ] ] }
        
        CRITICAL SYNTAX RULES:
        - **ALWAYS wrap values containing '{{' or '}}' in double quotes.** Example: \`key: "{{ $P.val }}"\`.
        - Do NOT leave bare {{ }} in YAML values.

        BEHAVIOR:
        - Output YAML in a markdown code block labeled 'yaml'.
        - If the user asks to Test/Audit, check for placeholders like "YOUR_API_KEY" or missing secret definitions.
      `;

      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4, 
        },
      });
    }
  }, [isOpen]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim() || !chatRef.current || isGenerating) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsGenerating(true);

    try {
      // Inject current context seamlessly
      const contextPrompt = `
        [User Request]: ${textToSend}
        
        [Current Editor State (YAML)]:
        ${currentYaml}
      `;

      const responseStream = await chatRef.current.sendMessageStream({ message: contextPrompt });
      
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', text: "", isTyping: true }]);

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
            fullResponse += c.text;
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { role: 'model', text: fullResponse, isTyping: true };
                return newMsgs;
            });
        }
      }

      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: 'model', text: fullResponse, isTyping: false };
        return newMsgs;
      });

    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request. Please try again." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Robust YAML extraction
  const extractYaml = (text: string): string | null => {
    // Matches code blocks with optional language tag (yaml, yml, or empty)
    // Capture group 1 is the content
    const yamlRegex = /```(?:yaml|yml)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(yamlRegex);
    
    if (match) {
        const content = match[1].trim();
        // Simple sanity check to ensure it looks like our workflow
        if (content.includes('nodes:') || content.includes('name:')) {
            return content;
        }
    }
    return null;
  };

  const handleApply = (yamlContent: string) => {
      const success = onApplyYaml(yamlContent);
      if (success) {
         setMessages(prev => [...prev, { 
             role: 'model', 
             text: "✅ **Workflow Applied!**\n\nI have updated the editor. Please:\n\n1. **Review Parameters**: Click on nodes to fill in any placeholders (like `YOUR_API_KEY`).\n2. **Setup Secrets**: If you see credential errors, use the 'Secrets' menu.\n\nWould you like me to **audit** the configuration now?" 
         }]);
      } else {
         setMessages(prev => [...prev, { 
             role: 'model', 
             text: "❌ **Failed to apply workflow.**\n\nThe generated YAML format seems invalid or incomplete. Please try asking me to regenerate it."
         }]);
      }
  };

  const handleQuickAction = (action: 'audit' | 'scrape' | 'test') => {
      let prompt = "";
      switch(action) {
          case 'audit':
              prompt = "Audit the current workflow. Check for missing required parameters, unconnected nodes, and missing secret configurations. List specific actions I need to take.";
              break;
          case 'scrape':
              prompt = "Generate a workflow that uses an HTTP node to scrape a website and then uses ChatGPT to summarize the content.";
              break;
          case 'test':
              prompt = "Simulate the execution of this workflow step-by-step. Identify any potential logical errors or missing data dependencies. Predict the output of the final node.";
              break;
      }
      handleSend(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-40 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-300" />
          <span className="font-bold tracking-wide">AI Copilot</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg, idx) => {
          const yamlContent = msg.role === 'model' ? extractYaml(msg.text) : null;
          // Remove the yaml block from display text to avoid duplication
          const displayText = yamlContent ? msg.text.replace(/```(?:yaml|yml)?\s*([\s\S]*?)\s*```/i, '') : msg.text;
          
          return (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'model' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown options={{
                            overrides: {
                                code: {
                                    component: ({ className, children }: any) => (
                                        <code className={`${className} bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-xs font-mono break-all`}>{children}</code>
                                    )
                                }
                            }
                        }}>
                            {displayText} 
                        </Markdown>
                        
                        {/* Render YAML block actions */}
                        {yamlContent && (
                            <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950">
                                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Generated Workflow</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">YAML</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto p-3">
                                    <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                        {yamlContent}
                                    </pre>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <button 
                                        onClick={() => handleApply(yamlContent)}
                                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-xs font-bold transition-colors shadow-sm"
                                    >
                                        <Play size={14} /> Apply to Editor
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </div>
          );
        })}
        {isGenerating && (
            <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 text-slate-500 text-sm shadow-sm">
                    <Loader2 size={16} className="animate-spin text-blue-600" /> Thinking...
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto scrollbar-none">
         <button 
            onClick={() => handleQuickAction('audit')}
            disabled={isGenerating}
            className="flex-shrink-0 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full border border-orange-200 dark:border-orange-800 transition-colors flex items-center gap-1.5"
         >
            <AlertTriangle size={12} /> Audit & Fix
         </button>
         <button 
            onClick={() => handleQuickAction('test')}
            disabled={isGenerating}
            className="flex-shrink-0 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full border border-purple-200 dark:border-purple-800 transition-colors flex items-center gap-1.5"
         >
            <Bug size={12} /> Test & Optimize
         </button>
         <button 
            onClick={() => handleQuickAction('scrape')}
            disabled={isGenerating}
            className="flex-shrink-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5"
         >
            <Wand2 size={12} /> Generate Scraper
         </button>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow requirement..."
            className="w-full pl-4 pr-12 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm scrollbar-none"
            rows={2}
            disabled={isGenerating}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isGenerating}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all ${
                !inputValue.trim() || isGenerating 
                ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
            AI may produce inaccurate results. Please verify the generated configuration.
        </p>
      </div>
    </div>
  );
};

export default AICopilot;
