
import React, { useState, useMemo, useEffect } from 'react';
import { RecurringTransaction, ParsedTransaction } from '../types';
import { CURRENCY } from '../constants';
import { Layers, Plus, Trash2, CheckSquare, Save, PieChart, AlertCircle, Calendar, Calculator, Clock, Settings, TrendingUp, Flag, ArrowRight } from 'lucide-react';

interface InstallmentsManagerProps {
  items: RecurringTransaction[];
  onAdd: (item: RecurringTransaction) => void;
  onUpdate: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onProcess: (item: RecurringTransaction) => void;
  onAddTransaction?: (data: ParsedTransaction, date: string) => void;
}

const InstallmentsManager: React.FC<InstallmentsManagerProps> = ({ items, onAdd, onUpdate, onDelete, onProcess, onAddTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<RecurringTransaction>>({
    title: '',
    amount: 0,
    totalValue: 0,
    maintenance: 0, 
    downPayment: 0,
    type: 'expense',
    frequency: 'monthly',
    nextDueDate: new Date().toISOString().split('T')[0],
    category: 'installments',
    active: true,
    installmentsCount: 0,
    totalPaidCount: 0,
    durationValue: 12, // Default 1 year
    durationUnit: 'months'
  });

  const [downPaymentPercent, setDownPaymentPercent] = useState<string>('0');
  // State for Down Payment Date
  const [downPaymentDate, setDownPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- Auto-Calculate Logic ---
  useEffect(() => {
    // 1. Calculate Down Payment Percentage
    if (formData.totalValue && formData.downPayment) {
        const percent = (formData.downPayment / formData.totalValue) * 100;
        setDownPaymentPercent(percent.toFixed(1));
    } else {
        setDownPaymentPercent('0');
    }

    // 2. Auto-Calculate Installments Count based on Duration & Frequency
    let count = 0;
    const durVal = formData.durationValue || 0;
    const totalMonths = formData.durationUnit === 'years' ? durVal * 12 : durVal;

    if (formData.frequency === 'monthly') count = totalMonths;
    else if (formData.frequency === 'quarterly') count = Math.floor(totalMonths / 3);
    else if (formData.frequency === 'semi_annual') count = Math.floor(totalMonths / 6);
    else if (formData.frequency === 'yearly') count = Math.floor(totalMonths / 12);

    // 3. Auto-Calculate Installment Amount
    // Formula: (Total Value + Maintenance - Down Payment) / Count
    let calculatedAmount = 0;
    const totalDebt = (formData.totalValue || 0) + (formData.maintenance || 0);
    const remainingDebt = totalDebt - (formData.downPayment || 0);

    if (count > 0 && remainingDebt > 0) {
        calculatedAmount = remainingDebt / count;
    }

    // Update Form State if values changed (prevent infinite loop by checking diff)
    if (count !== formData.installmentsCount || Math.abs(calculatedAmount - (formData.amount || 0)) > 0.01) {
         setFormData(prev => ({
             ...prev,
             installmentsCount: count,
             amount: Math.round(calculatedAmount * 100) / 100
         }));
    }

  }, [
      formData.totalValue, 
      formData.maintenance, 
      formData.downPayment, 
      formData.durationValue, 
      formData.durationUnit, 
      formData.frequency
  ]);


  // --- Statistics ---
  const stats = useMemo(() => {
    let totalDebt = 0;
    let totalPaid = 0;
    let activeCount = 0;
    let monthlyCommitment = 0;

    items.forEach(item => {
        const count = item.installmentsCount || 1;
        const paidCount = item.totalPaidCount || 0;
        
        // Total Debt for statistics = (Item Price + Maintenance)
        // If totalValue is missing (legacy), try to estimate
        const itemTotalCost = (item.totalValue || (item.amount * count)) + (item.maintenance || 0);
        
        // Paid Value = (Installment Amount * Paid Count) + Down Payment
        const paidVal = (item.amount * paidCount) + (item.downPayment || 0);
        
        totalDebt += itemTotalCost;
        totalPaid += paidVal;
        
        if (item.active) {
            activeCount++;
            let multiplier = 1;
            if (item.frequency === 'quarterly') multiplier = 0.33;
            if (item.frequency === 'semi_annual') multiplier = 0.16;
            if (item.frequency === 'yearly') multiplier = 0.08;
            monthlyCommitment += (item.amount * multiplier);
        }
    });

    return {
        totalDebt,
        totalPaid,
        remaining: totalDebt - totalPaid,
        progress: totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0,
        activeCount,
        monthlyCommitment: Math.round(monthlyCommitment)
    };
  }, [items]);

  // --- Date Calculation Logic for Past Dates ---
  const calculatePastDue = (startDateStr: string, frequency: string): { passedCount: number, nextFutureDate: string } => {
    const start = new Date(startDateStr);
    const now = new Date();
    start.setHours(0,0,0,0);
    now.setHours(0,0,0,0);

    // If start date is in the future or today, no correction needed
    if (start >= now) return { passedCount: 0, nextFutureDate: startDateStr };

    let count = 0;
    let current = new Date(start);
    
    // Add interval until we reach future
    while (current < now) {
        count++;
        if (frequency === 'monthly') current.setMonth(current.getMonth() + 1);
        else if (frequency === 'quarterly') current.setMonth(current.getMonth() + 3);
        else if (frequency === 'semi_annual') current.setMonth(current.getMonth() + 6);
        else if (frequency === 'yearly') current.setFullYear(current.getFullYear() + 1);
    }
    
    return { passedCount: count, nextFutureDate: current.toISOString() };
  };

  // --- Calculate Last Installment Date ---
  const calculateEndDate = (startDate: string, count: number, frequency: string) => {
      if (!startDate || count <= 0) return null;
      
      const start = new Date(startDate);
      const end = new Date(start);
      
      // We add (count - 1) intervals because the start date is the first payment
      const intervalsToAdd = count - 1;

      if (frequency === 'monthly') end.setMonth(end.getMonth() + intervalsToAdd);
      else if (frequency === 'quarterly') end.setMonth(end.getMonth() + (intervalsToAdd * 3));
      else if (frequency === 'semi_annual') end.setMonth(end.getMonth() + (intervalsToAdd * 6));
      else if (frequency === 'yearly') end.setFullYear(end.getFullYear() + intervalsToAdd);
      
      return end.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    let finalPaidCount = formData.totalPaidCount || 0;
    let finalNextDue = formData.nextDueDate!;

    // 1. Detect Past Dates & Calculate "Already Paid" Logic
    if (formData.nextDueDate) {
        const { passedCount, nextFutureDate } = calculatePastDue(formData.nextDueDate, formData.frequency || 'monthly');
        
        if (passedCount > 0) {
            if (!editingId || (editingId && finalPaidCount === 0)) {
               finalPaidCount += passedCount;
            }
            finalNextDue = nextFutureDate;
        }
    }

    const data = {
        ...formData,
        category: 'installments', 
        type: 'expense' as const,
        installmentsCount: Number(formData.installmentsCount),
        totalPaidCount: finalPaidCount,
        startDate: formData.nextDueDate, // Keep original start date for records
        nextDueDate: finalNextDue // Update next due to the actual future date
    };

    if (editingId) {
        onUpdate({ ...data, id: editingId } as RecurringTransaction);
    } else {
        // New Item
        onAdd({ ...data, id: Date.now().toString() } as RecurringTransaction);

        // 2. Log Down Payment if exists
        if (formData.downPayment && formData.downPayment > 0 && onAddTransaction) {
             onAddTransaction({
                 amount: formData.downPayment,
                 currency: CURRENCY,
                 type: 'expense',
                 category: 'installments',
                 note: `مقدم تقسيط: ${formData.title}`,
                 paymentMethod: 'cash'
             }, downPaymentDate); // Use the user-selected date
        }
    }
    
    resetForm();
  };

  const resetForm = () => {
      setFormData({
        title: '',
        amount: 0,
        totalValue: 0,
        maintenance: 0,
        downPayment: 0,
        type: 'expense',
        frequency: 'monthly',
        nextDueDate: new Date().toISOString().split('T')[0],
        category: 'installments',
        active: true,
        installmentsCount: 0,
        totalPaidCount: 0,
        durationValue: 12,
        durationUnit: 'months'
      });
      setDownPaymentDate(new Date().toISOString().split('T')[0]);
      setShowForm(false);
      setEditingId(null);
  };

  const handleEdit = (item: RecurringTransaction) => {
      setFormData({
          ...item,
          durationValue: item.durationValue || item.installmentsCount || 12,
          durationUnit: item.durationUnit || 'months',
          maintenance: item.maintenance || 0
      });
      setEditingId(item.id);
      setShowForm(true);
  };

  const getProgressColor = (percent: number) => {
      if (percent >= 100) return 'bg-green-500';
      if (percent >= 75) return 'bg-blue-500';
      if (percent >= 50) return 'bg-yellow-500';
      return 'bg-orange-500';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              إدارة الأقساط
            </h2>
            <p className="text-sm text-gray-400">نظام ذكي لحساب ومتابعة الأقساط والديون</p>
         </div>
         <button 
           onClick={() => setShowForm(!showForm)}
           className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
         >
           {showForm ? 'إلغاء' : 'قسط جديد'}
           {!showForm && <Plus size={18} />}
         </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
               <p className="text-gray-500 text-xs font-bold mb-1">إجمالي المديونية</p>
               <h3 className="text-2xl font-bold text-gray-800">{stats.totalDebt.toLocaleString()} <span className="text-xs font-normal text-gray-400">{CURRENCY}</span></h3>
               <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1"><AlertCircle size={12}/> {stats.activeCount} أقساط نشطة</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
               <p className="text-gray-500 text-xs font-bold mb-1">تم سداده حتى الآن</p>
               <h3 className="text-2xl font-bold text-green-600">{stats.totalPaid.toLocaleString()} <span className="text-xs font-normal text-gray-400">{CURRENCY}</span></h3>
               <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
                   <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{width: `${stats.progress}%`}}></div>
               </div>
          </div>

          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
               <div>
                   <p className="text-indigo-800 text-xs font-bold mb-1">المتبقي للدفع</p>
                   <h3 className="text-2xl font-bold text-indigo-900">{stats.remaining.toLocaleString()} <span className="text-xs font-normal text-indigo-600">{CURRENCY}</span></h3>
               </div>
               <p className="text-xs text-indigo-400 mt-2">عبء شهري تقريبي: {stats.monthlyCommitment.toLocaleString()} {CURRENCY}</p>
          </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                 <Calculator className="text-indigo-600 w-5 h-5"/>
                 <h3 className="font-bold text-gray-700">{editingId ? 'تعديل بيانات القسط' : 'حاسبة القسط الذكية'}</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Basic Info */}
                 <div className="space-y-1">
                     <label className="text-xs text-gray-500">اسم السلعة / القسط</label>
                     <input type="text" required placeholder="مثال: آيفون 15 برو" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                 </div>

                 <div className="space-y-1">
                     <label className="text-xs text-gray-500">تاريخ بداية السداد</label>
                     <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.nextDueDate} onChange={e => setFormData({...formData, nextDueDate: e.target.value})} />
                 </div>

                 {/* Configuration */}
                 <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                     
                     <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-bold">سعر الكاش (كامل)</label>
                        <input type="number" placeholder="0.00" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" value={formData.totalValue || ''} onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value)})} />
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex justify-between items-center">
                            <span>المقدم المدفوع</span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">{downPaymentPercent}%</span>
                        </label>
                        <input type="number" placeholder="0.00" className="w-full p-3 bg-white border border-gray-200 rounded-xl" value={formData.downPayment || ''} onChange={e => setFormData({...formData, downPayment: parseFloat(e.target.value)})} />
                        
                        {/* Down Payment Date Selector */}
                        {(formData.downPayment || 0) > 0 && (
                            <div className="animate-fade-in mt-2">
                                <label className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
                                    <Calendar size={10} /> تاريخ دفع المقدم
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                                    value={downPaymentDate}
                                    onChange={e => setDownPaymentDate(e.target.value)}
                                />
                            </div>
                        )}
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                             <Settings size={10} /> مصاريف إدارية / صيانة
                        </label>
                        <input type="number" placeholder="0.00" className="w-full p-3 bg-white border border-gray-200 rounded-xl" value={formData.maintenance || ''} onChange={e => setFormData({...formData, maintenance: parseFloat(e.target.value)})} />
                     </div>
                 </div>

                 {/* Frequency & Duration */}
                 <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="space-y-1 col-span-1">
                         <label className="text-xs text-gray-500">نظام الدفع</label>
                         <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                            <option value="monthly">شهري</option>
                            <option value="quarterly">ربع سنوي</option>
                            <option value="semi_annual">نصف سنوي</option>
                            <option value="yearly">سنوي</option>
                         </select>
                     </div>

                     <div className="space-y-1 col-span-1">
                         <label className="text-xs text-gray-500">مدة التقسيط</label>
                         <div className="flex gap-2">
                             <input type="number" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold" value={formData.durationValue} onChange={e => setFormData({...formData, durationValue: parseFloat(e.target.value)})} />
                             <select className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs" value={formData.durationUnit} onChange={e => setFormData({...formData, durationUnit: e.target.value as any})}>
                                 <option value="months">شهر</option>
                                 <option value="years">سنة</option>
                             </select>
                         </div>
                     </div>

                     {/* Computed Results */}
                     <div className="col-span-2 md:col-span-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center px-6">
                        <div className="text-center">
                            <p className="text-[10px] text-indigo-400 mb-1">عدد الأقساط</p>
                            <p className="font-bold text-lg text-indigo-900">{formData.installmentsCount}</p>
                        </div>
                        <div className="h-8 w-px bg-indigo-200"></div>
                        <div className="text-center">
                            <p className="text-[10px] text-indigo-400 mb-1">قيمة القسط الواحد</p>
                            <p className="font-bold text-xl text-indigo-600">{formData.amount?.toLocaleString()} {CURRENCY}</p>
                        </div>
                     </div>
                 </div>

                {editingId && (
                    <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-500">عدد الأقساط المدفوعة يدوياً (للتصحيح)</label>
                        <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.totalPaidCount || 0} onChange={e => setFormData({...formData, totalPaidCount: parseInt(e.target.value)})} />
                    </div>
                )}
             </div>

             <div className="mt-4 flex gap-3">
                 <button type="submit" className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-indigo-200">
                     <Save size={18} /> {editingId ? 'حفظ التعديلات' : 'إضافة للقائمة'}
                 </button>
                 <button type="button" onClick={resetForm} className="p-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                     إلغاء
                 </button>
             </div>
        </form>
      )}

      {/* Installments List - RESPONSIVE STACK */}
      <div className="space-y-4">
        {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Layers size={40} className="mb-2 opacity-20" />
                <p>لا توجد أقساط حالية. أضف قسط جديد لتنظيم ديونك.</p>
            </div>
        ) : (
            items.map(item => {
                const totalDebt = (item.totalValue || (item.amount * (item.installmentsCount || 1))) + (item.maintenance || 0);
                const paidAmount = (item.amount * (item.totalPaidCount || 0)) + (item.downPayment || 0);
                const remaining = Math.max(0, totalDebt - paidAmount);
                const progress = totalDebt > 0 ? Math.min(100, (paidAmount / totalDebt) * 100) : 0;
                const isFinished = (item.totalPaidCount || 0) >= (item.installmentsCount || 1);
                
                // Finish Date Calculation
                const finishDate = calculateEndDate(item.startDate || item.nextDueDate, item.installmentsCount || 1, item.frequency);

                // Frequency text
                let freqText = 'شهري';
                if(item.frequency === 'quarterly') freqText = 'ربع سنوي';
                if(item.frequency === 'semi_annual') freqText = 'نصف سنوي';
                if(item.frequency === 'yearly') freqText = 'سنوي';

                return (
                    <div key={item.id} className={`bg-white rounded-2xl shadow-sm border p-4 md:p-5 transition-all ${isFinished ? 'border-gray-200 opacity-70 bg-gray-50' : 'border-gray-100 hover:shadow-md'}`}>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-3">
                             <div className="flex items-center gap-3 w-full">
                                 <div className={`p-2.5 rounded-xl shrink-0 ${isFinished ? 'bg-gray-200 text-gray-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                     {isFinished ? <CheckSquare size={20} /> : <PieChart size={20} />}
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`font-bold text-lg leading-tight ${isFinished ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.title}</h3>
                                     <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                         <span className="flex items-center gap-1"><Calendar size={10}/> {freqText}</span>
                                         {!isFinished && <span>• القادم: {new Date(item.nextDueDate).toLocaleDateString('ar-EG')}</span>}
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex gap-2 self-end md:self-auto w-full md:w-auto justify-end">
                                 {!isFinished && (
                                     <button onClick={() => onProcess(item)} title="دفع القسط الحالي" className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                                         <CheckSquare size={18} />
                                     </button>
                                 )}
                                 <button onClick={() => handleEdit(item)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors">
                                     <Save size={18} /> 
                                 </button>
                                 <button onClick={() => onDelete(item.id)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                                     <Trash2 size={18} />
                                 </button>
                             </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">التقدم</span>
                                <span className="font-bold text-indigo-600">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${getProgressColor(progress)} transition-all duration-1000`} style={{width: `${progress}%`}}></div>
                            </div>
                        </div>

                        {/* Stats Grid - Vertical on Mobile */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-xl p-3 mb-3">
                            <div>
                                <p className="text-[10px] text-gray-400 mb-1">المدفوع</p>
                                <p className="text-sm font-bold text-green-600">{paidAmount.toLocaleString()}</p>
                            </div>
                            <div className="border-x border-gray-200 px-1">
                                <p className="text-[10px] text-gray-400 mb-1">المتبقي</p>
                                <p className="text-sm font-bold text-orange-600">{remaining.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 mb-1">الإجمالي</p>
                                <p className="text-sm font-bold text-gray-800">{totalDebt.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Footer Details */}
                        <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-50 pt-3 flex-wrap gap-2">
                            <div className="flex gap-4">
                                <span className="font-bold text-gray-800">{item.amount.toLocaleString()} {CURRENCY}/قسط</span>
                            </div>
                            
                            {/* Estimated Finish Date */}
                            {!isFinished && finishDate && (
                                <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg" title="تاريخ انتهاء القسط المتوقع">
                                    <Flag size={10} fill="currentColor" />
                                    <span className="text-[10px] font-bold">انتهاء: {finishDate}</span>
                                </div>
                            )}
                        </div>

                        {isFinished && <div className="mt-3 text-center text-green-600 font-bold text-sm bg-green-50 py-1.5 rounded-lg border border-green-100">تم الانتهاء من السداد بالكامل 🎉</div>}

                    </div>
                );
            })
        )}
      </div>

    </div>
  );
};

export default InstallmentsManager;
