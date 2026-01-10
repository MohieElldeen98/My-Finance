import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { CATEGORY_LABELS, CURRENCY } from '../constants';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  PieChart as PieIcon, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  // State for selected month/year
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
    // Create an array of days in the month
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

    return {
      currentStats,
      prevStats,
      topCategories,
      highestCategory,
      dailyData
    };

  }, [transactions, currentDate]);

  // Helper to calculate percentage change
  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const incomeChange = getPercentageChange(reportData.currentStats.income, reportData.prevStats.income);
  const expenseChange = getPercentageChange(reportData.currentStats.expense, reportData.prevStats.expense);

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

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Income Report */}
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
          <p className="text-xs text-gray-400 mt-2">
            مقارنة بـ {reportData.prevStats.income.toLocaleString()} الشهر الماضي
          </p>
        </div>

        {/* Expense Report */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <TrendingDown size={20} />
            </div>
            {expenseChange !== 0 && (
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${expenseChange < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {/* Note: Logic inverted for expense. Less expense (negative change) is green/good */}
                {expenseChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(expenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mb-1">إجمالي المصروفات</p>
          <h3 className="text-2xl font-bold text-gray-800">{reportData.currentStats.expense.toLocaleString()} {CURRENCY}</h3>
          <p className="text-xs text-gray-400 mt-2">
            مقارنة بـ {reportData.prevStats.expense.toLocaleString()} الشهر الماضي
          </p>
        </div>

        {/* Net Savings Report */}
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
          <p className="text-xs text-gray-400 mt-2">
             {reportData.currentStats.net > 0 
                ? 'أداء مالي ممتاز هذا الشهر! 👏' 
                : 'انتبه، المصاريف أعلى من الدخل ⚠️'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Spending Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500"/>
            حركة السيولة اليومية
          </h3>
          <div className="flex-1 w-full min-h-0 text-xs" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.dailyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
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