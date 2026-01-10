import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../services/firebase";
import { Lock, User, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConfigError(false);

    // Transform 'admin' to an internal email for Firebase Authentication
    // This allows the user to just type 'admin' to log in.
	const emailToUse = 'admin@myfinance.com';


    try {
      await signInWithEmailAndPassword(auth, emailToUse, password);
      // Auth listener in App.tsx handles the rest
    } catch (err: any) {
      console.error("Auth Error:", err.code);
      
      // SPECIFIC ERROR HANDLING FOR INVALID API KEY
      if (err.code === 'auth/api-key-not-valid') {
        setError('خطأ في إعدادات النظام: مفتاح الربط بقاعدة البيانات غير صحيح.');
        setConfigError(true);
        setLoading(false);
        return;
      }

      // AUTO-REGISTRATION LOGIC:
      // If the specific admin user ('admin' / 'Mohie@2026') tries to login 
      // and doesn't exist yet (first run), create the account automatically.
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && 
          username.trim() === 'admin' && 
          password === 'Mohie@2026') {
         try {
             await createUserWithEmailAndPassword(auth, emailToUse, password);
             return; // Success, user created and logged in
         } catch (createErr: any) {
             console.error(createErr);
             if (createErr.code === 'auth/api-key-not-valid') {
                 setError('خطأ في إعدادات النظام: مفتاح الربط بقاعدة البيانات غير صحيح.');
                 setConfigError(true);
             } else {
                 setError('فشل إنشاء الحساب المسؤول');
             }
         }
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (err.code === 'auth/too-many-requests') {
        setError('محاولات كثيرة خاطئة، حاول لاحقاً');
      } else if (err.code === 'auth/invalid-email') {
        setError('صيغة اسم المستخدم غير صحيحة');
      } else if (err.code === 'auth/network-request-failed') {
        setError('فشل الاتصال بالإنترنت');
      } else {
        setError('حدث خطأ في تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-green-600 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">مساعدي المالي</h1>
            <p className="text-green-100 text-sm">بوابة الدخول الخاصة</p>
        </div>

        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 font-bold">
                            <AlertTriangle size={16} />
                            <span>تنبيه</span>
                        </div>
                        {error}
                        {configError && (
                            <div className="mt-2 text-xs bg-white p-2 rounded border border-red-200 text-left w-full" dir="ltr">
                                <strong>Action Required:</strong><br/>
                                1. Go to firebase.ts<br/>
                                2. Replace 'apiKey' with your actual Firebase Project API Key.
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 block">اسم المستخدم</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
                            placeholder="ادخل اسم المستخدم"
                            autoComplete="username"
                        />
                        <User className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 block">كلمة المرور</label>
                    <div className="relative">
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                        <Lock className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول'}
                </button>
            </form>
            
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                    * هذا النظام محمي ومخصص للاستخدام الشخصي فقط.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;