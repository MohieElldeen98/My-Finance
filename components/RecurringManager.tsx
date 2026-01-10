import React, { useState } from 'react';
import { RecurringTransaction } from '../types';
import { CURRENCY, FREQUENCY_LABELS, CATEGORY_LABELS } from '../constants';
import { CalendarClock, CheckCircle, Plus, Trash2, AlertCircle, Pencil, Save, X, Timer } from 'lucide-react';

interface RecurringManagerProps {
  items: RecurringTransaction[];
  onAdd: (item: RecurringTransaction) => void;
  onUpdate: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onProcess: (item: RecurringTransaction) => void;
}

const RecurringManager: React.FC<RecurringManagerProps> = ({ items, onAdd, onUpdate, onDelete, onProcess }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<RecurringTransaction>>({
    title: '',
    amount: 0,
    type: 'expense',
    frequency: 'monthly',
    nextDueDate: new Date().toISOString().split('T')[0],
    category: 'other'
  });

  const handleStartAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      type: 'expense',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
      category: 'other'
    });
    setShowForm(!showForm);
  };

  const handleStartEdit = (item: RecurringTransaction) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      amount: item.amount,
      type: item.type,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      category: item.category
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
    };

    if (editingId) {
      onUpdate({
        ...transactionData,
        id: editingId,
      } as RecurringTransaction);
    } else {
      onAdd({
        ...transactionData,
        id: Date.now().toString(),
      } as RecurringTransaction);
    }

    setFormData({
      title: '',
      amount: 0,
      type: 'expense',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
      category: 'other'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const isDue = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    return due <= today;
  };

  const getRemainingTime = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) return null;

    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    if (months > 0) {
      return `باقي ${months} شهر (${days} يوم)`;
    } else {
      return `باقي ${totalDays} يوم`;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-purple-600" />
              الالتزامات الثابتة
            </h2>
            <p className="text-sm text-gray-400">إدارة الرواتب، الأقساط، والاشتراكات الدورية</p>
         </div>
         <button 
           onClick={handleStartAdd}
           className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
         >
           {showForm && !editingId ? 'إلغاء' : 'التزام جديد'}
           {!(showForm && !editingId) && <Plus size={18} />}
         </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
          <div className="col-span-1 md:col-span-2 flex justify-between items-center">
             <h3 className={`font-bold ${editingId ? 'text-blue-700' : 'text-gray-700'}`}>
               {editingId ? 'تعديل الالتزام' : 'إضافة عملية دورية جديدة'}
             </h3>
             {editingId && (
               <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                 <X size={20} />
               </button>
             )}
          </div>
          
          <input 
            type="text" 
            placeholder="اسم الالتزام (مثال: إيجار، راتب)" 
            className="p-3 bg-white rounded-xl border border-gray-200"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />

          <input 
            type="number" 
            placeholder="المبلغ" 
            className="p-3 bg-white rounded-xl border border-gray-200"
            value={formData.amount || ''}
            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
            required
          />

          <select 
            className="p-3 bg-white rounded-xl border border-gray-200"
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value as any})}
          >
            <option value="expense">مصروف (التزام علي)</option>
            <option value="income">دخل (راتب ثابت)</option>
          </select>

          <select 
            className="p-3 bg-white rounded-xl border border-gray-200"
            value={formData.frequency}
            onChange={e => setFormData({...formData, frequency: e.target.value as any})}
          >
            <option value="monthly">شهري</option>
            <option value="quarterly">ربع سنوي (كل 3 شهور)</option>
            <option value="yearly">سنوي</option>
          </select>
          
           <select 
            className="p-3 bg-white rounded-xl border border-gray-200"
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1 mr-1">تاريخ الاستحقاق القادم</label>
            <input 
                type="date" 
                className="p-3 bg-white rounded-xl border border-gray-200"
                value={formData.nextDueDate}
                onChange={e => setFormData({...formData, nextDueDate: e.target.value})}
                required
            />
          </div>

          <button type="submit" className={`col-span-1 md:col-span-2 text-white p-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {editingId ? <Save size={18} /> : <Plus size={18} />}
            {editingId ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </form>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {items.map(item => {
            const due = isDue(item.nextDueDate);
            const remainingTime = getRemainingTime(item.nextDueDate);

            return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${due ? 'border-orange-200 bg-orange-50' : 'border-gray-100'} flex flex-col md:flex-row justify-between items-center gap-4`}>
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-full ${item.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <CalendarClock size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{item.title}</h3>
                            <div className="flex gap-2 text-sm text-gray-500 mt-1 mb-2">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{FREQUENCY_LABELS[item.frequency]}</span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{CATEGORY_LABELS[item.category]}</span>
                            </div>
                            
                            {due ? (
                                <p className="text-sm font-bold text-orange-600 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    مستحق الدفع الآن!
                                </p>
                            ) : (
                                <div className="text-sm text-gray-500">
                                    <p>موعدنا: {new Date(item.nextDueDate).toLocaleDateString('ar-EG')}</p>
                                    {remainingTime && (
                                        <p className="text-blue-600 font-medium text-xs mt-1 flex items-center gap-1 bg-blue-50 w-fit px-2 py-1 rounded-md">
                                            <Timer size={12} />
                                            {remainingTime}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-xl font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.amount.toLocaleString()} {CURRENCY}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {due ? (
                            <button 
                                onClick={() => onProcess(item)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 shadow-md shadow-green-200 transition-all animate-pulse"
                            >
                                <CheckCircle size={18} />
                                {item.type === 'income' ? 'استلام الدخل' : 'تسديد الآن'}
                            </button>
                        ) : (
                             <div className="px-4 py-2 text-gray-400 text-sm flex items-center gap-1">
                                <AlertCircle size={14} />
                                <span>في الانتظار</span>
                             </div>
                        )}
                        <div className="flex bg-gray-50 rounded-lg border border-gray-100">
                          <button 
                              onClick={() => handleStartEdit(item)}
                              className="p-2 text-gray-400 hover:text-blue-500 transition-colors border-l border-gray-200"
                              title="تعديل"
                          >
                              <Pencil size={18} />
                          </button>
                          <button 
                              onClick={() => onDelete(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="حذف"
                          >
                              <Trash2 size={18} />
                          </button>
                        </div>
                    </div>
                </div>
            );
        })}

        {items.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                لا توجد التزامات مسجلة.
            </div>
        )}
      </div>
    </div>
  );
};

export default RecurringManager;