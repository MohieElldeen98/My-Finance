import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowRight, Trash2, Loader2, DollarSign, Target, CalendarClock } from 'lucide-react';
import { Transaction, FinancialGoal, RecurringTransaction } from '../types';

interface AdminUserDetailProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

const AdminUserDetail: React.FC<AdminUserDetailProps> = ({ userId, userName, onBack }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'goals' | 'recurring'>('transactions');
  const [loading, setLoading] = useState(true);

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const q = query(collection(db, 'transactions'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      else if (activeTab === 'goals') {
        const q = query(collection(db, 'goals'), where('userId', '==', userId));
        const snap = await getDocs(q);
        setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialGoal)));
      }
      else if (activeTab === 'recurring') {
        const q = query(collection(db, 'recurring'), where('userId', '==', userId));
        const snap = await getDocs(q);
        setRecurring(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringTransaction)));
      }
    } catch(e) {
      console.error(e);
      alert("Error fetching user details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, collectionName, id));
      if (collectionName === 'transactions') {
        setTransactions(prev => prev.filter(item => item.id !== id));
      } else if (collectionName === 'goals') {
        setGoals(prev => prev.filter(item => item.id !== id));
      } else if (collectionName === 'recurring') {
        setRecurring(prev => prev.filter(item => item.id !== id));
      }
    } catch(e) {
        console.error(e);
        alert("حدث خطأ أثناء الحذف");
    } finally {
        setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
          <ArrowRight size={20} />
        </button>
        <div>
           <h2 className="text-xl font-bold text-gray-800">بيانات المستخدم: {userName}</h2>
           <p className="text-sm text-gray-500">ID: {userId}</p>
        </div>
      </div>

      <div className="flex gap-2">
         {[
           { id: 'transactions', label: 'المعاملات', icon: DollarSign },
           { id: 'goals', label: 'الأهداف', icon: Target },
           { id: 'recurring', label: 'الالتزامات', icon: CalendarClock },
         ].map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
             >
                <tab.icon size={18} />
                {tab.label}
             </button>
         ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {loading ? (
             <div className="flex justify-center items-center h-40">
                 <Loader2 className="animate-spin text-blue-600" size={32} />
             </div>
        ) : (
            <div className="overflow-x-auto">
               {activeTab === 'transactions' && (
                   <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-500">
                           <tr>
                               <th className="p-3">التاريخ</th>
                               <th className="p-3">النوع</th>
                               <th className="p-3">الفئة</th>
                               <th className="p-3">القيمة</th>
                               <th className="p-3">الوصف</th>
                               <th className="p-3 text-center">إجراء</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {transactions.map(t => (
                               <tr key={t.id} className="hover:bg-gray-50">
                                   <td className="p-3 font-mono">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                   <td className="p-3">{t.type === 'expense' ? 'مصروف' : 'دخل'}</td>
                                   <td className="p-3">{t.category}</td>
                                   <td className={`p-3 font-bold ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>{t.amount}</td>
                                   <td className="p-3">{t.note}</td>
                                   <td className="p-3 text-center">
                                      <button onClick={() => handleDelete('transactions', t.id!)} disabled={deletingId === t.id} className="text-red-500 hover:text-red-700 disabled:opacity-50">
                                          {deletingId === t.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                      </button>
                                   </td>
                               </tr>
                           ))}
                           {transactions.length === 0 && <tr><td colSpan={6} className="text-center p-6 text-gray-400">لا يوجد بيانات</td></tr>}
                       </tbody>
                   </table>
               )}

               {activeTab === 'goals' && (
                   <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-500">
                           <tr>
                               <th className="p-3">الهدف</th>
                               <th className="p-3">المبلغ المستهدف</th>
                               <th className="p-3">المدخر</th>
                               <th className="p-3">تاريخ الانتهاء</th>
                               <th className="p-3 text-center">إجراء</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {goals.map(g => (
                               <tr key={g.id} className="hover:bg-gray-50">
                                   <td className="p-3 font-bold">{g.title}</td>
                                   <td className="p-3 text-blue-600 font-bold">{g.targetAmount}</td>
                                   <td className="p-3 text-green-600 font-bold">{g.savedAmount}</td>
                                   <td className="p-3">{g.deadline ? new Date(g.deadline).toLocaleDateString('ar-EG') : 'بدون'}</td>
                                   <td className="p-3 text-center">
                                      <button onClick={() => handleDelete('goals', g.id!)} disabled={deletingId === g.id} className="text-red-500 hover:text-red-700 disabled:opacity-50">
                                          {deletingId === g.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                      </button>
                                   </td>
                               </tr>
                           ))}
                           {goals.length === 0 && <tr><td colSpan={5} className="text-center p-6 text-gray-400">لا يوجد أهداف</td></tr>}
                       </tbody>
                   </table>
               )}

               {activeTab === 'recurring' && (
                   <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-500">
                           <tr>
                               <th className="p-3">الاسم</th>
                               <th className="p-3">النوع</th>
                               <th className="p-3">القيمة</th>
                               <th className="p-3">التكرار</th>
                               <th className="p-3">تاريخ الاستحقاق</th>
                               <th className="p-3 text-center">إجراء</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {recurring.map(r => (
                               <tr key={r.id} className="hover:bg-gray-50">
                                   <td className="p-3 font-bold">{r.title}</td>
                                   <td className="p-3">{r.type === 'expense' ? 'مصروف' : 'دخل'}</td>
                                   <td className="p-3 font-bold">{r.amount}</td>
                                   <td className="p-3">{r.interval}</td>
                                   <td className="p-3">{new Date(r.nextDueDate).toLocaleDateString('ar-EG')}</td>
                                   <td className="p-3 text-center">
                                      <button onClick={() => handleDelete('recurring', r.id!)} disabled={deletingId === r.id} className="text-red-500 hover:text-red-700 disabled:opacity-50">
                                          {deletingId === r.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                      </button>
                                   </td>
                               </tr>
                           ))}
                           {recurring.length === 0 && <tr><td colSpan={6} className="text-center p-6 text-gray-400">لا يوجد التزامات</td></tr>}
                       </tbody>
                   </table>
               )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserDetail;
