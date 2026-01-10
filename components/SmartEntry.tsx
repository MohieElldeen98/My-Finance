import React, { useState, useEffect } from 'react';
import { Mic, Send, Loader2, Sparkles, Calendar, WifiOff } from 'lucide-react';
import { parseTransactionFromText } from '../services/geminiService';
import { ParsedTransaction } from '../types';

interface SmartEntryProps {
  onTransactionParsed: (data: ParsedTransaction, date: string) => void;
}

// Augment window for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const SmartEntry: React.FC<SmartEntryProps> = ({ onTransactionParsed }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitor online status for Voice feature availability
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('webkitSpeechRecognition' in window) {
      const recognitionInstance = new window.webkitSpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.lang = 'ar-EG';
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'network') {
            alert("خدمة الصوت تحتاج لاتصال بالإنترنت (مجانية عبر المتصفح).");
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVoiceClick = () => {
    if (!isOnline) {
        alert("خدمة التعرف الصوتي تتطلب اتصالاً بالإنترنت (خدمة مجانية من المتصفح).");
        return;
    }
    if (!recognition) {
      alert("التعرف الصوتي غير مدعوم في هذا المتصفح (جرب Google Chrome).");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const result = await parseTransactionFromText(input);
      if (result) {
        onTransactionParsed(result, selectedDate);
        setInput('');
        // We keep the selected date as is, in case user is entering multiple past transactions
      } else {
        alert("لم أتمكن من استخراج تفاصيل العملية. تأكد من كتابة المبلغ والنوع (مثال: صرفت 50 اكل)");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء المعالجة.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            إضافة سريعة (تحليل نصي)
        </h3>
        {!isToday && (
            <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs text-blue-600 hover:underline transition-colors"
            >
                العودة لتاريخ اليوم
            </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="مثال: صرفت ٥٠ جنيه غدا في الشغل..."
          className="w-full pl-36 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-700 placeholder-gray-400"
          disabled={isProcessing}
        />
        
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Date Picker Button */}
          <div className="relative group">
            <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="absolute inset-0 opacity-0 w-10 h-10 cursor-pointer z-10"
               title="اختر التاريخ"
            />
            <button
                type="button"
                className={`p-2 rounded-lg transition-all flex items-center justify-center ${isToday ? 'text-gray-400 hover:bg-gray-200' : 'bg-blue-100 text-blue-600'}`}
            >
                <Calendar className="w-5 h-5" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={!isOnline}
            className={`p-2 rounded-full transition-colors ${
              !isOnline 
                ? 'text-gray-300 cursor-not-allowed' 
                : isListening 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
                    : 'hover:bg-gray-200 text-gray-500'
            }`}
            title={isOnline ? "تسجيل صوتي (مجاني - عبر المتصفح)" : "لا يوجد اتصال إنترنت"}
          >
            {isOnline ? <Mic className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </button>
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-200"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
      <div className="flex justify-between items-center mt-2 px-1">
         <p className="text-xs text-gray-400">
            جرب تقول: "دفعت فاتورة النت ٣٠٠ جنيه" (يعمل 100% بدون تكلفة)
         </p>
         <p className="text-xs font-bold text-gray-500">
             {new Date(selectedDate).toLocaleDateString('ar-EG')}
         </p>
      </div>
    </div>
  );
};

export default SmartEntry;