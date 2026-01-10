import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List, PieChart as PieChartIcon, MessageSquareText, Target, CalendarClock, Sparkles, PenTool, FileBarChart, Trash2, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';

import Dashboard from './components/Dashboard';
import SmartEntry from './components/SmartEntry';
import ManualEntryForm from './components/ManualEntryForm';
import FinancialAdvisor from './components/FinancialAdvisor';
import TransactionList from './components/TransactionList';
import GoalTracker from './components/GoalTracker';
import RecurringManager from './components/RecurringManager';
import Reports from './components/Reports';
import Login from './components/Login';
import { Transaction, ParsedTransaction, FinancialGoal, RecurringTransaction } from './types';
import { CURRENCY } from './constants';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'advisor' | 'goals' | 'recurring'>('dashboard');
  const [entryMode, setEntryMode] = useState<'smart' | 'manual'>('smart');
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'transaction' | 'goal' | 'recurring' } | null>(null);
  
  // Data State (Synced from Firestore)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Sync Listeners (Firestore)
  useEffect(() => {
    if (!user) {
        setTransactions([]);
        setGoals([]);
        setRecurringItems([]);
        return;
    }

    setIsDataLoading(true);

    // Sync Transactions
    const qTransactions = query(collection(db, 'transactions'), where('userId', '==', user.uid)); 
    // Note: 'orderBy' requires an index in Firestore if combined with 'where'. 
    // For simplicity, we sort client-side, or you can create the index in Firebase Console.
    
    const unsubTrans = onSnapshot(qTransactions, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        // Sort by date desc
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(data);
        setIsDataLoading(false);
    });

    // Sync Goals
    const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialGoal));
        setGoals(data);
    });

    // Sync Recurring
    const qRecurring = query(collection(db, 'recurring'), where('userId', '==', user.uid));
    const unsubRecurring = onSnapshot(qRecurring, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTransaction));
        setRecurringItems(data);
    });

    return () => {
        unsubTrans();
        unsubGoals();
        unsubRecurring();
    };
  }, [user]);


  // Notification System Logic (Local check based on synced data)
  useEffect(() => {
    const checkUpcomingDueDates = async () => {
      if (!('Notification' in window)) return;
      // ... same logic ...
      // Just check permissions once
      if (Notification.permission === 'default') {
         await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      recurringItems.forEach(item => {
          if (!item.active) return;
          const storageKey = `notified_${item.id}_${new Date().toDateString()}`;
          if (sessionStorage.getItem(storageKey)) return;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(item.nextDueDate);
          due.setHours(0, 0, 0, 0);
          const diffTime = due.getTime() - today.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysLeft > 0 && daysLeft <= 3) {
             new Notification(item.type === 'expense' ? '⚠️ تذكير بالدفع' : '💰 اقترب موعد الدخل', {
               body: `متبقي ${daysLeft} أيام على موعد "${item.title}". القيمة: ${item.amount} ${CURRENCY}`,
               tag: item.id,
               lang: 'ar'
             });
             sessionStorage.setItem(storageKey, 'true');
          }
      });
    };
    if (user) checkUpcomingDueDates();
  }, [recurringItems, user]);


  // --- Handlers (Firestore CRUD) ---

  const handleSmartTransaction = async (data: ParsedTransaction, dateStr?: string) => {
    if (!user) return;
    try {
        await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            ...data,
            note: data.note || 'عملية جديدة'
        });
        // No need to setTransactions, onSnapshot handles it
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("حدث خطأ في الحفظ، تأكد من الاتصال بالإنترنت");
    }
  };

  const handleManualTransaction = async (data: ParsedTransaction, date: string) => {
    if (!user) return;
    try {
        await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            date: new Date(date).toISOString(),
            ...data,
            note: data.note || (data.type === 'income' ? 'دخل' : 'مصروف')
        });
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("حدث خطأ في الحفظ");
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setItemToDelete({ id, type: 'transaction' });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleUpdateTransaction = async (data: ParsedTransaction, date: string) => {
    if (!editingTransaction || !user) return;
    try {
        const txRef = doc(db, 'transactions', editingTransaction.id);
        await updateDoc(txRef, {
            ...data,
            date: new Date(date).toISOString()
        });
        setEditingTransaction(null);
    } catch (e) {
        console.error("Error updating document: ", e);
        alert("فشل التعديل");
    }
  };

  // Goals
  const handleAddGoal = async (goal: FinancialGoal) => {
     if (!user) return;
     // Note: goal.id passed from UI is timestamp, but Firestore creates its own ID.
     // We can just spread the data.
     const { id, ...goalData } = goal;
     await addDoc(collection(db, 'goals'), { ...goalData, userId: user.uid });
  };

  const handleUpdateGoal = async (updatedGoal: FinancialGoal) => {
     if (!user) return;
     const goalRef = doc(db, 'goals', updatedGoal.id);
     const { id, ...goalData } = updatedGoal;
     await updateDoc(goalRef, goalData);
  };

  const handleDeleteGoal = (id: string) => {
    setItemToDelete({ id, type: 'goal' });
  };

  // Recurring
  const handleAddRecurring = async (item: RecurringTransaction) => {
    if (!user) return;
    const { id, ...itemData } = item;
    await addDoc(collection(db, 'recurring'), { ...itemData, userId: user.uid });
  };

  const handleUpdateRecurring = async (updatedItem: RecurringTransaction) => {
    if (!user) return;
    const itemRef = doc(db, 'recurring', updatedItem.id);
    const { id, ...itemData } = updatedItem;
    await updateDoc(itemRef, itemData);
  };

  const handleDeleteRecurring = (id: string) => {
    setItemToDelete({ id, type: 'recurring' });
  };

  const handleProcessRecurring = async (item: RecurringTransaction) => {
    if (!user) return;
    
    // 1. Create Transaction
    await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: item.amount,
        currency: 'ج.م',
        type: item.type,
        category: item.category,
        date: new Date().toISOString(),
        note: `دفع تلقائي: ${item.title}`,
        paymentMethod: 'cash'
    });

    // 2. Update Recurring Date
    const currentDueDate = new Date(item.nextDueDate);
    let nextDate = new Date(currentDueDate);
    if (item.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (item.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (item.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const itemRef = doc(db, 'recurring', item.id);
    await updateDoc(itemRef, { nextDueDate: nextDate.toISOString().split('T')[0] });

    alert(`تم تسجيل عملية "${item.title}" بنجاح وتحديث الموعد القادم.`);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !user) return;

    try {
        if (itemToDelete.type === 'transaction') {
            await deleteDoc(doc(db, 'transactions', itemToDelete.id));
        } else if (itemToDelete.type === 'goal') {
            await deleteDoc(doc(db, 'goals', itemToDelete.id));
        } else if (itemToDelete.type === 'recurring') {
            await deleteDoc(doc(db, 'recurring', itemToDelete.id));
        }
    } catch (e) {
        console.error("Delete failed", e);
        alert("فشل الحذف");
    }
    
    setItemToDelete(null);
  };

  const handleLogout = () => {
      signOut(auth);
  };

  // --- Render ---

  if (loadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-green-200 rounded-full mb-4"></div>
                  <div className="h-4 bg-gray-200 w-32 rounded"></div>
              </div>
          </div>
      );
  }

  if (!user) {
      return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans relative">
      
      {/* Edit Modal Overlay */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg">
             <ManualEntryForm 
                onSubmit={handleUpdateTransaction} 
                initialData={editingTransaction}
                onCancel={() => setEditingTransaction(null)}
             />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-100 transition-all border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 shadow-sm">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">هل أنت متأكد؟</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                سيتم حذف هذا العنصر نهائياً من قاعدة البيانات السحابية.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  نعم، احذف
                </button>
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-green-700">مساعدي المالي</h1>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
            <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <nav className="
        fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-10 flex justify-around p-3
        md:relative md:w-64 md:flex-col md:justify-start md:border-t-0 md:border-l md:border-gray-200 md:h-screen md:p-6 md:gap-2
      ">
        <div className="hidden md:flex items-center gap-3 mb-8 px-2">
           <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200">
             <PieChartIcon size={20} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">مساعدي المالي</h1>
             <p className="text-xs text-gray-400">متصل (Cloud Sync)</p>
           </div>
        </div>

        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <LayoutDashboard size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">الرئيسية</span>
        </button>

        <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <List size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">المعاملات</span>
        </button>

        <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FileBarChart size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">التقارير</span>
        </button>

        <button onClick={() => setActiveTab('recurring')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'recurring' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <CalendarClock size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">الثوابت</span>
        </button>
        
        <button onClick={() => setActiveTab('goals')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'goals' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Target size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">الأهداف</span>
        </button>

        <button onClick={() => setActiveTab('advisor')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'advisor' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
          <MessageSquareText size={24} className="md:w-5 md:h-5" />
          <span className="hidden md:inline">المستشار</span>
        </button>
        
        <div className="hidden md:block mt-auto">
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
                <LogOut size={20} />
                <span>خروج</span>
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header Area */}
          <div className="flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                 {activeTab === 'dashboard' && 'نظرة عامة'}
                 {activeTab === 'transactions' && 'كل المعاملات'}
                 {activeTab === 'goals' && 'الأهداف المالية'}
                 {activeTab === 'recurring' && 'الالتزامات الثابتة'}
                 {activeTab === 'advisor' && 'تحليل مالي ومساعدة'}
                 {activeTab === 'reports' && 'التقارير الشهرية'}
                 {isDataLoading && <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>}
               </h2>
               <p className="text-sm text-gray-400 mt-1">
                 {user.email}
               </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
               <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                 <span className="font-bold">AR</span>
               </button>
            </div>
          </div>

          {/* Transaction Entry Area */}
          {(activeTab === 'dashboard' || activeTab === 'transactions') && (
            <div className="mb-6">
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => setEntryMode('smart')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    entryMode === 'smart' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200' 
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles size={16} />
                  إضافة ذكية
                </button>
                <button 
                  onClick={() => setEntryMode('manual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    entryMode === 'manual' 
                      ? 'bg-gray-800 text-white shadow-lg' 
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <PenTool size={16} />
                  إضافة يدوية
                </button>
              </div>

              {entryMode === 'smart' ? (
                <SmartEntry onTransactionParsed={handleSmartTransaction} />
              ) : (
                <ManualEntryForm onSubmit={handleManualTransaction} />
              )}
            </div>
          )}

          {/* Dynamic Content */}
          <div className="transition-all duration-300">
             {activeTab === 'dashboard' && <Dashboard transactions={transactions} recurringItems={recurringItems} goals={goals} />}
             {activeTab === 'transactions' && <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} onEdit={handleEditTransaction} />}
             {activeTab === 'reports' && <Reports transactions={transactions} />}
             {activeTab === 'goals' && (
                <GoalTracker 
                  goals={goals} 
                  onAdd={handleAddGoal} 
                  onUpdate={handleUpdateGoal} 
                  onDelete={handleDeleteGoal} 
                />
             )}
             {activeTab === 'recurring' && (
               <RecurringManager 
                 items={recurringItems}
                 onAdd={handleAddRecurring}
                 onUpdate={handleUpdateRecurring}
                 onDelete={handleDeleteRecurring}
                 onProcess={handleProcessRecurring}
               />
             )}
             {activeTab === 'advisor' && <FinancialAdvisor transactions={transactions} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;