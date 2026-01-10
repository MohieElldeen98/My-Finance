import React, { useMemo } from 'react';
import { Transaction, RecurringTransaction, FinancialGoal } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, CalendarClock, AlertCircle, Calculator, Target, BarChart3 } from 'lucide-react';
import { CATEGORY_LABELS, CURRENCY, TYPE_LABELS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  recurringItems?: RecurringTransaction[];
  goals?: FinancialGoal[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, recurringItems = [], goals = [] }) => {
  
  // 1. Calculate Monthly Status (Actual + Pending)
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // A. Calculate Global Balance (Real Cash on Hand) & Actual Monthly Totals
    let globalBalance = 0;
    let actualMonthIncome = 0;
    let actualMonthExpense = 0;

    transactions.forEach(t => {
      // Global Balance logic
      if (t.type === 'income') globalBalance += t.amount;
      else globalBalance -= t.amount;

      // Current Month Logic
      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        if (t.type === 'income') actualMonthIncome += t.amount;
        else actualMonthExpense += t.amount;
      }
    });

    // B. Calculate Pending Recurring Items (Due this month or Overdue)
    let pendingMonthIncome = 0;
    let pendingMonthExpense = 0;

    recurringItems.forEach(r => {
      if (!r.active) return;
      
      const rDate = new Date(r.nextDueDate);
      // Logic: If the due date is in the current month OR it is in the past (overdue)
      // It counts towards the "Projected" totals for this month.
      const isDueThisMonth = (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear);
      const isOverdue = rDate < now && !isDueThisMonth; // Strictly past dates not in current month window (though logically usually paid)

      // We include it if it's due this month or overdue (needs to be handled now)
      if (isDueThisMonth || (isOverdue && rDate < new Date())) { 
        if (r.type === 'income') pendingMonthIncome += r.amount;
        else pendingMonthExpense += r.amount;
      }
    });

    return {
      balance: globalBalance,
      totalProjectedIncome: actualMonthIncome + pendingMonthIncome,
      totalProjectedExpense: actualMonthExpense + pendingMonthExpense,
      actualMonthIncome,
      pendingMonthIncome,
      actualMonthExpense,
      pendingMonthExpense
    };
  }, [transactions, recurringItems]);

  // 2. Calculate Average Monthly Burden (The "Saving" logic)
  const averageMonthlyStats = useMemo(() => {
    let monthlyFixedExpense = 0;

    recurringItems.forEach(item => {
      if (!item.active || item.type !== 'expense') return;
      
      let monthlyAmount = item.amount;
      
      // Pro-rate based on frequency
      if (item.frequency === 'quarterly') {
        monthlyAmount = item.amount / 3;
      } else if (item.frequency === 'yearly') {
        monthlyAmount = item.amount / 12;
      }
      
      monthlyFixedExpense += monthlyAmount;
    });

    return Math.ceil(monthlyFixedExpense);
  }, [recurringItems]);

  // 3. Calculate Total Savings from Goals
  const totalSavings = useMemo(() => {
    return goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  }, [goals]);

  // 4. Prepare Pie Chart Data
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped: Record<string, number> = {};
    
    expenses.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 5. Prepare Bar Chart Data (Monthly History)
  const monthlyHistoryData = useMemo(() => {
    const data: Record<string, { name: string; income: number; expense: number; sortKey: number }> = {};

    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`; 
        
        if (!data[key]) {
            data[key] = {
                name: d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }),
                income: 0,
                expense: 0,
                sortKey: d.getTime()
            };
        }

        if (t.type === 'income') {
            data[key].income += t.amount;
        } else {
            data[key].expense += t.amount;
        }
    });

    // Sort chronologically and take last 6-12 months
    return Object.values(data)
        .sort((a, b) => a.sortKey - b.sortKey)
        .slice(-12); // Show last 12 active months max
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Card 1: Wallet Balance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-gray-500 font-medium">الرصيد الفعلي</span>
          </div>
          <div className="text-3xl font-bold text-gray-800" dir="ltr">
            {dashboardStats.balance.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">الكاش المتوفر حالياً</p>
        </div>

        {/* Card 2: Total Savings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-gray-500 font-medium">إجمالي المدخرات</span>
          </div>
          <div className="text-3xl font-bold text-gray-800" dir="ltr">
            {totalSavings.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">حصالة الأهداف المالية</p>
        </div>

        {/* Card 3: Projected Monthly Income */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-50 rounded-full text-green-600">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <span className="text-gray-500 font-medium">دخل الشهر</span>
          </div>
          <div className="text-3xl font-bold text-gray-800" dir="ltr">
            {dashboardStats.totalProjectedIncome.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
          </div>
          <div className="flex flex-col mt-2 text-xs text-gray-400 gap-1">
             <div className="flex justify-between">
                <span>تم تحصيله:</span>
                <span className="text-green-600 font-bold">{dashboardStats.actualMonthIncome.toLocaleString()}</span>
             </div>
             {dashboardStats.pendingMonthIncome > 0 && (
                <div className="flex justify-between">
                    <span>منتظر:</span>
                    <span className="text-orange-500 font-bold">{dashboardStats.pendingMonthIncome.toLocaleString()}</span>
                </div>
             )}
          </div>
        </div>

        {/* Card 4: Projected Monthly Expense */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <span className="text-gray-500 font-medium">مصروفات الشهر</span>
          </div>
          <div className="text-3xl font-bold text-gray-800" dir="ltr">
            {dashboardStats.totalProjectedExpense.toLocaleString()} <span className="text-sm font-normal text-gray-400">{CURRENCY}</span>
          </div>
          <div className="flex flex-col mt-2 text-xs text-gray-400 gap-1">
             <div className="flex justify-between">
                <span>تم صرفه:</span>
                <span className="text-red-600 font-bold">{dashboardStats.actualMonthExpense.toLocaleString()}</span>
             </div>
             {dashboardStats.pendingMonthExpense > 0 && (
                <div className="flex justify-between">
                    <span>مستحق:</span>
                    <span className="text-orange-500 font-bold">{dashboardStats.pendingMonthExpense.toLocaleString()}</span>
                </div>
             )}
          </div>
        </div>

        {/* Card 5: Average Saving Requirement */}
        <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white rounded-full text-purple-600 shadow-sm">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="text-purple-800 font-medium text-sm">متوسط عبء الأقساط</span>
          </div>
          <div className="text-3xl font-bold text-purple-900" dir="ltr">
            {averageMonthlyStats.toLocaleString()} <span className="text-sm font-normal text-purple-600">{CURRENCY}</span>
          </div>
          <p className="text-xs text-purple-500 mt-2 flex items-start gap-1">
             <AlertCircle size={12} className="mt-0.5" />
             يجب توفيره شهرياً للالتزامات
          </p>
        </div>
      </div>

      {/* NEW SECTION: Monthly Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-80">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                تحليل الدخل والمصاريف الشهري
            </h3>
        </div>
        
        {monthlyHistoryData.length > 0 ? (
            <div className="flex-1 w-full min-h-0 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={monthlyHistoryData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar name="الدخل" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar name="المصاريف" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                <BarChart3 className="w-10 h-10 opacity-20" />
                <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث العمليات</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
                <p>لا توجد عمليات مسجلة بعد</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                       {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{CATEGORY_LABELS[t.category]}</p>
                      <p className="text-xs text-gray-500">{t.note || TYPE_LABELS[t.type]}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount} {CURRENCY}
                    </p>
                    <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expenses Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
           <h3 className="text-lg font-bold text-gray-800 mb-4">توزيع المصروفات</h3>
           {categoryData.length > 0 ? (
             <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {categoryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip />
                   <Legend verticalAlign="bottom" height={36}/>
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-400">
               <p>أضف مصروفات لعرض التحليل</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;