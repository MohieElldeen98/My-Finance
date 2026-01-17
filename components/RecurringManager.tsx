
import React, { useState, useMemo } from 'react';
import { RecurringTransaction, Transaction } from '../types';
import { CURRENCY, FREQUENCY_LABELS, CATEGORY_LABELS } from '../constants';
import { CalendarClock, Plus, Trash2, Pencil, Save, X, Timer, Filter, CheckSquare, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';

interface RecurringManagerProps {
  items: RecurringTransaction[];
  transactions: Transaction[]; 
  onAdd: (item: RecurringTransaction) => void;
  onUpdate: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onProcess: (item: RecurringTransaction) => void;
}

interface DisplayItem {
    id: string; 
    originalRecurringId: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    frequency: string;
    date: string; 
    status: 'pending' | 'paid' | 'overdue';
    isOneTime: boolean;
    canPay: boolean;
}

const RecurringManager: React.FC<RecurringManagerProps> = ({ items, transactions, onAdd, onUpdate, onDelete, onProcess }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paid'>('active');

  const [formData, setFormData] = useState<Partial<RecurringTransaction>>({
    title: '',
    amount: 0,
    type: 'expense',
    frequency: 'monthly',
    nextDueDate: new Date().toISOString().split('T')[0],
    category: 'other',
    isOneTime: false,
    installmentsCount: 0 
  });

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- Logic: Merge Pending (Projected) + Paid ---
  const processedItems = useMemo(() => {
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const today = new Date();
    today.setHours(0,0,0,0);
    const isCurrentMonthView = currentMonth === today.getMonth() && currentYear === today.getFullYear();

    const displayList: DisplayItem[] = [];

    // 1. PAID Items (from Transactions)
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (t.recurringId && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
             const original = items.find(i => i.id === t.recurringId);
             
             // If original exists but it's an installment (filtered out by parent or here), skip it here
             if (original && original.installmentsCount && original.installmentsCount > 0) return;

             // Check if it belongs to the items list (Subscriptions only)
             if (!original && !t.note.includes('دفع تلقائي')) return; 

             displayList.push({
                 id: t.id,
                 originalRecurringId: t.recurringId || '',
                 title: original ? original.title : t.note.replace('دفع تلقائي: ', ''),
                 amount: t.amount,
                 type: t.type,
                 category: t.category,
                 frequency: original?.frequency || 'monthly',
                 date: t.date,
                 status: 'paid',
                 isOneTime: original?.isOneTime || false,
                 canPay: false,
             });
        }
    });

    // 2. PENDING / PROJECTED Items (from Recurring Definitions)
    items.forEach(item => {
        // Skip installments
        if (item.installmentsCount && item.installmentsCount > 0) return;

        // If inactive and not a paid history view, skip
        if (!item.active && !item.isOneTime) {
            return;
        }

        const nextDue = new Date(item.nextDueDate);
        nextDue.setHours(0,0,0,0);

        // Simple Projection logic for Subscriptions
        let occursInViewMonth = false;
        let projectedDueDate = new Date(item.nextDueDate); 
        
        // Exact match
        if (nextDue.getMonth() === currentMonth && nextDue.getFullYear() === currentYear) {
            occursInViewMonth = true;
            projectedDueDate = nextDue;
        } else if (item.active && viewDate > today) {
             // Future projection
             const monthsDiff = (currentYear - nextDue.getFullYear()) * 12 + (currentMonth - nextDue.getMonth());
             let multiplier = 1;
             if (item.frequency === 'quarterly') multiplier = 3;
             if (item.frequency === 'yearly') multiplier = 12;
             
             if (monthsDiff > 0 && monthsDiff % multiplier === 0) {
                 occursInViewMonth = true;
                 projectedDueDate = new Date(nextDue);
                 projectedDueDate.setMonth(nextDue.getMonth() + monthsDiff);
             }
        } else if (item.active && nextDue < today && isCurrentMonthView) {
            // Overdue logic
            occursInViewMonth = true;
            projectedDueDate = nextDue;
        }

        if (occursInViewMonth) {
             const alreadyListed = displayList.find(d => d.originalRecurringId === item.id);
             
             if (!alreadyListed) {
                 let status: 'pending' | 'overdue' = 'pending';
                 if (projectedDueDate < today && isCurrentMonthView) status = 'overdue';

                 if (item.active) {
                    displayList.push({
                        id: item.id,
                        originalRecurringId: item.id,
                        title: item.title,
                        amount: item.amount,
                        type: item.type,
                        category: item.category,
                        frequency: item.frequency,
                        date: projectedDueDate.toISOString(),
                        status: status,
                        isOneTime: !!item.isOneTime,
                        canPay: isCurrentMonthView || status === 'overdue',
                    });
                 }
             }
        }
    });

    return displayList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items, transactions, viewDate]);

  const filteredItems = useMemo(() => {
    return processedItems.filter(item => {
        const matchesType = filterType === 'all' || item.type === filterType;
        let matchesStatus = true;
        if (filterStatus === 'active') matchesStatus = item.status === 'pending' || item.status === 'overdue';
        if (filterStatus === 'paid') matchesStatus = item.status === 'paid';
        return matchesType && matchesStatus;
    });
  }, [processedItems, filterType, filterStatus]);

  const viewStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    processedItems.forEach(item => {
        if (item.type === 'income') income += item.amount;
        else expense += item.amount;
    });
    return { income, expense, net: income - expense };
  }, [processedItems]);


  // Form Handlers
  const handleStartAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      type: 'expense',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
      category: 'other',
      isOneTime: false,
      installmentsCount: 0
    });
    setShowForm(!showForm);
  };

  const handleStartEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setEditingId(item.id);
    setFormData({
      title: item.title,
      amount: item.amount,
      type: item.type,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      category: item.category,
      isOneTime: item.isOneTime,
      installmentsCount: 0
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    const transactionData = {
      title: formData.title,
      amount: Number(formData.amount),
      type: formData.type as 'income' | 'expense',
      category: formData.category || 'other',
      frequency: formData.frequency as 'monthly' | 'quarterly' | 'yearly',
      nextDueDate: formData.nextDueDate || new Date().toISOString().split('T')[0],
      active: true,
      isOneTime: formData.isOneTime || false,
      installmentsCount: 0,
      startDate: formData.nextDueDate 
    };

    if (editingId) {
      onUpdate({ ...transactionData, id: editingId } as RecurringTransaction);
    } else {
      onAdd({ ...transactionData, id: Date.now().toString() } as RecurringTransaction);
    }

    setFormData({ title: '', amount: 0, type: 'expense', frequency: 'monthly', nextDueDate: new Date().toISOString().split('T')[0], category: 'other', isOneTime: false, installmentsCount: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const getRemainingTime = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays < 0) return 'متأخر';
    if (totalDays === 0) return 'اليوم';
    if (totalDays > 30) return `${Math.floor(totalDays / 30)} شهر`;
    return `${totalDays} يوم`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-purple-600" />
              الفواتير والاشتراكات
            </h2>
            <p className="text-sm text-gray-400">إدارة المصاريف الثابتة (مثل الإيجار، النت، الاشتراكات)</p>
         </div>
         <button 
           onClick={handleStartAdd}
           className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
         >
           {showForm && !editingId ? 'إلغاء' : 'التزام جديد'}
           {!(showForm && !editingId) && <Plus size={18} />}
         </button>
      </div>

      {/* شريط التنقل بين الشهور */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
         <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight size={24} />
         </button>
         <div className="text-center">
            <span className="block text-lg font-bold text-gray-800">
                {viewDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </span>
         </div>
         <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft size={24} />
         </button>
      </div>

      {/* ملخص الشهر */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
         <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
             <p className="text-[10px] md:text-xs text-green-600 mb-1">دخل ثابت</p>
             <p className="font-bold text-gray-800 text-sm md:text-base">{viewStats.income.toLocaleString()}</p>
         </div>
         <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
             <p className="text-[10px] md:text-xs text-red-600 mb-1">فواتير</p>
             <p className="font-bold text-gray-800 text-sm md:text-base">{viewStats.expense.toLocaleString()}</p>
         </div>
         <div className={`p-3 rounded-xl border text-center ${viewStats.net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
             <p className={`text-[10px] md:text-xs mb-1 ${viewStats.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>الصافي</p>
             <p className="font-bold text-gray-800 text-sm md:text-base">{viewStats.net.toLocaleString()}</p>
         </div>
      </div>

       {/* فلاتر العرض */}
       <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 px-2">
            <Filter size={16} />
            <span className="text-sm font-bold">عرض:</span>
          </div>
          <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>الكل</button>
          <button onClick={() => setFilterStatus('active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>الانتظار</button>
          <button onClick={() => setFilterStatus('paid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'paid' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>المدفوع</button>
       </div>

      {/* نموذج الإضافة / التعديل */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
          <div className="col-span-1 md:col-span-2 flex justify-between items-center">
             <h3 className={`font-bold ${editingId ? 'text-blue-700' : 'text-gray-700'}`}>{editingId ? 'تعديل الالتزام' : 'إضافة التزام جديد'}</h3>
             {editingId && <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>}
          </div>
          
          <input type="text" placeholder="اسم الالتزام (مثال: إيجار، نت)" className="p-3 bg-white rounded-xl border border-gray-200" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          <input type="number" placeholder="قيمة المبلغ" className="p-3 bg-white rounded-xl border border-gray-200" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} required />
          
          <select className="p-3 bg-white rounded-xl border border-gray-200" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
            <option value="expense">مصروف (عليك)</option>
            <option value="income">دخل (ليك)</option>
          </select>
          
          <select className="p-3 bg-white rounded-xl border border-gray-200" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
            <option value="monthly">شهري</option>
            <option value="quarterly">ربع سنوي (كل 3 شهور)</option>
            <option value="yearly">سنوي</option>
          </select>
          
          <div className="space-y-1">
             <label className="text-xs text-gray-400 mr-2">تاريخ الاستحقاق القادم</label>
             <input type="date" className="w-full p-3 bg-white rounded-xl border border-gray-200" value={formData.nextDueDate} onChange={e => setFormData({...formData, nextDueDate: e.target.value})} required />
          </div>

          <div className="col-span-1 md:col-span-2 flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
             <input type="checkbox" id="isOneTime" checked={formData.isOneTime} onChange={e => setFormData({...formData, isOneTime: e.target.checked})} className="w-5 h-5 accent-purple-600" />
             <label htmlFor="isOneTime" className="text-sm font-bold text-gray-700 cursor-pointer select-none">التزام لمرة واحدة فقط (لهذا الشهر)</label>
          </div>

          <button type="submit" className={`col-span-1 md:col-span-2 text-white p-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </form>
      )}

      {/* قائمة الالتزامات */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {filteredItems.map(item => {
            const isPaid = item.status === 'paid';
            const isOverdue = item.status === 'overdue';
            const remainingTime = getRemainingTime(item.date);

            return (
                <div key={`${item.id}-${item.date}`} className={`p-4 rounded-2xl shadow-sm border ${isPaid ? "bg-green-50/50 border-green-200 opacity-80" : isOverdue ? "bg-red-50 border-red-200" : "bg-white border-gray-100"} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 relative overflow-hidden`}>
                    
                    {isPaid && <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded-br-lg font-bold z-10">تم التسديد</div>}
                    {item.isOneTime && <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1 z-10"><Bookmark size={10} /> مرة واحدة</div>}
                    
                    <div className="flex items-start gap-4 flex-1 w-full md:w-auto mt-4 md:mt-0">
                        <div className={`p-3 rounded-full flex-shrink-0 ${item.type === 'income' ? 'bg-green-100 text-green-600' : (isPaid ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-600')}`}>
                            <CalendarClock size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-bold text-lg leading-tight ${isPaid ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.title}</h3>
                            <div className="flex gap-2 text-sm text-gray-500 mt-1 flex-wrap">
                                <span className="bg-white border border-gray-100 px-2 py-0.5 rounded text-xs">{CATEGORY_LABELS[item.category] || 'عام'}</span>
                                <span className="bg-white border border-gray-100 px-2 py-0.5 rounded text-xs">{FREQUENCY_LABELS[item.frequency] || 'شهري'}</span>
                            </div>
                            
                            {!isPaid && (
                                <div className="text-xs mt-2 flex items-center gap-2">
                                   <span className={`${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                      {new Date(item.date).toLocaleDateString('ar-EG')}
                                   </span>
                                   {!isOverdue ? (
                                     <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1"><Timer size={10} /> {remainingTime}</span>
                                   ) : <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded">متأخر!</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto justify-between md:justify-center border-t border-gray-100 md:border-none pt-3 md:pt-0">
                        <span className={`text-xl font-bold ${isPaid ? 'text-gray-400' : (item.type === 'income' ? 'text-green-600' : 'text-red-600')}`}>
                            {item.amount.toLocaleString()} {CURRENCY}
                        </span>

                        <div className="flex items-center gap-2">
                             {item.canPay && (
                                <button 
                                    onClick={() => onProcess(items.find(i => i.id === item.originalRecurringId) as RecurringTransaction)}
                                    className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${isOverdue ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                >
                                    <CheckSquare size={16} /> {item.type === 'income' ? 'استلام' : 'تسديد'}
                                </button>
                             )}
                             
                             {!isPaid && (
                                 <div className="flex bg-gray-50 rounded-lg border border-gray-100">
                                    <button onClick={() => handleStartEdit(item.originalRecurringId)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors border-l border-gray-200"><Pencil size={18} /></button>
                                    <button onClick={() => onDelete(item.originalRecurringId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            );
        })}
        {filteredItems.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <CalendarClock size={40} className="mb-2 opacity-20" />
                <p>لا توجد فواتير أو التزامات لهذا الشهر.</p>
            </div>
        )}
      </div>

    </div>
  );
};

export default RecurringManager;
