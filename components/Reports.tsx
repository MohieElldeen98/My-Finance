
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { CURRENCY } from '../constants';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CalendarCheck,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useCategoryInfo } from '../context/GlobalSettings';

interface ReportsProps {
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const getCategoryInfo = useCategoryInfo();
  // State for selected month/year
  const [currentDate, setCurrentDate] = useState(new Date());
  // State for selected specific day in the daily report section
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const daysScrollRef = useRef<HTMLDivElement>(null);

  // State for expanded category
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(1); // Reset to first day when changing month
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  // Main Analysis Logic
  const reportData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevDate = new Date(year, month - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIdx = prevDate.getMonth();

    // 1. Filter Transactions for Current & Previous Month
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonthIdx && d.getFullYear() === prevYear;
    });

    // 2. Calculate Totals
    const calcTotals = (txs: Transaction[]) => {
      let income = 0;
      let expense = 0;
      txs.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      });
      return { income, expense, net: income - expense };
    };

    const currentStats = calcTotals(currentMonthTx);
    const prevStats = calcTotals(prevMonthTx);

    // 3. Category Breakdown (Current Month)
    const categoryMap: Record<string, { amount: number, txs: Transaction[], key: string }> = {};
    currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { amount: 0, txs: [], key: t.category };
      }
      categoryMap[t.category].amount += t.amount;
      categoryMap[t.category].txs.push(t);
    });
    
    const topCategories = Object.entries(categoryMap)
      .map(([cat, data]) => ({ name: getCategoryInfo(cat).label, amount: data.amount, txs: data.txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), key: cat }))
      .sort((a, b) => b.amount - a.amount);

    const highestCategory = topCategories.length > 0 ? topCategories[0] : null;

    // 4. Daily Trend (Current Month)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      let dayIncome = 0;
      let dayExpense = 0;
      
      currentMonthTx.forEach(t => {
        const d = new Date(t.date);
        if (d.getDate() === day) {
          if (t.type === 'income') dayIncome += t.amount;
          else dayExpense += t.amount;
        }
      });

      return {
        day: day.toString(),
        income: dayIncome,
        expense: dayExpense,
        net: dayIncome - dayExpense
      };
    });

    // 5. Monthly Expenses Trend (Last 12 Months relative to SELECTED DATE)
    // FIX: Generate continuous months ending in selected date, preventing 2024 gaps
    const monthlyChartData = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(year, month - i, 1); // Calculate specific month
        const mKey = d.getMonth();
        const yKey = d.getFullYear();

        let income = 0;
        let expense = 0;

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === mKey && tDate.getFullYear() === yKey) {
                if (t.type === 'income') income += t.amount;
                else expense += t.amount;
            }
        });

        monthlyChartData.push({
            name: d.toLocaleDateString('ar-EG', { month: 'short' }), // e.g. "يناير"
            income,
            expense
        });
    }

    return {
      currentStats,
      prevStats,
      topCategories,
      highestCategory,
      dailyData,
      daysInMonth,
      currentMonthTx,
      monthlyChartData
    };

  }, [transactions, currentDate]);

  // Daily Report Data Logic
  const dailyDetails = useMemo(() => {
    const txs = reportData.currentMonthTx.filter(t => new Date(t.date).getDate() === selectedDay);
    
    let dailyIncome = 0;
    let dailyExpense = 0;
    txs.forEach(t => {
        if(t.type === 'income') dailyIncome += t.amount;
        else dailyExpense += t.amount;
    });

    return {
        transactions: txs,
        income: dailyIncome,
        expense: dailyExpense,
        net: dailyIncome - dailyExpense
    };
  }, [reportData.currentMonthTx, selectedDay]);


  // Helper to calculate percentage change
  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const incomeChange = getPercentageChange(reportData.currentStats.income, reportData.prevStats.income);
  const expenseChange = getPercentageChange(reportData.currentStats.expense, reportData.prevStats.expense);

  // Scroll to selected day on initial load or change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (daysScrollRef.current) {
          const container = daysScrollRef.current;
          const button = container.children[selectedDay - 1] as HTMLElement;
          if (button) {
              const scrollLeft = button.offsetLeft - (container.clientWidth / 2) + (button.clientWidth / 2);
              container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedDay, reportData.daysInMonth]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Month Navigation Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ChevronRight size={24} />
        </button>
        
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-xs text-gray-400 mt-1">تقرير الأداء المالي</p>
        </div>

        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* --- DAILY REPORTS --- */}
      <div id="daily-report-section" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
           <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
             <CalendarCheck className="w-5 h-5 text-blue-500" />
             تقرير يومي مفصل
           </h3>
           <div className="text-sm text-gray-500 font-bold">
             {selectedDay} {currentDate.toLocaleDateString('ar-EG', { month: 'long' })}
           </div>
        </div>

        {/* Day Selector (Horizontal Scroll) */}
        <div className="p-4 bg-gray-50 border-b border-gray-100">
           <div 
             ref={daysScrollRef}
             className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" 
             dir="ltr" // LTR for correct scroll direction logic with days 1..30
           >
              {Array.from({ length: reportData.daysInMonth }, (_, i) => {
                 const day = i + 1;
                 // Visual indicator if day has data
                 const hasData = reportData.dailyData[i].income > 0 || reportData.dailyData[i].expense > 0;
                 return (
                   <button
                     key={day}
                     onClick={() => setSelectedDay(day)}
                     className={`
                       flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-xl transition-all border
                       ${selectedDay === day 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                       }
                     `}
                   >
                     <span className="text-sm font-bold">{day}</span>
                     <span className="flex gap-0.5 mt-1 h-1.5">
                       {hasData && reportData.dailyData[i].income > 0 && <div className={`w-1.5 h-1.5 rounded-full ${selectedDay === day ? 'bg-green-300' : 'bg-green-500'}`}></div>}
                       {hasData && reportData.dailyData[i].expense > 0 && <div className={`w-1.5 h-1.5 rounded-full ${selectedDay === day ? 'bg-red-300' : 'bg-red-500'}`}></div>}
                     </span>
                   </button>
                 );
              })}
           </div>
        </div>

        {/* Daily Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50/50">
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                 <span className="text-xs text-gray-500 mb-1">دخل اليوم</span>
                 <span className="text-lg font-bold text-green-600">{dailyDetails.income.toLocaleString()}</span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                 <span className="text-xs text-gray-500 mb-1">مصروف اليوم</span>
                 <span className="text-lg font-bold text-red-600">{dailyDetails.expense.toLocaleString()}</span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center col-span-2 md:col-span-2">
                 <span className="text-xs text-gray-500 mb-1">صافي اليوم</span>
                 <span className={`text-lg font-bold ${dailyDetails.net >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                    {dailyDetails.net > 0 ? '+' : ''}{dailyDetails.net.toLocaleString()}
                 </span>
             </div>
        </div>

        {/* Daily Transactions List */}
        <div className="p-0">
           {dailyDetails.transactions.length > 0 ? (
               <div className="divide-y divide-gray-100">
                  {dailyDetails.transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {t.type === 'income' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                              </div>
                              <div>
                                  <p className="font-bold text-gray-700 text-sm">{getCategoryInfo(t.category).label}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span className="flex items-center gap-1">
                                          <Clock size={10} />
                                          {new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                      <span>•</span>
                                      <span>{t.note || '-'}</span>
                                  </div>
                              </div>
                          </div>
                          <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{t.amount}
                          </span>
                      </div>
                  ))}
               </div>
           ) : (
               <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                   <Filter className="w-10 h-10 mb-2 opacity-20" />
                   <p className="text-sm">لا توجد عمليات مسجلة في هذا اليوم</p>
               </div>
           )}
        </div>
      </div>

      {/* Comparison Cards (Below Daily) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-full">
              <TrendingUp size={20} />
            </div>
            {incomeChange !== 0 && (
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${incomeChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {incomeChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(incomeChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mb-1">إجمالي الدخل</p>
          <h3 className="text-2xl font-bold text-gray-800">{reportData.currentStats.income.toLocaleString()} {CURRENCY}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <TrendingDown size={20} />
            </div>
            {expenseChange !== 0 && (
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${expenseChange < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {expenseChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(expenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mb-1">إجمالي المصروفات</p>
          <h3 className="text-2xl font-bold text-gray-800">{reportData.currentStats.expense.toLocaleString()} {CURRENCY}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-full ${reportData.currentStats.net >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">صافي التوفير</p>
          <h3 className={`text-2xl font-bold ${reportData.currentStats.net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            {reportData.currentStats.net.toLocaleString()} {CURRENCY}
          </h3>
        </div>
      </div>

       {/* Monthly Expense Trend - NEW BAR CHART (Income vs Expense) */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-80">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500"/>
            الدخل مقابل المصاريف (آخر سنة)
          </h3>
          <div className="flex-1 w-full min-h-0 text-xs" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.monthlyChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                   <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}
                   />
                   <Legend />
                   <Bar dataKey="income" name="الدخل" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                   <Bar dataKey="expense" name="المصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </div>
       </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Top Expense Category */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col w-full mx-auto">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-purple-500"/>
                أين ذهبت أموالك؟
            </h3>

            {reportData.highestCategory ? (
                <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                    <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">أعلى فئة صرف</p>
                    <h4 className="text-xl font-bold text-gray-800">{reportData.highestCategory.name}</h4>
                    <p className="text-red-600 font-bold mt-1">{reportData.highestCategory.amount.toLocaleString()} {CURRENCY}</p>
                </div>
            ) : (
                 <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-sm">
                    لا توجد مصروفات
                 </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar max-h-96">
                {reportData.topCategories.map((cat, idx) => (
                    <div key={cat.key} className="flex flex-col p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                        <div 
                           className="flex items-center justify-between cursor-pointer"
                           onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {idx + 1}
                                </div>
                                <span className="text-sm font-bold text-gray-700">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800">{cat.amount.toLocaleString()}</span>
                                <div className={`transform transition-transform ${expandedCategory === cat.key ? 'rotate-180' : 'rotate-0'}`}>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {expandedCategory === cat.key && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 pl-2">
                                {cat.txs.map((t) => (
                                    <div key={t.id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-gray-50 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-[200px]">{t.note || 'بدون وصف'}</span>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <CalendarCheck size={10} />
                                                {new Date(t.date).toLocaleDateString('ar-EG')}
                                            </span>
                                        </div>
                                        <span className="text-red-500 text-xs font-bold whitespace-nowrap">{t.amount.toLocaleString()} {CURRENCY}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
