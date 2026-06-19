
import React, { useMemo, useState } from 'react';
import { Transaction, RecurringTransaction, FinancialGoal } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, CalendarClock, AlertCircle, Calculator, Target, BarChart3, TrendingDown, Minus, Plus, MessageSquareText, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { CURRENCY, TYPE_LABELS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useCategoryInfo } from '../context/GlobalSettings';

interface DashboardProps {
  transactions: Transaction[];
  recurringItems?: RecurringTransaction[];
  goals?: FinancialGoal[];
  setActiveTab?: (tab: string) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, recurringItems = [], goals = [], setActiveTab }) => {
  const getCategoryInfo = useCategoryInfo();
  
  // State for Modal
  const [activeModal, setActiveModal] = useState<'balance' | 'income' | 'expense' | 'commitments' | null>(null);

  // 1. Calculate Monthly Status & Collect Detail Lists
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevDate = new Date(now);
    prevDate.setMonth(now.getMonth() - 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    let globalBalance = 0;
    let currentStats = { income: 0, expense: 0 };
    let prevStats = { income: 0, expense: 0 };

    // Lists for Modals
    const currentMonthTransactions: Transaction[] = [];

    transactions.forEach(t => {
      if (t.type === 'income') globalBalance += t.amount;
      else globalBalance -= t.amount;

      const tDate = new Date(t.date);
      
      // Current Month Logic
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        if (t.type === 'income') currentStats.income += t.amount;
        else currentStats.expense += t.amount;
        currentMonthTransactions.push(t);
      }

      // Previous Month Logic
      if (tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear) {
         if (t.type === 'income') prevStats.income += t.amount;
         else prevStats.expense += t.amount;
      }
    });

    let pendingMonthIncome = 0;
    let pendingMonthExpense = 0;
    const pendingItemsList: RecurringTransaction[] = [];

    recurringItems.forEach(r => {
      if (!r.active) return;
      const rDate = new Date(r.nextDueDate);
      const isDueThisMonth = (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear);
      const isOverdue = rDate < now && !isDueThisMonth; // Consider overdue as pending for this context

      if (isDueThisMonth || (isOverdue && rDate < new Date())) { 
        if (r.type === 'income') pendingMonthIncome += r.amount;
        else {
            pendingMonthExpense += r.amount;
            pendingItemsList.push(r);
        }
      }
    });

    return {
      balance: globalBalance,
      currentMonthNet: currentStats.income - currentStats.expense,
      currentStats,
      prevStats,
      totalProjectedIncome: currentStats.income + pendingMonthIncome,
      totalProjectedExpense: currentStats.expense + pendingMonthExpense,
      pendingMonthIncome,
      pendingMonthExpense,
      // For Modals
      currentMonthTransactions: currentMonthTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      pendingItemsList: pendingItemsList.sort((a,b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    };
  }, [transactions, recurringItems]);

  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const incomeChange = getPercentageChange(dashboardStats.currentStats.income, dashboardStats.prevStats.income);
  const expenseChange = getPercentageChange(dashboardStats.currentStats.expense, dashboardStats.prevStats.expense);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped: Record<string, number> = {};
    expenses.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });
    return Object.entries(grouped).map(([key, value]) => ({
      name: getCategoryInfo(key).label,
      value
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Monthly History Data (Last 6 Months)
  const monthlyHistoryData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = d.getMonth();
        const yearKey = d.getFullYear();
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey) {
                if (t.type === 'income') income += t.amount;
                else expense += t.amount;
            }
        });
        data.push({
            name: d.toLocaleDateString('ar-EG', { month: 'short' }),
            income,
            expense
        });
    }
    return data;
  }, [transactions]);

  // --- WELCOME STATE (If no data) ---
  if (transactions.length === 0 && recurringItems.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in p-6">
              <div className="bg-green-100 p-6 rounded-full shadow-lg mb-4 animate-bounce-slow">
                  <Sparkles size={64} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">أهلاً بك في مساعدك المالي! 👋</h2>
              <p className="text-gray-500 max-w-md text-lg leading-relaxed">
                  عشان تبدأ بداية صح، التطبيق محتاج يعرف أول معلومة.
                  <br />
                  سجل أول عملية ليك (مصروف أو دخل) دلوقتي.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md mt-4">
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-blue-300 transition-colors cursor-default">
                     <div className="bg-blue-50 p-3 rounded-xl"><Plus className="text-blue-600 w-6 h-6"/></div>
                     <div className="text-right">
                         <h3 className="font-bold text-gray-800 text-lg">سجل مصروف</h3>
                         <p className="text-sm text-gray-400">من قائمة "سجل المعاملات"</p>
                     </div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-purple-300 transition-colors cursor-default">
                     <div className="bg-purple-50 p-3 rounded-xl"><CalendarClock className="text-purple-600 w-6 h-6"/></div>
                     <div className="text-right">
                         <h3 className="font-bold text-gray-800 text-lg">ضيف التزام</h3>
                         <p className="text-sm text-gray-400">من قائمة "التزامات"</p>
                     </div>
                 </div>
              </div>
          </div>
      );
  }

  // --- MODAL CONTENT RENDERER ---
  const renderModalContent = () => {
      if (!activeModal) return null;

      let title = '';
      let items: any[] = [];
      let total = 0;
      let type: 'income' | 'expense' | 'mixed' = 'mixed';
      let icon = <Wallet />;

      if (activeModal === 'income') {
          title = 'تفاصيل الدخل (هذا الشهر)';
          items = dashboardStats.currentMonthTransactions.filter(t => t.type === 'income');
          total = dashboardStats.currentStats.income;
          type = 'income';
          icon = <ArrowUpCircle className="text-green-600" />;
      } else if (activeModal === 'expense') {
          title = 'تفاصيل المصروفات (هذا الشهر)';
          items = dashboardStats.currentMonthTransactions.filter(t => t.type === 'expense');
          total = dashboardStats.currentStats.expense;
          type = 'expense';
          icon = <ArrowDownCircle className="text-red-600" />;
      } else if (activeModal === 'balance') {
          title = 'ملخص الرصيد الشهري';
          items = []; // Balance is a summary, not a list
          total = dashboardStats.currentMonthNet;
          type = total >= 0 ? 'income' : 'expense';
          icon = <Wallet className="text-blue-600" />;
      } else if (activeModal === 'commitments') {
          title = 'الفواتير والالتزامات المستحقة';
          items = dashboardStats.pendingItemsList;
          total = dashboardStats.pendingMonthExpense;
          type = 'expense';
          icon = <AlertCircle className="text-purple-600" />;
      }

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)}>
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${type === 'income' ? 'bg-green-100' : type === 'expense' ? 'bg-red-100' : 'bg-blue-100'}`}>
                              {icon}
                          </div>
                          <div>
                              <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                              <p className="text-xs text-gray-500">
                                  الإجمالي: <span className="font-bold text-gray-900 text-sm">{total.toLocaleString()} {CURRENCY}</span>
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <X className="text-gray-400" size={20} />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {activeModal === 'balance' ? (
                          <div className="text-center py-6 space-y-4">
                              <div className="flex justify-around items-center">
                                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 w-full mx-2">
                                      <p className="text-xs text-green-600 mb-1">دخل الشهر</p>
                                      <p className="font-bold text-xl">{dashboardStats.currentStats.income.toLocaleString()}</p>
                                  </div>
                                  <Minus className="text-gray-300" />
                                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 w-full mx-2">
                                      <p className="text-xs text-red-600 mb-1">مصروفات الشهر</p>
                                      <p className="font-bold text-xl">{dashboardStats.currentStats.expense.toLocaleString()}</p>
                                  </div>
                              </div>
                              <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-50">
                                  <p className="text-sm text-gray-400 mb-1">الصافي المتبقي</p>
                                  <p className={`text-3xl font-black ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                      {total.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2 max-w-xs">
                                      {total >= 0 
                                        ? "ممتاز! أنت تدير ميزانيتك بشكل جيد هذا الشهر." 
                                        : "انتبه! مصروفاتك تجاوزت دخلك لهذا الشهر."}
                                  </p>
                              </div>
                          </div>
                      ) : items.length > 0 ? (
                          items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border border-gray-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-2 h-8 rounded-full ${type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                      <div>
                                          <p className="font-bold text-gray-800 text-sm">
                                              {activeModal === 'commitments' 
                                                  ? item.title 
                                                  : (item.category ? getCategoryInfo(item.category).label : 'عام')}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                              {activeModal === 'commitments' 
                                                ? `${item.category ? getCategoryInfo(item.category).label : ''} • استحقاق: ${new Date(item.nextDueDate).toLocaleDateString('ar-EG')}` 
                                                : `${new Date(item.date).toLocaleDateString('ar-EG')} • ${item.note || '-'}`}
                                          </p>
                                      </div>
                                  </div>
                                  <span className={`font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.amount.toLocaleString()}
                                  </span>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-10 text-gray-400">
                              <p>لا توجد بيانات لعرضها حالياً</p>
                          </div>
                      )}
                  </div>

                  {/* Modal Footer */}
                  {activeModal === 'commitments' && items.length > 0 && (
                      <div className="p-4 bg-purple-50 border-t border-purple-100 text-center">
                          <button 
                             onClick={() => { setActiveModal(null); if(setActiveTab) setActiveTab('recurring'); }}
                             className="text-xs text-purple-700 font-bold hover:underline"
                          >
                              الذهاب لإدارة الالتزامات للدفع
                          </button>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {activeModal && renderModalContent()}

      {/* Quick Actions Bar (Mobile Friendly) */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:hidden">
         <div className="bg-gray-900 text-white px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-gray-300 shrink-0 whitespace-nowrap">
            <Wallet size={18} className="text-yellow-400" />
            <span className="font-bold text-sm">صافي الرصيد: {dashboardStats.balance.toLocaleString()}</span>
         </div>
         {dashboardStats.currentMonthNet < 0 && (
             <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap">
                <AlertCircle size={18} />
                <span className="font-bold text-sm">انتبه! المصاريف عالية</span>
             </div>
         )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Balance */}
        <div 
            onClick={() => setActiveModal('balance')}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between h-full group hover:border-blue-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
          <div>
            <span className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-blue-500"/>
                الرصيد (شهري)
            </span>
            <div className={`text-3xl font-bold ${dashboardStats.currentMonthNet < 0 ? 'text-red-600' : 'text-gray-800'}`} dir="ltr">
                {dashboardStats.currentMonthNet.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex justify-between items-center">
             <span>{dashboardStats.currentMonthNet >= 0 ? '👍 وضعك مستقر' : '⚠️ عجز بالميزانية'}</span>
             <span className="text-blue-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">تفاصيل</span>
          </p>
        </div>

        {/* Card 2: Income */}
        <div 
            onClick={() => setActiveModal('income')}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between h-full group hover:border-green-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
          <div>
            <span className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-2">
                <ArrowUpCircle size={16} className="text-green-500"/>
                الدخل
            </span>
            <div className="text-2xl font-bold text-gray-800" dir="ltr">
                {dashboardStats.currentStats.income.toLocaleString()}
            </div>
          </div>
          <div className="mt-2 text-xs flex justify-between items-end">
            <div>
                {incomeChange !== 0 ? (
                    <span className={`flex items-center gap-1 ${incomeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {incomeChange > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                        {Math.abs(incomeChange).toFixed(0)}%
                    </span>
                ) : <span className="text-gray-400">--</span>}
            </div>
            <span className="text-green-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">عرض القائمة</span>
          </div>
        </div>

        {/* Card 3: Expense */}
        <div 
            onClick={() => setActiveModal('expense')}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between h-full group hover:border-red-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
           <div>
            <span className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-2">
                <ArrowDownCircle size={16} className="text-red-500"/>
                المصاريف
            </span>
            <div className="text-2xl font-bold text-gray-800" dir="ltr">
                {dashboardStats.currentStats.expense.toLocaleString()}
            </div>
          </div>
           <div className="mt-2 text-xs flex justify-between items-end">
            <div>
                {expenseChange !== 0 ? (
                    <span className={`flex items-center gap-1 ${expenseChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {expenseChange < 0 ? <TrendingDown size={12}/> : <TrendingUp size={12}/>}
                        {Math.abs(expenseChange).toFixed(0)}%
                    </span>
                ) : <span className="text-gray-400">--</span>}
            </div>
            <span className="text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">عرض القائمة</span>
          </div>
        </div>

        {/* Card 4: Monthly Commitments */}
        <div 
            onClick={() => setActiveModal('commitments')}
            className="bg-purple-50 p-5 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden flex flex-col justify-between h-full group hover:border-purple-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
           <div>
            <span className="text-purple-700 text-sm font-medium flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-purple-600"/>
                مطلوب سداده
            </span>
            <div className="text-2xl font-bold text-purple-900" dir="ltr">
                {dashboardStats.pendingMonthExpense.toLocaleString()}
            </div>
           </div>
           <div className="mt-2 flex justify-between items-end">
              <p className="text-[10px] text-purple-600">فواتير وأقساط مستحقة</p>
              <span className="text-purple-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity">التفاصيل</span>
           </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly History Chart */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400"/>
                تحليل آخر 6 شهور
            </h3>
            <div className="flex-1 w-full min-h-0 text-xs" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyHistoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <RechartsTooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend iconType="circle" />
                        <Bar name="الدخل" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar name="المصاريف" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Expenses Pie Chart */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col">
           <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
               <PieChart size={18} className="text-gray-400"/>
               توزيع المصروفات
           </h3>
           {categoryData.length > 0 ? (
             <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     innerRadius={50}
                     outerRadius={70}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {categoryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip />
                   <Legend verticalAlign="bottom" height={36} iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
               <PieChart className="opacity-20 w-12 h-12" />
               <p className="text-xs">لا توجد مصروفات لعرضها</p>
             </div>
           )}
        </div>
      </div>
      
      {/* Recent Transactions List */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">أحدث العمليات</h3>
              <span className="text-xs text-blue-600 font-bold opacity-0 md:opacity-100">عرض الكل</span>
          </div>
          
          <div className="space-y-3">
            {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                       {t.type === 'income' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{getCategoryInfo(t.category).label}</p>
                      <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">{CURRENCY}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[100px] truncate">{t.note}</p>
                  </div>
                </div>
            ))}
            {transactions.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">لا توجد عمليات حديثة</div>
            )}
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
