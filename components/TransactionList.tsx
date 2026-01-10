import React from 'react';
import { Transaction } from '../types';
import { CATEGORY_LABELS, CURRENCY } from '../constants';
import { Trash2, CreditCard, Banknote, Smartphone, Pencil } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit }) => {
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard size={14} />;
      case 'wallet': return <Smartphone size={14} />;
      default: return <Banknote size={14} />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-800">سجل العمليات</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">التاريخ</th>
              <th className="px-6 py-4 font-medium">القسم</th>
              <th className="px-6 py-4 font-medium">ملاحظات</th>
              <th className="px-6 py-4 font-medium">طريقة الدفع</th>
              <th className="px-6 py-4 font-medium">المبلغ</th>
              <th className="px-6 py-4 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">لا توجد بيانات</td>
                </tr>
            ) : (
                transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(t.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {CATEGORY_LABELS[t.category]}
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
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;