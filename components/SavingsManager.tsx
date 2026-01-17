
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, UserProfile, InvestmentAnalysisResponse, ChatMessage } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, Coins, Calculator, Award, Loader2, Sparkles, Scale, Bot, PiggyBank, Zap, Car, Home, Plane, Smartphone, Laptop, ShoppingBag, Send, MessageCircleQuestion, DollarSign, Gem } from 'lucide-react';
import { getMarketRatesFromAI, getDetailedInvestmentAnalysis, askInvestmentMentor } from '../services/geminiService';

interface SavingsManagerProps {
  userProfile?: UserProfile;
  transactions: Transaction[];
}

const SavingsManager: React.FC<SavingsManagerProps> = ({ userProfile, transactions }) => {
  // Goals
  const [monthlySavingGoal, setMonthlySavingGoal] = useState<number>(2000);
  const [durationYears, setDurationYears] = useState<number>(1); 
  
  // Market Rates State (Gold, USD, Silver)
  const [goldPrice21, setGoldPrice21] = useState<number>(6100); 
  const [goldPrice24, setGoldPrice24] = useState<number>(7000);
  const [usdRate, setUsdRate] = useState<number>(47.24);
  const [silverPrice, setSilverPrice] = useState<number>(136);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Investment Comparator State
  const [investAmount, setInvestAmount] = useState<number>(50000);
  const [analysisResult, setAnalysisResult] = useState<InvestmentAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mentor Chat State
  const [mentorMessages, setMentorMessages] = useState<ChatMessage[]>([]);
  const [mentorInput, setMentorInput] = useState('');
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // UX: Active Tab Section
  const [activeSection, setActiveSection] = useState<'gold' | 'simulator' | 'advisor'>('gold');

  // Auto-Fetch Rates on Mount
  useEffect(() => {
    fetchMarketRates();
  }, []);

  // Scroll to bottom of chat container only
  useEffect(() => {
    if (chatContainerRef.current) {
        const { scrollHeight, clientHeight } = chatContainerRef.current;
        chatContainerRef.current.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: 'smooth'
        });
    }
  }, [mentorMessages]);

  const fetchMarketRates = async () => {
      setIsLoadingRates(true);
      
      // Safety timeout: stop loading if API takes more than 30 seconds
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 30000));

      try {
          const rates = await Promise.race([
              getMarketRatesFromAI(),
              timeoutPromise
          ]) as any;

          if (rates) {
              setGoldPrice21(rates.price21 || 6100);
              setGoldPrice24(rates.price24 || 7000);
              setUsdRate(rates.usdRate || 47.24);
              setSilverPrice(rates.silverPrice || 136);
              setLastUpdated(new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}));
          }
      } catch (e) {
          console.error("Failed to fetch market rates (or timed out)");
      } finally {
          setIsLoadingRates(false);
      }
  };

  const handleAnalyzeInvestment = async () => {
      if (investAmount <= 0) return;
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setMentorMessages([]); // Reset chat on new analysis
      try {
          const result = await getDetailedInvestmentAnalysis(investAmount);
          setAnalysisResult(result);
          // Add initial welcome message from mentor
          setMentorMessages([{
              id: 'init',
              role: 'assistant',
              content: `أنا حللتلك السوق بناءً على مبلغ ${investAmount} جنيه. بص على النتايج فوق، ولو عندك أي سؤال (مثلاً: "ليه اخترت الذهب؟" أو "عايز عائد شهري") اسألني هنا فوراً! 👇`
          }]);
      } catch (e) {
          console.error("Analysis Failed");
          alert("حدث خطأ أثناء تحليل الاستثمار. حاول مرة أخرى.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleMentorChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mentorInput.trim() || isMentorLoading) return;

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: mentorInput
      };
      setMentorMessages(prev => [...prev, userMsg]);
      setMentorInput('');
      setIsMentorLoading(true);

      try {
          const reply = await askInvestmentMentor(userMsg.content, investAmount, analysisResult);
          setMentorMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: reply
          }]);
      } catch (e) {
          setMentorMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: "معلش حصل مشكلة صغيرة، ممكن تسألني تاني؟"
          }]);
      } finally {
          setIsMentorLoading(false);
      }
  };

  // --- Message Formatter Helper ---
  const renderFormattedMessage = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    
    return lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2"></div>;

        const parseBold = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className="font-bold text-gray-900 bg-yellow-100/50 px-1 rounded">{part.slice(2, -2)}</span>;
                }
                return part;
            });
        };

        if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            const cleanLine = line.trim().replace(/^[\*\-•]\s*/, '');
            return (
                <div key={idx} className="flex gap-2 mb-1 mr-2">
                    <span className="text-blue-500 mt-1 shrink-0 text-[8px]">●</span>
                    <p className="text-gray-700 leading-relaxed text-sm">{parseBold(cleanLine)}</p>
                </div>
            );
        }

        return (
            <p key={idx} className="mb-1 leading-relaxed text-gray-700 text-sm">
                {parseBold(line)}
            </p>
        );
    });
  };

  // --- Growth Calculations (Enhanced) ---
  const growthStats = useMemo(() => {
    const annualRate = 0.22; // 22% annual return assumption
    const monthlyRate = annualRate / 12;
    const totalMonths = durationYears * 12;
    
    // Future Value of Annuity Formula
    const calculateFV = (monthly: number, months: number) => {
        let total = 0;
        for (let i = 0; i < months; i++) {
            total = (total + monthly) * (1 + monthlyRate);
        }
        return total;
    };

    const totalSavings = monthlySavingGoal * totalMonths;
    const totalInvested = calculateFV(monthlySavingGoal, totalMonths);
    
    return {
        totalSavings,
        totalInvested,
        profit: totalInvested - totalSavings,
        roiPercent: totalSavings > 0 ? ((totalInvested - totalSavings) / totalSavings) * 100 : 0
    };
  }, [monthlySavingGoal, durationYears]);

  const getPurchasingEquivalent = (amount: number) => {
      if (amount > 2000000) return { icon: <Home size={16}/>, text: "شقة سكنية" };
      if (amount > 1000000) return { icon: <Car size={16}/>, text: "سيارة جديدة" };
      if (amount > 500000) return { icon: <Car size={16}/>, text: "مقدم سيارة" };
      if (amount > 200000) return { icon: <Plane size={16}/>, text: "مقدم شقة سكنية" };
      if (amount > 100000) return { icon: <ShoppingBag size={16}/>, text: "أجهزة منزلية" };
      if (amount > 50000) return { icon: <Laptop size={16}/>, text: "لابتوب قوي او ايفون" };
      if (amount > 25000) return { icon: <Smartphone size={16}/>, text: "موبايل فلاج شيب" };
      return { icon: <ShoppingBag size={16}/>, text: "مشتريات شخصية" };
  };

  const purchasingPower = useMemo(() => getPurchasingEquivalent(growthStats.totalInvested), [growthStats.totalInvested]);

  const validOptions = useMemo(() => {
      if (!analysisResult?.options) return [];
      return analysisResult.options.filter(option => 
          option.expectedReturnPercentage > 0 || 
          option.totalValueAfterYear > investAmount ||
          option.profitAmount > 0
      );
  }, [analysisResult, investAmount]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Tab Navigation - UX Improvement */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
          <button 
             onClick={() => setActiveSection('gold')} 
             className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all min-w-[120px] ${activeSection === 'gold' ? 'bg-yellow-50 text-yellow-700 shadow-sm border border-yellow-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <Coins size={18} />
              الذهب والعملات
          </button>
          <button 
             onClick={() => setActiveSection('simulator')} 
             className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all min-w-[120px] ${activeSection === 'simulator' ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <Calculator size={18} />
              صانع الثروة
          </button>
          <button 
             onClick={() => setActiveSection('advisor')} 
             className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all min-w-[120px] ${activeSection === 'advisor' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <Bot size={18} />
              خبير الاستثمار
          </button>
      </div>

      {/* --- SECTION 1: MARKET INFO (Gold, USD, Silver) --- */}
      {activeSection === 'gold' && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
             <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-yellow-100 rounded-xl text-yellow-600 shadow-sm">
                    <Coins size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-800 text-lg">أسعار السوق (مصر)</h3>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        {isLoadingRates ? (
                            <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> جاري التحديث...</span>
                        ) : (
                            <>
                                <Sparkles size={10} className="text-blue-500" />
                                <span>بيانات لحظية</span>
                                {lastUpdated && <span className="mx-1">• {lastUpdated}</span>}
                            </>
                        )}
                    </p>
                 </div>
             </div>
             
             <button onClick={fetchMarketRates} disabled={isLoadingRates} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                <Sparkles size={18} className={isLoadingRates ? 'animate-spin' : ''} />
             </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
             {/* Gold 21 */}
             <div className="flex flex-col items-center bg-yellow-50 px-4 py-4 rounded-xl border border-yellow-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-yellow-400"></div>
                <span className="text-xs text-yellow-700 font-bold mb-2 flex items-center gap-1">
                    <Coins size={12}/> ذهب عيار 21
                </span>
                <span className="font-bold text-xl md:text-2xl text-yellow-900">
                    {(goldPrice21 || 0).toLocaleString()} <span className="text-xs font-normal opacity-70">ج.م</span>
                </span>
             </div>

             {/* Gold 24 */}
             <div className="flex flex-col items-center bg-orange-50 px-4 py-4 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-orange-400"></div>
                <span className="text-xs text-orange-700 font-bold mb-2 flex items-center gap-1">
                    <Coins size={12}/> ذهب عيار 24
                </span>
                <span className="font-bold text-xl md:text-2xl text-orange-900">
                    {(goldPrice24 || 0).toLocaleString()} <span className="text-xs font-normal opacity-70">ج.م</span>
                </span>
             </div>

             {/* USD Rate */}
             <div className="flex flex-col items-center bg-green-50 px-4 py-4 rounded-xl border border-green-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-green-400"></div>
                <span className="text-xs text-green-700 font-bold mb-2 flex items-center gap-1">
                    <DollarSign size={12}/> دولار أمريكي
                </span>
                <span className="font-bold text-xl md:text-2xl text-green-900">
                    {usdRate.toLocaleString()} <span className="text-xs font-normal opacity-70">ج.م</span>
                </span>
             </div>

             {/* Silver */}
             <div className="flex flex-col items-center bg-gray-50 px-4 py-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-gray-400"></div>
                <span className="text-xs text-gray-600 font-bold mb-2 flex items-center gap-1">
                    <Gem size={12}/> فضة (جرام)
                </span>
                <span className="font-bold text-xl md:text-2xl text-gray-800">
                    {silverPrice.toLocaleString()} <span className="text-xs font-normal opacity-70">ج.م</span>
                </span>
             </div>
          </div>

          <div className="mt-6 text-center">
             <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                * الأسعار Uptodate وقد تختلف قليلاً حسب التاجر أو البنك.
             </p>
          </div>
        </div>
      )}


      {/* --- SECTION 2: WEALTH GROWTH SIMULATOR --- */}
      {activeSection === 'simulator' && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
               <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600 shadow-sm">
                  <Calculator size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-gray-800 text-xl">ازاي ممكن نكبر فلوسنا !</h3>
                  <p className="text-sm text-gray-500">شوف الفرق لو استثمرت مدخراتك.</p>
               </div>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                 {[1, 3, 5].map(year => (
                     <button
                        key={year}
                        onClick={() => setDurationYears(year)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${durationYears === year ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                         {year} {year === 1 ? 'سنة' : 'سنوات'}
                     </button>
                 ))}
            </div>
         </div>
         
         <div className="flex flex-col items-center justify-center mb-8 bg-gray-50/50 p-6 rounded-xl border border-gray-200">
               <span className="text-sm font-bold text-gray-600 mb-1">تقدر توفر قد اي شهرياً ؟</span>
               <div className="relative flex items-center justify-center w-full max-w-sm">
                   <input 
                      type="number" 
                      value={monthlySavingGoal} 
                      onChange={(e) => setMonthlySavingGoal(Number(e.target.value))}
                      className="w-full text-center text-3xl md:text-4xl font-black text-gray-800 bg-transparent outline-none focus:text-teal-600 transition-colors py-1"
                   />
                   <span className="text-base font-bold text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-2">{CURRENCY}</span>
               </div>
               <input 
                  type="range" 
                  min="500" 
                  max="50000" 
                  step="500" 
                  value={monthlySavingGoal}
                  onChange={(e) => setMonthlySavingGoal(Number(e.target.value))}
                  className="w-full max-w-sm h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mt-4 hover:bg-gray-300 transition-colors"
               />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Scenario 1: Cash Saving */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between h-full">
               <div>
                   <div className="flex items-center gap-2 mb-2">
                       <PiggyBank size={18} className="text-gray-500"/>
                       <p className="text-sm font-bold text-gray-700">تحويش "كاش"</p>
                   </div>
                   <div className="text-center py-2">
                       <p className="text-2xl font-black text-gray-700 tracking-tight">{growthStats.totalSavings.toLocaleString()}</p>
                       <p className="text-[10px] text-gray-400 mt-1">{CURRENCY} بعد {durationYears} سنوات</p>
                   </div>
               </div>
               <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden w-full">
                    <div className="h-full bg-gray-400 w-full opacity-50"></div>
               </div>
            </div>

            {/* Scenario 2: Smart Investment */}
            <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200 relative overflow-hidden flex flex-col justify-between h-full shadow-sm">
               <div className="absolute top-0 right-0 w-full h-1 bg-teal-500"></div>
               <div>
                   <div className="flex items-center gap-2 mb-2">
                       <TrendingUp size={18} className="text-teal-700"/>
                       <p className="text-sm font-bold text-teal-800">استثمار ذكي</p>
                   </div>
                   <div className="text-center py-2">
                       <p className="text-2xl font-black text-teal-800 tracking-tight">{Math.round(growthStats.totalInvested).toLocaleString()}</p>
                       <p className="text-[10px] text-teal-600 mt-1">{CURRENCY} بعد {durationYears} سنوات</p>
                   </div>
                   
                   <div className="mt-2 flex justify-center">
                       <div className="inline-flex items-center gap-1 bg-white/60 px-2 py-1 rounded border border-teal-100 text-teal-800 text-[10px] font-bold">
                           {purchasingPower.icon}
                           <span>{purchasingPower.text}</span>
                       </div>
                   </div>
               </div>

               <div className="mt-4 h-2 bg-teal-200 rounded-full overflow-hidden w-full flex">
                    <div style={{width: `${(growthStats.totalSavings / growthStats.totalInvested) * 100}%`}} className="h-full bg-teal-400/50"></div>
                    <div className="flex-1 h-full bg-teal-500 animate-pulse"></div>
               </div>
            </div>

            {/* The Difference */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl border border-yellow-200 relative flex flex-col justify-center items-center text-center shadow-sm h-full">
               <Zap className="text-yellow-500 absolute top-2 right-2" size={16} />
               <p className="text-xs font-bold text-yellow-800 mb-2 bg-yellow-100 px-2 py-0.5 rounded-full">ربح إضافي</p>
               <p className="text-2xl font-black text-yellow-600 tracking-tight">+{Math.round(growthStats.profit).toLocaleString()}</p>
               <div className="mt-2 flex items-center gap-1">
                   <span className="text-lg font-bold text-yellow-700">
                       +{growthStats.roiPercent.toFixed(0)}%
                   </span>
                   <span className="text-[10px] text-yellow-600">زيادة</span>
               </div>
            </div>
         </div>
        </div>
      )}

      {/* --- SECTION 3: INVESTMENT ADVISOR (COMPARATOR) --- */}
      {activeSection === 'advisor' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <Scale size={20} />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800 text-lg">مقارنة فرص الاستثمار</h3>
                      <p className="text-xs text-gray-500">أدخل المبلغ (كاش) لمعرفة أفضل الخيارات.</p>
                  </div>
              </div>
          </div>

          <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                  <div className="flex-1 w-full">
                      <label className="block text-sm font-bold text-gray-700 mb-2">رأس المال ({CURRENCY})</label>
                      <input 
                          type="number" 
                          value={investAmount}
                          onChange={(e) => setInvestAmount(Number(e.target.value))}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-gray-800"
                          placeholder="مثال: 50000"
                      />
                  </div>
                  <button 
                      onClick={handleAnalyzeInvestment}
                      disabled={isAnalyzing}
                      className="w-full md:w-auto bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 min-w-[160px] text-sm shadow-md shadow-blue-200 hover:-translate-y-0.5"
                  >
                      {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="text-yellow-300 w-5 h-5" />}
                      {isAnalyzing ? 'جاري التحليل...' : 'اقترح لي الأفضل'}
                  </button>
              </div>

              {analysisResult && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Recommendation Banner - Compact */}
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                          <Award className="text-green-600 shrink-0 mt-0.5 w-6 h-6" />
                          <div>
                              <h4 className="font-bold text-green-800 text-base mb-1">توصية: {analysisResult.bestOption}</h4>
                              <p className="text-sm text-green-700 leading-relaxed">{analysisResult.aiReasoning}</p>
                          </div>
                      </div>

                      {/* Comparison Cards - Compact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {validOptions.length > 0 ? validOptions.map((option, idx) => (
                              <div key={idx} className={`rounded-xl border p-4 flex flex-col relative transition-transform hover:-translate-y-0.5 duration-300 ${option.type === 'certificate' ? 'bg-blue-50/50 border-blue-100 hover:border-blue-300' : option.type === 'gold' ? 'bg-yellow-50/50 border-yellow-100 hover:border-yellow-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                                  <div className="mb-3">
                                      <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 block px-1.5 py-0.5 rounded w-fit ${option.type === 'gold' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                                          {option.type === 'certificate' ? 'شهادة بنكية' : option.type === 'gold' ? 'ذهب' : option.type === 'bills' ? 'أذون خزانة' : 'فضة'}
                                      </span>
                                      <h4 className="font-bold text-gray-800 text-base leading-tight min-h-[2.5rem] flex items-center">{option.title}</h4>
                                  </div>

                                  <div className="mb-4 space-y-2 bg-white/60 p-3 rounded-lg">
                                      <div className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">العائد</span>
                                          <span className="font-bold text-green-600">{option.expectedReturnPercentage}%</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">الربح</span>
                                          <span className="font-bold text-gray-800">+{ (option.profitAmount || 0).toLocaleString() }</span>
                                      </div>
                                      <div className="pt-2 border-t border-black/5 flex justify-between items-center mt-1 text-sm">
                                          <span className="font-bold text-gray-700">الإجمالي</span>
                                          <span className="font-bold text-blue-700">{ (option.totalValueAfterYear || 0).toLocaleString() }</span>
                                      </div>
                                  </div>
                              </div>
                          )) : (
                              <div className="col-span-full text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                                  <p className="text-sm">عذراً، لا توجد بيانات متاحة.</p>
                              </div>
                          )}
                      </div>

                      {/* --- INVESTMENT MENTOR CHAT - Compact --- */}
                      <div className="mt-6 border-t border-gray-200 pt-6">
                          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-lg flex flex-col md:flex-row h-[450px]">
                              {/* Chat Info Side */}
                              <div className="bg-slate-800 p-4 md:w-1/3 border-b md:border-b-0 md:border-l border-slate-700 text-white">
                                  <div className="flex items-center gap-3 mb-3">
                                     <div className="bg-blue-600 p-2 rounded-lg"><Bot className="w-5 h-5 text-white" /></div>
                                     <h3 className="text-lg font-bold">مستشارك المالي</h3>
                                  </div>
                                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                                      عندك سؤال محدد؟ اسألني في أي حاجة تخص الاستثمار وهجاوبك.
                                  </p>
                                  <div className="space-y-1.5">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">مقترحات:</p>
                                      <button onClick={() => setMentorInput("إيه الفرق بين السبيكة والجنيه؟")} className="block w-full text-right text-xs bg-slate-700/50 hover:bg-slate-700 p-2 rounded transition-colors text-slate-200 truncate">
                                          • الفرق بين السبيكة والجنيه؟
                                      </button>
                                      <button onClick={() => setMentorInput("عايز عائد شهري اصرف منه")} className="block w-full text-right text-xs bg-slate-700/50 hover:bg-slate-700 p-2 rounded transition-colors text-slate-200 truncate">
                                          • عايز عائد شهري
                                      </button>
                                  </div>
                              </div>

                              {/* Chat Area */}
                              <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
                                  <div 
                                      className="flex-1 overflow-y-auto p-3 space-y-3"
                                      ref={chatContainerRef}
                                  >
                                      {mentorMessages.map((msg) => (
                                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                              <div className={`max-w-[85%] p-3 rounded-xl shadow-sm text-sm ${
                                                  msg.role === 'user' 
                                                  ? 'bg-blue-600 text-white rounded-tl-none' 
                                                  : 'bg-white text-gray-800 border border-gray-200 rounded-tr-none'
                                              }`}>
                                                  {msg.role === 'user' ? (
                                                      <p>{msg.content}</p>
                                                  ) : (
                                                      <div className="space-y-1">
                                                          {renderFormattedMessage(msg.content)}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                      {isMentorLoading && (
                                          <div className="flex justify-start">
                                              <div className="bg-white p-3 rounded-xl rounded-tr-none border border-gray-200 shadow-sm flex items-center gap-2">
                                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                  <span className="text-xs text-gray-500">جاري الكتابة...</span>
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  {/* Chat Input */}
                                  <form onSubmit={handleMentorChat} className="p-3 bg-white border-t border-gray-200">
                                      <div className="flex gap-2">
                                          <input 
                                              type="text" 
                                              value={mentorInput}
                                              onChange={(e) => setMentorInput(e.target.value)}
                                              placeholder="اكتب سؤالك..."
                                              className="flex-1 p-3 bg-gray-100 border-0 rounded-lg focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                              disabled={isMentorLoading}
                                          />
                                          <button 
                                              type="submit" 
                                              disabled={!mentorInput.trim() || isMentorLoading}
                                              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                          >
                                              {isMentorLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                                          </button>
                                      </div>
                                  </form>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SavingsManager;
