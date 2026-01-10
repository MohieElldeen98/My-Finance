import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Save, Calendar, FileText, CreditCard, X } from 'lucide-react';
import { CATEGORY_LABELS, PAYMENT_METHODS } from '../constants';
import { ParsedTransaction, TransactionType, Transaction } from '../types';

interface ManualEntryFormProps {
  onSubmit: (data: ParsedTransaction, date: string) => void;
  initialData?: Transaction;
  onCancel?: () => void;
}

const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSubmit, initialData, onCancel }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('food');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');

  // Populate form when initialData changes (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
      setNote(initialData.note);
      setPaymentMethod(initialData.paymentMethod);
    } else {
      // Reset defaults if needed
      setType('expense');
      setAmount('');
      setCategory('food');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setPaymentMethod('cash');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const transactionData: ParsedTransaction = {
      amount: Number(amount),
      currency: 'ج.م',
      type,
      category,
      note: note || (type === 'income' ? 'دخل إضافي' : 'مصروفات متنوعة'),
      paymentMethod
    };

    onSubmit(transactionData, date);

    // Only reset if not editing (because modal will close on edit)
    if (!initialData) {
      setAmount('');
      setNote('');
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-fade-in ${initialData ? 'shadow-2xl border-green-500 ring-4 ring-green-50' : ''}`}>
      
      {initialData && (
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
           <h3 className="font-bold text-gray-800 text-lg">تعديل العملية</h3>
           {onCancel && (
             <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
               <X size={24} />
             </button>
           )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Type Selection */}
        <div className="flex gap-4 mb-2">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
              type === 'expense' 
                ? 'border-red-500 bg-red-50 text-red-700 font-bold' 
                : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ArrowDownCircle size={20} />
            مصروف
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
              type === 'income' 
                ? 'border-green-500 bg-green-50 text-green-700 font-bold' 
                : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ArrowUpCircle size={20} />
            دخل
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">المبلغ</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-lg"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">القسم</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1 relative">
            <label className="text-xs text-gray-500 font-medium">التاريخ</label>
            <div className="relative">
                <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">طريقة الدفع</label>
             <div className="relative">
                <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                >
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
                </select>
                <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1 relative">
           <label className="text-xs text-gray-500 font-medium">ملاحظات (اختياري)</label>
           <div className="relative">
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="وصف العملية..."
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
                <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
           </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 p-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {initialData ? 'حفظ التعديلات' : 'حفظ العملية'}
          </button>
          
          {onCancel && (
            <button
                type="button"
                onClick={onCancel}
                className="p-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
                إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ManualEntryForm;