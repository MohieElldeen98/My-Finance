import React, { useState, useRef, useEffect } from 'react';
import { Transaction, ChatMessage } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { Send, Bot, User, Loader2, Calculator } from 'lucide-react';

interface FinancialAdvisorProps {
  transactions: Transaction[];
}

const FinancialAdvisor: React.FC<FinancialAdvisorProps> = ({ transactions }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'أهلاً بيك! أنا المحلل المالي التلقائي. أقدر أحسبلك مصاريفك وأديك نصائح بناءً على أرقامك المسجلة بدون أي تكلفة.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await getFinancialAdvice(transactions, userMsg.content);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'حدث خطأ في التحليل.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">المحلل المالي</h3>
          <p className="text-xs text-gray-500">تحليل تلقائي (مجاني)</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tl-none'
                  : 'bg-white text-gray-800 rounded-tr-none border border-gray-100'
              }`}
            >
              <div className="flex items-start gap-2">
                 <span className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</span>
              </div>
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tr-none border border-gray-100 shadow-sm flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
               <span className="text-xs text-gray-400">جاري الحساب...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسألني عن: ملخص، نصيحة، مصاريف الأكل..."
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default FinancialAdvisor;