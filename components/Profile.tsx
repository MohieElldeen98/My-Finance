
import React, { useState, useEffect, useRef } from 'react';
import { User, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User as UserIcon, Mail, Calendar, Save, Loader2, KeyRound, Shield, Fingerprint, LogOut, Globe, Camera, X, CheckCircle2 } from 'lucide-react';

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [currency, setCurrency] = useState('ج.م');
  const [stats, setStats] = useState({ transactionCount: 0, joinDate: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  // Load User Data & Settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.settings?.currency) setCurrency(data.settings.currency);
          
          // Format Join Date
          if (data.createdAt) {
             const date = new Date(data.createdAt.seconds * 1000);
             setStats(prev => ({ ...prev, joinDate: date.toLocaleDateString('ar-EG') }));
          }
        } else {
             setStats(prev => ({ ...prev, joinDate: new Date().toLocaleDateString('ar-EG') }));
        }

        const bioData = localStorage.getItem('biometric_auth_data');
        if (bioData) setBiometricEnabled(true);

      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchData();
  }, [user]);

  // Helper to resize image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       setUploadingImg(true);
       try {
         const file = e.target.files[0];
         const base64Img = await resizeImage(file);
         
         setPhotoURL(base64Img);
         await updateProfile(user, { photoURL: base64Img });

         const userDocRef = doc(db, 'users', user.uid);
         await setDoc(userDocRef, { photoURL: base64Img }, { merge: true });

         setMsg({ type: 'success', text: 'تم تحديث الصورة الشخصية' });
         setTimeout(() => window.location.reload(), 1000);
       } catch (error) {
         console.error(error);
         setMsg({ type: 'error', text: 'فشل تحديث الصورة' });
       } finally {
         setUploadingImg(false);
       }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        displayName,
        'settings.currency': currency
      }, { merge: true });

      setMsg({ type: 'success', text: 'تم حفظ التغييرات بنجاح' });
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error(error);
      setMsg({ type: 'error', text: 'فشل التحديث. حاول مرة أخرى.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Password Change Logic ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg('');

    if (passData.new !== passData.confirm) {
        setPassMsg('كلمة المرور الجديدة غير متطابقة');
        setPassLoading(false);
        return;
    }

    if (passData.new.length < 6) {
        setPassMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setPassLoading(false);
        return;
    }

    try {
        if (!user.email) throw new Error("User email not found");

        // 1. Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, passData.current);
        await reauthenticateWithCredential(user, credential);

        // 2. Update password
        await updatePassword(user, passData.new);

        setPassMsg('SUCCESS');
        setTimeout(() => {
            setShowPassModal(false);
            setPassData({ current: '', new: '', confirm: '' });
            setPassMsg('');
        }, 2000);

    } catch (error: any) {
        console.error("Password change error:", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            setPassMsg('كلمة المرور الحالية غير صحيحة');
        } else if (error.code === 'auth/too-many-requests') {
            setPassMsg('تم حظر المحاولات مؤقتاً، حاول لاحقاً');
        } else {
            setPassMsg('حدث خطأ أثناء تغيير كلمة المرور');
        }
    } finally {
        setPassLoading(false);
    }
  };

  const toggleBiometric = () => {
    if (biometricEnabled) {
      localStorage.removeItem('biometric_auth_data');
      localStorage.removeItem('biometric_user_name');
      setBiometricEnabled(false);
    } else {
      alert("لتفعيل البصمة، يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى وتفعيل خيار 'تفعيل البصمة' في صفحة الدخول.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        {/* Profile Image Section */}
        <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-blue-50 flex items-center justify-center">
                {uploadingImg ? (
                    <Loader2 className="animate-spin text-blue-500" />
                ) : photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-4xl font-bold text-blue-600">{user.email?.[0].toUpperCase()}</span>
                )}
            </div>
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                title="تغيير الصورة"
            >
                <Camera size={14} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
            />
        </div>
        
        <div className="text-center md:text-right flex-1">
           <h2 className="text-2xl font-bold text-gray-800">{displayName || 'مستخدم جديد'}</h2>
           <p className="text-gray-500 flex items-center justify-center md:justify-start gap-1 mt-1">
             <Mail size={14} /> {user.email}
           </p>
           <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
             <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
               <Calendar size={12} /> انضممت: {stats.joinDate || 'غير متوفر'}
             </span>
             <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
               <Shield size={12} /> الحساب مؤمن
             </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Details Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50">
             <UserIcon className="text-blue-500" size={20} />
             المعلومات الشخصية
           </h3>
           
           <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-500">الاسم الظاهر</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-500">عملة التطبيق المفضلة</label>
                <div className="relative">
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="ج.م">الجنيه المصري (EGP)</option>
                    <option value="SAR">الريال السعودي (SAR)</option>
                    <option value="USD">الدولار الأمريكي (USD)</option>
                    <option value="AED">الدرهم الإماراتي (AED)</option>
                  </select>
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              {msg.text && (
                <div className={`p-3 rounded-xl text-sm text-center ${msg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {msg.text}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                حفظ التغييرات
              </button>
           </form>
        </div>

        {/* Security & Actions */}
        <div className="space-y-6">
            
            {/* Security Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50">
                  <Shield className="text-purple-500" size={20} />
                  الأمان والدخول
                </h3>

                <div className="space-y-3">
                   <button 
                     onClick={() => setShowPassModal(true)}
                     className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
                   >
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg text-gray-500 shadow-sm"><KeyRound size={18} /></div>
                        <div className="text-right">
                          <span className="block font-bold text-sm">تغيير كلمة المرور</span>
                          <span className="block text-xs text-gray-400">تحديث كلمة المرور الحالية</span>
                        </div>
                      </div>
                      <span className="text-xs text-blue-600 font-bold">تغيير</span>
                   </button>

                   <div className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl transition-colors text-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg text-gray-500 shadow-sm"><Fingerprint size={18} /></div>
                        <div className="text-right">
                          <span className="block font-bold text-sm">الدخول البيومتري</span>
                          <span className="block text-xs text-gray-400">{biometricEnabled ? 'مفعل على هذا الجهاز' : 'غير مفعل'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={toggleBiometric}
                        className={`w-10 h-6 rounded-full relative transition-colors ${biometricEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                         <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${biometricEnabled ? 'left-1' : 'right-1'}`}></div>
                      </button>
                   </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-6">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                  <ShieldAlert size={20} />
                  منطقة الخطر
                </h3>
                <p className="text-xs text-red-500 mb-4">الإجراءات هنا لا يمكن التراجع عنها. يرجى الحذر.</p>
                
                <button 
                  onClick={() => {
                     if(window.confirm('هل أنت متأكد من تسجيل الخروج؟')) auth.signOut();
                  }}
                  className="w-full bg-white border border-red-200 text-red-600 p-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <LogOut size={16} /> تسجيل الخروج
                </button>
            </div>

        </div>
      </div>

      {/* Change Password Modal */}
      {showPassModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-fade-in relative">
                  <button onClick={() => setShowPassModal(false)} className="absolute left-4 top-4 text-gray-400 hover:text-gray-600">
                      <X size={20} />
                  </button>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">تغيير كلمة المرور</h3>
                  
                  {passMsg === 'SUCCESS' ? (
                      <div className="flex flex-col items-center justify-center py-6 text-green-600">
                          <CheckCircle2 size={48} className="mb-2" />
                          <p className="font-bold">تم تغيير كلمة المرور بنجاح</p>
                      </div>
                  ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 block mb-1">كلمة المرور الحالية</label>
                              <input 
                                  type="password" 
                                  required
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={passData.current}
                                  onChange={e => setPassData({...passData, current: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 block mb-1">كلمة المرور الجديدة</label>
                              <input 
                                  type="password" 
                                  required
                                  minLength={6}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={passData.new}
                                  onChange={e => setPassData({...passData, new: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 block mb-1">تأكيد كلمة المرور</label>
                              <input 
                                  type="password" 
                                  required
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={passData.confirm}
                                  onChange={e => setPassData({...passData, confirm: e.target.value})}
                              />
                          </div>

                          {passMsg && (
                              <div className="bg-red-50 text-red-600 p-2 rounded-lg text-xs text-center border border-red-100">
                                  {passMsg}
                              </div>
                          )}

                          <button 
                              type="submit" 
                              disabled={passLoading}
                              className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                              {passLoading ? <Loader2 className="animate-spin" size={20} /> : 'تحديث كلمة المرور'}
                          </button>
                      </form>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

// Internal Helper Icon
const ShieldAlert = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default Profile;
