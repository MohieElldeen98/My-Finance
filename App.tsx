
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, List, PieChart as PieChartIcon, MessageSquareText, Target, CalendarClock, Sparkles, PenTool, FileBarChart, Trash2, LogOut, Loader2, Layers, ChevronLeft, ChevronRight, Menu, X, RefreshCw, User as UserIcon, TrendingUp } from 'lucide-react';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';

import Dashboard from './components/Dashboard';
import SmartEntry from './components/SmartEntry';
import ManualEntryForm from './components/ManualEntryForm';
import FinancialAdvisor from './components/FinancialAdvisor';
import TransactionList from './components/TransactionList';
import GoalTracker from './components/GoalTracker';
import RecurringManager from './components/RecurringManager';
import InstallmentsManager from './components/InstallmentsManager';
import SavingsManager from './components/SavingsManager'; 
import Reports from './components/Reports';
import Login from './components/Login'; 
import AdminDashboard from './components/AdminDashboard'; 
import Profile from './components/Profile'; 
import { Transaction, ParsedTransaction, FinancialGoal, RecurringTransaction, UserProfile } from './types';
import { CURRENCY } from './constants';
import { useGlobalSettings } from './context/GlobalSettings';

function App() {
  const { enableAIEntry, hiddenTabs, tabOrder, customTabNames, settings } = useGlobalSettings();

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined); 
  const [loadingAuth, setLoadingAuth] = useState(true);
  const isAIEnabled = settings?.isAIEnabled ?? true; // إذا لم يجدها سيجعلها مفعلة تلقائياً كاحتياط
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'advisor' | 'goals' | 'recurring' | 'installments' | 'savings' | 'profile'>('dashboard');
  
  // Entry Mode can be null (hidden), 'smart' or 'manual'
  const [entryMode, setEntryMode] = useState<'smart' | 'manual' | null>(null);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'transaction' | 'goal' | 'recurring' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Data State (Synced from Firestore)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
          // Fetch Extended Profile (Gender, etc.)
          try {
              const userRef = doc(db, 'users', currentUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                  setUserProfile(snap.data() as UserProfile);
              }
          } catch (e) {
              console.error("Profile fetch error", e);
          }
      } else {
          setUserProfile(undefined);
      }
      
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

    // SKIP SYNC IF ADMIN
    const isAdmin = user.email?.toLowerCase() === 'mohieelldeenahmed@gmail.com';
    if (isAdmin) {
      return; 
    }

    setIsDataLoading(true);

    // Sync Transactions
    const qTransactions = query(collection(db, 'transactions'), where('userId', '==', user.uid)); 
    
    const unsubTrans = onSnapshot(qTransactions, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
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

  // Global side effects
  useEffect(() => {
    if (!enableAIEntry && entryMode === 'smart') {
      setEntryMode(null);
    }
  }, [enableAIEntry, entryMode]);

  // Separate Recurring items into: Subscriptions (Bills) vs Installments (Debt)
  const { subscriptions, installments } = useMemo(() => {
      const subs: RecurringTransaction[] = [];
      const insts: RecurringTransaction[] = [];
      recurringItems.forEach(item => {
          if (item.installmentsCount && item.installmentsCount > 0) {
              insts.push(item);
          } else {
              subs.push(item);
          }
      });
      return { subscriptions: subs, installments: insts };
  }, [recurringItems]);


  // Notification System Logic
  useEffect(() => {
    if (!user) return;
    const isAdmin = user.email?.toLowerCase() === 'mohieelldeenahmed@gmail.com';
    if (isAdmin) return; 

    const checkUpcomingDueDates = async () => {
      if (!('Notification' in window)) return;
      
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
    checkUpcomingDueDates();
  }, [recurringItems, user]);


  // --- Handlers (Firestore CRUD) ---
  const handleRefresh = () => {
      window.location.reload();
  };
  
  const createDateWithCurrentTime = (dateStr: string) => {
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    return newDate.toISOString();
  };
  
  const createDateWithPreservedTime = (newDateStr: string, originalIsoString: string) => {
      const originalDate = new Date(originalIsoString);
      const [y, m, d] = newDateStr.split('-').map(Number);
      const newDate = new Date(y, m - 1, d, originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
      return newDate.toISOString();
  };

  const handleSmartTransaction = async (data: ParsedTransaction, dateStr?: string) => {
    if (!user) return;
    try {
        const finalDate = dateStr 
            ? createDateWithCurrentTime(dateStr) 
            : new Date().toISOString();

        await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            date: finalDate,
            ...data,
            note: data.note || 'عملية جديدة'
        });
        setEntryMode(null); 
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("حدث خطأ في الحفظ، تأكد من الاتصال بالإنترنت");
    }
  };

  const handleManualTransaction = async (data: ParsedTransaction, dateOnly: string) => {
    if (!user) return;
    try {
        const finalDate = createDateWithCurrentTime(dateOnly);

        await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            date: finalDate,
            ...data,
            note: data.note || (data.type === 'income' ? 'دخل' : 'مصروف')
        });
        setEntryMode(null); 
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
    if (!editingTransaction) return;
    try {
        const txRef = doc(db, 'transactions', editingTransaction.id);
        const finalDate = createDateWithPreservedTime(date, editingTransaction.date);
        await updateDoc(txRef, {
            ...data,
            date: finalDate 
        });
        setEditingTransaction(null);
    } catch (e) {
        console.error("Error updating document: ", e);
        alert("فشل التعديل");
    }
  };

  const handleAddGoal = async (goal: FinancialGoal) => {
     if (!user) return;
     const { id, ...goalData } = goal;
     await addDoc(collection(db, 'goals'), { ...goalData, userId: user.uid });
  };

  const handleUpdateGoal = async (updatedGoal: FinancialGoal) => {
     const goalRef = doc(db, 'goals', updatedGoal.id);
     const { id, ...goalData } = updatedGoal;
     await updateDoc(goalRef, goalData);
  };

  const handleDeleteGoal = (id: string) => {
    setItemToDelete({ id, type: 'goal' });
  };

  const handleAddRecurring = async (item: RecurringTransaction) => {
    if (!user) return;
    const { id, ...itemData } = item;
    const dataToSave = {
        ...itemData,
        startDate: itemData.startDate || itemData.nextDueDate,
        installmentsCount: itemData.installmentsCount || 0,
        totalPaidCount: itemData.totalPaidCount || 0,
        userId: user.uid
    };
    await addDoc(collection(db, 'recurring'), dataToSave);
  };

  const handleUpdateRecurring = async (updatedItem: RecurringTransaction) => {
    const itemRef = doc(db, 'recurring', updatedItem.id);
    const { id, ...itemData } = updatedItem;
    await updateDoc(itemRef, itemData);
  };

  const handleDeleteRecurring = (id: string) => {
    setItemToDelete({ id, type: 'recurring' });
  };

  const handleProcessRecurring = async (item: RecurringTransaction) => {
    if (!user) return;
    
    const currentCount = (item.totalPaidCount || 0) + 1;
    let noteText = `دفع تلقائي: ${item.title}`;
    if (item.installmentsCount && item.installmentsCount > 0) {
        noteText += ` (قسط ${currentCount} من ${item.installmentsCount})`;
    }

    await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: item.amount,
        currency: 'ج.م',
        type: item.type,
        category: item.category,
        date: new Date().toISOString(),
        note: noteText,
        paymentMethod: 'cash',
        recurringId: item.id
    });

    const itemRef = doc(db, 'recurring', item.id);

    if (item.isOneTime) {
        await updateDoc(itemRef, { active: false, savedAmount: 0 });
    } else {
        const currentDueDate = new Date(item.nextDueDate);
        let nextDate = new Date(currentDueDate);
        
        if (item.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (item.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (item.frequency === 'semi_annual') nextDate.setMonth(nextDate.getMonth() + 6);
        else if (item.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        let isActive = true;
        let newTotalPaid = (item.totalPaidCount || 0) + 1;

        if (item.installmentsCount && item.installmentsCount > 0) {
            if (newTotalPaid >= item.installmentsCount) {
                isActive = false; 
            }
        }

        await updateDoc(itemRef, { 
            nextDueDate: nextDate.toISOString(),
            totalPaidCount: newTotalPaid,
            active: isActive,
            savedAmount: 0 // تم تسديد الالتزام، تصفير الحصالة للمرة القادمة تلقائياً
        });
    }
  };

  const confirmDelete = async () => {
     if (!itemToDelete) return;
     setIsDeleting(true);
     try {
       if (itemToDelete.type === 'transaction') {
           await deleteDoc(doc(db, 'transactions', itemToDelete.id));
       } else if (itemToDelete.type === 'goal') {
           await deleteDoc(doc(db, 'goals', itemToDelete.id));
       } else if (itemToDelete.type === 'recurring') {
           await deleteDoc(doc(db, 'recurring', itemToDelete.id));
       }
     } catch (e) {
       console.error(e);
       alert("حدث خطأ أثناء الحذف");
     } finally {
       setIsDeleting(false);
       setItemToDelete(null);
     }
  };

  const toggleEntryMode = (mode: 'smart' | 'manual') => {
      if (entryMode === mode) setEntryMode(null);
      else setEntryMode(mode);
  };

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.email?.toLowerCase() === 'mohieelldeenahmed@gmail.com') {
    return <AdminDashboard user={user} />;
  }

  const userDisplayName = user.displayName || user.email?.split('@')[0] || 'المستخدم';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0" dir="rtl">
      
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
              <h3 className="font-bold text-lg mb-2 text-gray-800">تأكيد الحذف</h3>
              <p className="text-gray-500 mb-6">هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                 <button 
                   onClick={confirmDelete} 
                   disabled={isDeleting}
                   className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                   {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف'}
                 </button>
                 <button 
                   onClick={() => setItemToDelete(null)} 
                   disabled={isDeleting}
                   className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex w-full">
        
        <div 
            className={`hidden md:flex flex-col bg-white border-l border-gray-200 h-screen sticky top-0 p-4 shrink-0 z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20 items-center' : 'w-64'}`}
        >
          <div className={`flex items-center gap-3 px-2 mb-8 mt-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
             <div className="bg-green-600 p-2 rounded-lg shrink-0">
                <Sparkles className="text-white w-6 h-6" />
             </div>
             {!isSidebarCollapsed && (
                 <div className="animate-fade-in">
                    <h1 className="font-bold text-xl text-gray-800">مساعدي المالي</h1>
                    <p className="text-xs text-gray-400">إصدار الويب الذكي</p>
                 </div>
             )}
          </div>
          
          <nav className="flex-1 space-y-2 w-full">
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
              { id: 'transactions', label: 'تسجيل المعاملات', icon: List },
              { id: 'savings', label: 'الادخار', icon: TrendingUp }, 
              { id: 'recurring', label: 'التزامات', icon: CalendarClock },
              { id: 'installments', label: 'الأقساط', icon: Layers }, 
              { id: 'reports', label: 'التقارير', icon: FileBarChart },
              { id: 'advisor', label: 'المحلل الذكي', icon: MessageSquareText },
              { id: 'goals', label: 'الأهداف', icon: Target },
              { id: 'profile', label: 'الملف الشخصي', icon: UserIcon }, 
            ].filter(item => !hiddenTabs.includes(item.id))
             .sort((a,b) => {
                 const orderA = tabOrder?.indexOf(a.id) ?? -1;
                 const orderB = tabOrder?.indexOf(b.id) ?? -1;
                 return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
             })
             .map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  activeTab === item.id 
                    ? 'bg-green-50 text-green-700 font-bold shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? (customTabNames?.[item.id] || item.label) : ''}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id && isSidebarCollapsed ? 'text-green-600' : ''}`} />
                {!isSidebarCollapsed && <span>{customTabNames?.[item.id] || item.label}</span>}
                {isSidebarCollapsed && (
                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        {customTabNames?.[item.id] || item.label}
                    </div>
                )}
              </button>
            ))}
          </nav>

          <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="mt-4 mb-4 mx-auto p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
              {isSidebarCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>

          <div className="mt-auto pt-4 border-t border-gray-100 w-full">
             {!isSidebarCollapsed ? (
                 <div className="flex items-center gap-3 px-2 mb-4 animate-fade-in cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors" onClick={() => setActiveTab('profile')}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 overflow-hidden border border-blue-200">
                       {user.photoURL ? (
                           <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                       ) : (
                           user.email?.[0].toUpperCase() || 'D'
                       )}
                    </div>
                    <div className="overflow-hidden">
                       <p className="text-sm font-bold text-gray-700 truncate">{userDisplayName}</p>
                       <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                 </div>
             ) : (
                <div className="flex justify-center mb-4 cursor-pointer" onClick={() => setActiveTab('profile')}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 overflow-hidden border border-blue-200" title={userDisplayName}>
                       {user.photoURL ? (
                           <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                       ) : (
                           user.email?.[0].toUpperCase() || 'D'
                       )}
                    </div>
                </div>
             )}

             <div className="flex flex-col gap-1">
                 <button 
                    onClick={handleRefresh}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 rounded-xl transition-colors text-sm font-bold mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? 'إعادة تحميل الصفحة' : ''}
                 >
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && "إعادة تحميل الصفحة"}
                 </button>

                 <button 
                    onClick={() => {
                    signOut(auth);
                    setUser(null);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? 'تسجيل خروج' : ''}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && "تسجيل خروج"}
                </button>
             </div>
          </div>
        </div>

        <div className="md:hidden fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-green-600 p-1.5 rounded-lg">
                    <Sparkles className="text-white w-5 h-5" />
                </div>
                <h1 className="font-bold text-gray-800">مساعدي المالي</h1>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('profile')} className="text-gray-400 hover:text-blue-500 p-2">
                     <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                        {user.photoURL ? (
                             <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-full h-full p-1" />
                        )}
                     </div>
                </button>
                <button 
                    onClick={handleRefresh} 
                    className="text-gray-400 hover:text-blue-500 p-2"
                    title="تحديث"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>

        <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-x-hidden w-full bg-slate-50">
          
          <header className="mb-8 hidden md:block max-w-7xl mx-auto flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">
                {activeTab === 'dashboard' && 'لوحة التحكم'}
                {activeTab === 'transactions' && 'سجل المعاملات'}
                {activeTab === 'savings' && 'إدارة المدخرات'}
                {activeTab === 'recurring' && 'الفواتير والاشتراكات'}
                {activeTab === 'installments' && 'إدارة الأقساط والديون'}
                {activeTab === 'reports' && 'التقارير والتحليل'}
                {activeTab === 'advisor' && 'المستشار المالي'}
                {activeTab === 'goals' && 'أهدافي المالية'}
                {activeTab === 'profile' && 'الملف الشخصي'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {activeTab === 'profile' 
                    ? 'إدارة حسابك وإعدادات التطبيق' 
                    : `أهلاً بك، ${userDisplayName} 👋 إليك ملخص وضعك المالي اليوم.`
                  }
                </p>
            </div>
          </header>

          {editingTransaction && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
               <div className="w-full max-w-lg">
                  <ManualEntryForm 
                     initialData={editingTransaction} 
                     onSubmit={handleUpdateTransaction}
                     onCancel={() => setEditingTransaction(null)}
                     userProfile={userProfile}
                  />
               </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto w-full">
             {activeTab === 'dashboard' && (
                <Dashboard 
                  transactions={transactions} 
                  recurringItems={recurringItems}
                  goals={goals}
                />
             )}
             
             {activeTab === 'transactions' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex gap-3">
                        {isAIEnabled && (
                            <button 
                                onClick={() => toggleEntryMode('smart')}
                                className={`flex-1 py-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${entryMode === 'smart' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'}`}
                            >
                                <Sparkles size={18} />
                                إضافة ذكية (AI)
                            </button>
                        )}
                        <button 
                            onClick={() => toggleEntryMode('manual')}
                            className={`flex-1 py-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${entryMode === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'}`}
                        >
                            <PenTool size={18} />
                            إضافة يدوية
                        </button>
                    </div>

                    {entryMode === 'smart' && isAIEnabled && (
                        <div className="animate-fade-in">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-500">الإضافة الذكية مفعلة</span>
                                <button onClick={() => setEntryMode(null)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                             </div>
                             <SmartEntry onTransactionParsed={handleSmartTransaction} />
                        </div>
                    )}
                    
                    {entryMode === 'manual' && (
                         <div className="animate-fade-in">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-500">الإضافة اليدوية مفعلة</span>
                                <button onClick={() => setEntryMode(null)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                             </div>
                             <ManualEntryForm 
                                onSubmit={handleManualTransaction} 
                                onCancel={() => setEntryMode(null)}
                                userProfile={userProfile} 
                             />
                        </div>
                    )}

                    <TransactionList 
                        transactions={transactions} 
                        onDelete={handleDeleteTransaction}
                        onEdit={handleEditTransaction}
                    />
                </div>
             )}
             
             {activeTab === 'recurring' && (
                <RecurringManager 
                  items={subscriptions} 
                  transactions={transactions}
                  onAdd={handleAddRecurring}
                  onUpdate={handleUpdateRecurring}
                  onDelete={handleDeleteRecurring}
                  onProcess={handleProcessRecurring}
                  onAddTransaction={handleManualTransaction}
                />
             )}

             {activeTab === 'installments' && (
                <InstallmentsManager 
                  items={installments} 
                  onAdd={handleAddRecurring} 
                  onUpdate={handleUpdateRecurring}
                  onDelete={handleDeleteRecurring}
                  onProcess={handleProcessRecurring}
                  onAddTransaction={handleManualTransaction} 
                />
             )}
            
             {activeTab === 'savings' && (
                <SavingsManager 
                  userProfile={userProfile}
                  transactions={transactions}
                />
             )}

             {activeTab === 'reports' && (
                <Reports transactions={transactions} />
             )}

             {activeTab === 'advisor' && (
                <FinancialAdvisor transactions={transactions} />
             )}

             {activeTab === 'goals' && (
                <GoalTracker 
                  goals={goals} 
                  onAdd={handleAddGoal} 
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                />
             )}

             {activeTab === 'profile' && (
                <Profile user={user} />
             )}
          </div>

        </main>

        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 px-2 py-2 flex justify-start items-center gap-2 z-30 safe-area-bottom overflow-x-auto no-scrollbar">
           {[
              { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
              { id: 'transactions', label: 'سجل', icon: List },
              { id: 'advisor', label: 'مساعد ذكي', icon: MessageSquareText }, 
              { id: 'recurring', label: 'التزامات', icon: CalendarClock },
              { id: 'installments', label: 'أقساط', icon: Layers }, 
              { id: 'goals', label: 'أهداف', icon: Target }, 
              { id: 'savings', label: 'ادخار', icon: TrendingUp }, 
              { id: 'reports', label: 'تقارير', icon: FileBarChart },
            ].filter(item => !hiddenTabs.includes(item.id))
             .sort((a,b) => {
                 const orderA = tabOrder?.indexOf(a.id) ?? -1;
                 const orderB = tabOrder?.indexOf(b.id) ?? -1;
                 return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
             })
             .map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[4rem] shrink-0 ${
                  activeTab === item.id 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold whitespace-nowrap">{customTabNames?.[item.id] || item.label}</span>
              </button>
            ))}
        </div>

      </div>
    </div>
  );
}

export default App;
