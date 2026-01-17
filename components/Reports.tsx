
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { CATEGORY_LABELS, CURRENCY } from '../constants';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
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
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  // State for selected month/year
  const [currentDate, setCurrentDate] = useState(new Date());
  // State for selected specific day in the daily report section
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const daysScrollRef = useRef<HTMLDivElement>(null);

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
    const categoryMap: Record<string, number> = {};
    currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    
    const topCategories = Object.entries(categoryMap)
      .map(([cat, amount]) => ({ name: CATEGORY_LABELS[cat] || cat, amount }))
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
    if (daysScrollRef.current) {
        // Simple logic to center the selected day roughly
        const buttonWidth = 50; // approx width of day button
        const scrollPos = (selectedDay - 1) * buttonWidth - (daysScrollRef.current.clientWidth / 2) + (buttonWidth / 2);
        daysScrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedDay]);

  // Handle Chart Click
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
        setSelectedDay(parseInt(data.activeLabel));
        // Scroll to the daily section
        const element = document.getElementById('daily-report-section');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
                                  <p className="font-bold text-gray-700 text-sm">{CATEGORY_LABELS[t.category]}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Spending Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500"/>
            حركة السيولة اليومية
            <span className="text-xs font-normal text-gray-400 mr-2">(للشهر المحدد)</span>
          </h3>
          <div className="flex-1 w-full min-h-0 text-xs" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={reportData.dailyData} 
                    margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                    onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}
                    labelStyle={{color: '#64748b'}}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="دخل" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="مصروف" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
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

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar h-40 lg:h-auto">
                {reportData.topCategories.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-600">{cat.amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
