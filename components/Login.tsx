
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Lock, User, Loader2, ShieldCheck, Fingerprint, CheckCircle2, Mail, UserPlus, LogIn, KeyRound, ArrowLeft, Eye, EyeOff, RefreshCw } from 'lucide-react';

const Login: React.FC = () => {
  const [viewState, setViewState] = useState<'login' | 'signup' | 'forgot'>('login'); // Toggle views
  
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [gender, setGender] = useState<'male'|'female'>('male'); // New Gender State
  const [rememberMe, setRememberMe] = useState(false); // New Remember Me State
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Biometric States
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [hasStoredBiometric, setHasStoredBiometric] = useState(false);

  // Check if credentials are stored locally on mount
  useEffect(() => {
    const stored = localStorage.getItem('biometric_auth_data');
    if (stored) {
      setHasStoredBiometric(true);
    }
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (resendTimer > 0) {
        const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Basic Validation
    let emailToUse = email.trim();
    
    // Admin Shortcut
    if (emailToUse.toLowerCase() === 'admin') emailToUse = 'mohieelldeena@gmail.com';

    if (!emailToUse.includes('@')) {
         setError('يرجى إدخال بريد إلكتروني صحيح');
         setLoading(false);
         return;
    }

    try {
      if (viewState === 'forgot') {
        // --- FORGOT PASSWORD LOGIC ---
        // Note: If email doesn't exist, Firebase might still simulate success for security (Email Enumeration Protection)
        const actionCodeSettings = {
            url: window.location.href, // This helps user return to app after reset
            handleCodeInApp: false
        };
        await sendPasswordResetEmail(auth, emailToUse, actionCodeSettings);
        
        setSuccessMsg('تم إرسال الرابط! تفقد البريد الوارد والرسائل المزعجة (Spam).');
        setResendTimer(60); // Start 60s cooldown
        setLoading(false);
        return;
      }

      if (viewState === 'signup') {
        // --- SIGN UP LOGIC ---
        const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        // Save Extended Profile with Gender
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          gender: gender, // Save Gender
          createdAt: serverTimestamp(),
          settings: { currency: 'ج.م', theme: 'light' }
        });

      } else {
        // --- LOGIN LOGIC ---
        await signInWithEmailAndPassword(auth, emailToUse, password);
      }
      
      // Biometric Setup
      if (enableBiometric) {
        const sensitiveData = JSON.stringify({ e: emailToUse, p: password });
        localStorage.setItem('biometric_auth_data', btoa(sensitiveData)); 
        localStorage.setItem('biometric_user_name', viewState === 'signup' ? name : (auth.currentUser?.displayName || emailToUse));
      }
      
    } catch (err: any) {
      // Suppress console error for expected user mistakes
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/user-not-found' && err.code !== 'auth/wrong-password') {
          console.error("Auth Error:", err.code);
      }
      
      // Error Handling Logic
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم بالفعل.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        // Customize message based on context
        if (viewState === 'forgot') {
            setError('هذا البريد الإلكتروني غير مسجل لدينا، أو تم حظر الطلبات المتكررة.');
        } else {
            setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        }
      } else if (err.code === 'auth/too-many-requests') {
        setError('تم حظر الحساب مؤقتاً لكثرة المحاولات. حاول لاحقاً.');
      } else if (err.code === 'auth/invalid-email') {
        setError('صيغة البريد الإلكتروني غير صحيحة.');
      } else {
        setError('حدث خطأ غير متوقع: ' + (err.message || ''));
      }
    } finally {
      // Stop loading unless we are in success state of forgot password (timer running)
      if (!(viewState === 'forgot' && !error && successMsg)) { 
          setLoading(false); 
      }
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');

    const storedData = localStorage.getItem('biometric_auth_data');
    if (!storedData) {
        setError('لم يتم تفعيل البصمة لهذا الجهاز بعد.');
        setBiometricLoading(false);
        return;
    }

    if (window.PublicKeyCredential) {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: "My Finance App" },
                    user: {
                        id: new Uint8Array(16),
                        name: localStorage.getItem('biometric_user_name') || "User",
                        displayName: localStorage.getItem('biometric_user_name') || "User",
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    timeout: 60000,
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required",
                    }
                }
            });

            const decoded = JSON.parse(atob(storedData));
            await signInWithEmailAndPassword(auth, decoded.e, decoded.p);

        } catch (e: any) {
            console.error(e);
            setError('فشل التحقق البيومتري.');
        } finally {
            setBiometricLoading(false);
        }
    } else {
        setError('المتصفح لا يدعم الدخول البيومتري.');
        setBiometricLoading(false);
    }
  };

  const clearBiometricData = () => {
      localStorage.removeItem('biometric_auth_data');
      localStorage.removeItem('biometric_user_name');
      setHasStoredBiometric(false);
      setEnableBiometric(false);
      alert("تم إزالة بيانات الدخول البيومتري.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
        
        {/* Header Section */}
        <div className={`p-6 text-center relative overflow-hidden transition-colors duration-300 ${viewState === 'signup' ? 'bg-blue-600' : viewState === 'forgot' ? 'bg-purple-600' : 'bg-green-600'}`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
                {viewState === 'forgot' ? <KeyRound className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 relative z-10">مساعدي المالي</h1>
            <p className="text-white/80 text-sm relative z-10">
                {viewState === 'signup' ? 'إنشاء حساب جديد' : viewState === 'forgot' ? 'استعادة كلمة المرور' : 'بوابة الدخول الآمنة'}
            </p>
        </div>

        <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm text-center border border-green-200 animate-fade-in flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 font-bold">
                            <CheckCircle2 size={18} />
                            {successMsg}
                        </div>
                        {viewState === 'forgot' && (
                             resendTimer > 0 ? (
                                <p className="text-xs text-green-600/80">
                                    يمكنك إعادة الإرسال خلال {resendTimer} ثانية
                                </p>
                             ) : (
                                <button 
                                    type="button" 
                                    onClick={handleAuth} 
                                    className="text-xs bg-white text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm hover:bg-green-50 flex items-center gap-1 mt-1 transition-colors"
                                >
                                    <RefreshCw size={12} /> إعادة إرسال الرابط
                                </button>
                             )
                        )}
                    </div>
                )}

                {/* Name Field - Only for Sign Up */}
                {viewState === 'signup' && (
                    <div className="space-y-2 animate-fade-in">
                        <label className="text-sm font-bold text-gray-700 block">الاسم الكامل</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                required={viewState === 'signup'}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                placeholder="الاسم الشخصي"
                            />
                            <User className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 block">البريد الإلكتروني</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:outline-none transition-all ${viewState === 'signup' ? 'focus:ring-blue-500' : viewState === 'forgot' ? 'focus:ring-purple-500' : 'focus:ring-green-500'}`}
                            placeholder="example@mail.com"
                            autoComplete="email"
                        />
                        <Mail className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                {/* Password Field - Hidden in Forgot Mode */}
                {(viewState === 'login' || viewState === 'signup') && (
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-gray-700">كلمة المرور</label>
                            {viewState === 'login' && (
                                <button type="button" onClick={() => { setViewState('forgot'); setError(''); setSuccessMsg(''); }} className="text-xs text-blue-600 hover:underline">
                                    نسيت كلمة المرور؟
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:outline-none transition-all ${viewState === 'signup' ? 'focus:ring-blue-500' : 'focus:ring-green-500'}`}
                                placeholder="••••••••"
                                minLength={6}
                                autoComplete="current-password"
                            />
                            <Lock className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                                tabIndex={-1}
                                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Gender Selection - Only for Sign Up */}
                {viewState === 'signup' && (
                    <div className="space-y-2 animate-fade-in">
                        <label className="text-sm font-bold text-gray-700 block">الجنس</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${gender === 'male' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200'}`}>
                                <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                                <span className="font-bold">ذكر</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${gender === 'female' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-gray-50 border-gray-200'}`}>
                                <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                                <span className="font-bold">أنثى</span>
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-400">يستخدم لتخصيص تصنيفات المصاريف (مثل المكياج للسيدات)</p>
                    </div>
                )}

                {/* Remember Me - Login Only */}
                {viewState === 'login' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <input 
                            type="checkbox" 
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-600 select-none">تذكر كلمة السر</label>
                    </div>
                )}

                {/* Biometric Checkbox */}
                {(viewState === 'login' || viewState === 'signup') && (
                    <div className="flex items-center justify-between animate-fade-in pt-2 border-t border-gray-50">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${enableBiometric ? (viewState === 'signup' ? 'bg-blue-600 border-blue-600' : 'bg-green-600 border-green-600') : 'bg-gray-50 border-gray-300'}`}>
                                {enableBiometric && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={enableBiometric}
                                onChange={(e) => setEnableBiometric(e.target.checked)}
                            />
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors select-none">
                                {viewState === 'signup' ? 'تفعيل البصمة للحساب' : 'تفعيل الدخول بالبصمة'}
                            </span>
                        </label>
                    </div>
                )}

                {/* Main Action Buttons */}
                {!(successMsg && viewState === 'forgot') && (
                    <div className="flex gap-3">
                        <button 
                            type="submit" 
                            disabled={loading || biometricLoading}
                            className={`flex-1 text-white py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 ${
                                viewState === 'signup' 
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                                    : viewState === 'forgot'
                                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                                        : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                            }`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                            (viewState === 'signup' ? 'إنشاء الحساب' : viewState === 'forgot' ? 'إرسال رابط التعيين' : 'دخول')}
                        </button>
                        
                        {viewState === 'login' && (
                            <button
                                type="button"
                                onClick={handleBiometricLogin}
                                disabled={loading || biometricLoading}
                                className={`w-16 rounded-xl transition-all flex items-center justify-center border ${
                                    hasStoredBiometric 
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:scale-105 shadow-md' 
                                        : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                }`}
                                title={hasStoredBiometric ? "دخول بالبصمة" : "يجب تسجيل الدخول وتفعيل البصمة أولاً"}
                            >
                                {biometricLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-8 h-8" />}
                            </button>
                        )}
                    </div>
                )}
            </form>

            {/* View Toggles */}
            <div className="mt-6 text-center border-t border-gray-100 pt-4">
                {viewState === 'forgot' ? (
                     <button 
                        onClick={() => { setViewState('login'); setError(''); setSuccessMsg(''); setResendTimer(0); }}
                        className="text-gray-500 hover:text-gray-800 font-bold flex items-center justify-center gap-2 w-full transition-colors"
                     >
                        <ArrowLeft size={16} /> العودة لتسجيل الدخول
                     </button>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-2">
                            {viewState === 'signup' ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
                        </p>
                        <button 
                            onClick={() => { 
                                setViewState(viewState === 'login' ? 'signup' : 'login'); 
                                setError('');
                                setEnableBiometric(false);
                            }}
                            className={`font-bold hover:underline transition-colors flex items-center justify-center gap-1 w-full ${viewState === 'signup' ? 'text-green-600' : 'text-blue-600'}`}
                        >
                            {viewState === 'signup' ? (
                                <>
                                    <LogIn size={16} /> تسجيل الدخول
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} /> إنشاء حساب جديد
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
            
            {hasStoredBiometric && viewState === 'login' && (
                <div className="mt-4 text-center">
                    <button onClick={clearBiometricData} className="text-[10px] text-red-400 hover:text-red-600 hover:underline">
                        إلغاء ربط البصمة من هذا الجهاز
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;
