
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { Users, Trash2, Search, LogOut, ShieldAlert, BarChart3, Database, Loader2, Plus, X, Save, AlertCircle, Settings, ToggleRight, ToggleLeft } from 'lucide-react';

interface UserData {
  id: string; // Document ID (uid)
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
}

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, totalTransactions: 0 });

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', uid: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Global Settings State
  const [aiEntryEnabled, setAiEntryEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // 1. Ensure Admin Profile Exists in Firestore (Fix for missing admin in list)
    const ensureAdminProfile = async () => {
        if (!user) return;
        try {
            const adminRef = doc(db, 'users', user.uid);
            const adminSnap = await getDoc(adminRef);
            
            if (!adminSnap.exists()) {
                // If admin auth exists but firestore doc missing, create it
                await setDoc(adminRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Admin',
                    createdAt: serverTimestamp(),
                    settings: { currency: 'ج.م' },
                    roles: ['admin']
                });
                console.log("Admin profile synced to Firestore");
                fetchUsers(); // Refresh list immediately
            }
        } catch (e) {
            console.error("Auto-sync admin error:", e);
        }
    };

    // 2. Fetch Global Settings
    const fetchSettings = async () => {
        try {
            const settingsRef = doc(db, 'settings', 'global');
            const snap = await getDoc(settingsRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.enableAIEntry !== undefined) setAiEntryEnabled(data.enableAIEntry);
            } else {
                // Initialize if not exists
                await setDoc(settingsRef, { enableAIEntry: true });
            }
        } catch (e) {
            console.error("Error fetching global settings", e);
        }
    };

    ensureAdminProfile();
    fetchUsers();
    fetchSettings();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
      } as UserData));
      
      setUsers(usersList);

      // 2. Simple Stats
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      
      setStats({
          totalUsers: usersList.length,
          totalTransactions: transactionsSnapshot.size
      });

    } catch (error) {
      console.error("Error fetching admin data:", error);
      alert("فشل تحميل البيانات. تأكد من الصلاحيات.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAI = async () => {
      setSavingSettings(true);
      try {
          const newValue = !aiEntryEnabled;
          await setDoc(doc(db, 'settings', 'global'), { enableAIEntry: newValue }, { merge: true });
          setAiEntryEnabled(newValue);
      } catch (e) {
          console.error("Error saving settings", e);
          alert("فشل حفظ الإعدادات");
      } finally {
          setSavingSettings(false);
      }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("تحذير: هذا الإجراء سيحذف جميع بيانات المستخدم (المعاملات، الأهداف، الالتزامات) من قاعدة البيانات. هل أنت متأكد؟\n\nملاحظة: هذا لا يحذف حساب الدخول (Auth) نهائياً، بل يفرغ بياناته.")) return;

    setDeletingId(userId);
    try {
        const batch = writeBatch(db);

        // 1. Delete Transactions
        const txQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
        const txDocs = await getDocs(txQuery);
        txDocs.forEach((doc) => batch.delete(doc.ref));

        // 2. Delete Goals
        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', userId));
        const goalsDocs = await getDocs(goalsQuery);
        goalsDocs.forEach((doc) => batch.delete(doc.ref));

        // 3. Delete Recurring
        const recQuery = query(collection(db, 'recurring'), where('userId', '==', userId));
        const recDocs = await getDocs(recQuery);
        recDocs.forEach((doc) => batch.delete(doc.ref));

        // 4. Delete User Profile
        const userRef = doc(db, 'users', userId);
        batch.delete(userRef);

        // Commit Batch
        await batch.commit();

        // Update Local State
        setUsers(prev => prev.filter(u => u.id !== userId));
        setStats(prev => ({...prev, totalUsers: prev.totalUsers - 1}));
        alert("تم حذف بيانات المستخدم بنجاح.");

    } catch (error) {
        console.error("Delete error:", error);
        alert("حدث خطأ أثناء الحذف.");
    } finally {
        setDeletingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUser.displayName || !newUser.email || !newUser.uid) {
          alert("جميع الحقول مطلوبة");
          return;
      }
      
      setIsAdding(true);
      try {
          // Check if ID already exists
          const docRef = doc(db, 'users', newUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              alert("هذا المعرف (UID) موجود بالفعل!");
              setIsAdding(false);
              return;
          }

          await setDoc(docRef, {
              uid: newUser.uid,
              email: newUser.email,
              displayName: newUser.displayName,
              createdAt: serverTimestamp(),
              settings: { currency: 'ج.م' }
          });

          setUsers(prev => [...prev, {
              id: newUser.uid,
              uid: newUser.uid,
              email: newUser.email,
              displayName: newUser.displayName,
              createdAt: { seconds: Date.now() / 1000 }
          } as UserData]);
          
          setStats(prev => ({...prev, totalUsers: prev.totalUsers + 1}));
          setShowAddModal(false);
          setNewUser({ displayName: '', email: '', uid: '' });
          alert("تم إضافة ملف المستخدم بنجاح");

      } catch (e) {
          console.error(e);
          alert("حدث خطأ أثناء الإضافة");
      } finally {
          setIsAdding(false);
      }
  };

  const filteredUsers = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      
      {/* Top Navbar */}
      <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
                <ShieldAlert size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold">لوحة تحكم المسؤول</h1>
                <p className="text-xs text-gray-400">أهلاً بك، {user.displayName || user.email?.split('@')[0] || 'المسؤول'}</p>
            </div>
        </div>
        <button 
            onClick={() => signOut(auth)} 
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
        >
            <LogOut size={16} /> تسجيل خروج
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 font-bold mb-1">إجمالي المستخدمين</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats.totalUsers}</h2>
                </div>
                <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                    <Users size={32} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 font-bold mb-1">إجمالي المعاملات المسجلة</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats.totalTransactions}</h2>
                </div>
                <div className="bg-green-50 p-4 rounded-full text-green-600">
                    <Database size={32} />
                </div>
            </div>
            
            {/* Global Settings Control */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                     <div>
                        <p className="text-gray-500 font-bold mb-1 flex items-center gap-2"><Settings size={16}/> إعدادات النظام</p>
                        <h3 className="text-sm font-bold text-gray-800">تفعيل الإدخال الذكي (AI)</h3>
                        <p className="text-xs text-gray-400 mt-1">السماح للمستخدمين باستخدام Gemini API</p>
                     </div>
                     <button 
                        onClick={handleToggleAI}
                        disabled={savingSettings}
                        className={`transition-colors p-2 rounded-lg ${aiEntryEnabled ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                     >
                         {savingSettings ? <Loader2 className="animate-spin" size={32} /> : (
                             aiEntryEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />
                         )}
                     </button>
                 </div>
                 <div className="mt-2 text-xs font-mono text-gray-400">
                     Status: {aiEntryEnabled ? 'Enabled' : 'Disabled'}
                 </div>
            </div>
        </div>

        {/* Users Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users size={20} className="text-gray-500" />
                    قائمة المستخدمين
                </h2>
                
                <div className="flex flex-1 gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="بحث بالاسم أو البريد..." 
                            className="pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                        <Plus size={18} />
                        إضافة
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-12 flex justify-center items-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">المستخدم</th>
                                <th className="px-6 py-4">البريد الإلكتروني</th>
                                <th className="px-6 py-4">تاريخ الانضمام</th>
                                <th className="px-6 py-4">معرف النظام (UID)</th>
                                <th className="px-6 py-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400">لا يوجد مستخدمين مطابقين</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {user.displayName || 'بدون اسم'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400 font-mono max-w-[150px] truncate" title={user.uid}>
                                            {user.uid}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.email?.toLowerCase() === 'mohieelldeena@gmail.com' ? (
                                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">مسؤول</span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deletingId === user.id}
                                                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1 mx-auto disabled:opacity-50"
                                                >
                                                    {deletingId === user.id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
                                                    حذف البيانات
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="p-4 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                * ملاحظة: حذف المستخدم هنا يقوم بإزالة جميع بياناته من قاعدة البيانات (Transactions, Goals, etc). لإلغاء صلاحية الدخول نهائياً، يفضل تعطيل الحساب من Firebase Console.
            </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-800">إضافة ملف مستخدم جديد</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg mb-4 flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <p>
                          هذه الخاصية تقوم بإنشاء "ملف بيانات" في قاعدة البيانات فقط.
                          <br/>
                          يجب أن يكون المستخدم قد تم إنشاؤه بالفعل في Firebase Authentication (أو ستقوم بإنشائه يدوياً هناك) بنفس الـ <strong>UID</strong> لكي يعمل الحساب.
                      </p>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                          <label className="text-sm font-bold text-gray-700 block mb-1">الاسم</label>
                          <input 
                              type="text" 
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="اسم المستخدم"
                              value={newUser.displayName}
                              onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                              required
                          />
                      </div>
                      <div>
                          <label className="text-sm font-bold text-gray-700 block mb-1">البريد الإلكتروني</label>
                          <input 
                              type="email" 
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="email@example.com"
                              value={newUser.email}
                              onChange={e => setNewUser({...newUser, email: e.target.value})}
                              required
                          />
                      </div>
                      <div>
                          <label className="text-sm font-bold text-gray-700 block mb-1">معرف المستخدم (UID)</label>
                          <input 
                              type="text" 
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              placeholder="Firebase Auth UID"
                              value={newUser.uid}
                              onChange={e => setNewUser({...newUser, uid: e.target.value})}
                              required
                          />
                      </div>

                      <button 
                          type="submit" 
                          disabled={isAdding}
                          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                          {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                          حفظ المستخدم
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
