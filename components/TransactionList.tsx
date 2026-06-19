
import React from 'react';
import { Transaction } from '../types';
import { CURRENCY } from '../constants';
import { Trash2, CreditCard, Banknote, Smartphone, Pencil, Clock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useCategoryInfo } from '../context/GlobalSettings';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit }) => {
  const getCategoryInfo = useCategoryInfo();

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard size={14} />;
      case 'wallet': return <Smartphone size={14} />;
      default: return <Banknote size={14} />;
    }
  };

  if (transactions.length === 0) {
      return (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center text-gray-400">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                  <Banknote size={32} className="opacity-50" />
              </div>
              <p>لا توجد عمليات مسجلة حتى الآن</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-bold text-gray-800">سجل العمليات</h3>
        <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-lg">الأحدث أولاً</span>
      </div>

      {/* --- MOBILE VIEW (CARDS) --- */}
      <div className="md:hidden space-y-3">
          {transactions.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-[0.99] transition-transform">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-gray-800 text-sm">{getCategoryInfo(t.category).label}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${getCategoryInfo(t.category).color}`}>
                                      {t.category === 'installments' ? 'قسط' : 'عام'}
                                  </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.note || 'بدون ملاحظات'}</p>
                          </div>
                      </div>
                      <div className="text-left">
                          <span className={`block font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                              {t.amount.toLocaleString()} <span className="text-xs font-normal text-gray-400">{CURRENCY}</span>
                          </span>
                      </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-1">
                      <div className="flex gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(t.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="flex items-center gap-1">
                              {getPaymentIcon(t.paymentMethod)}
                              {t.paymentMethod === 'card' ? 'فيزا' : t.paymentMethod === 'wallet' ? 'محفظة' : 'كاش'}
                          </span>
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => onEdit(t)} 
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                          >
                              <Pencil size={14} />
                          </button>
                          <button 
                              onClick={() => onDelete(t.id)} 
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                <th className="px-6 py-4 font-medium">التاريخ / الوقت</th>
                <th className="px-6 py-4 font-medium">القسم</th>
                <th className="px-6 py-4 font-medium">ملاحظات</th>
                <th className="px-6 py-4 font-medium">طريقة الدفع</th>
                <th className="px-6 py-4 font-medium">المبلغ</th>
                <th className="px-6 py-4 font-medium">إجراء</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                            <span className="font-bold">{new Date(t.date).toLocaleDateString('ar-EG')}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                    <Clock size={10} />
                                    {new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getCategoryInfo(t.category).color}`}>
                            {getCategoryInfo(t.category).label}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                        {t.note || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            {getPaymentIcon(t.paymentMethod)}
                            <span>{t.paymentMethod === 'card' ? 'فيزا' : t.paymentMethod === 'wallet' ? 'محفظة' : 'كاش'}</span>
                        </div>
                        </td>
                        <td className={`px-6 py-4 font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount} {CURRENCY}
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                            <button 
                                type="button"
                                onClick={() => onEdit(t)}
                                className="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                title="تعديل"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => onDelete(t.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                title="حذف"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        </td>
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
