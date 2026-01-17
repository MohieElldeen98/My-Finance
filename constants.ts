
import { Category, TransactionType, RecurringTransaction } from "./types";

export const CURRENCY = "ج.م"; // Egyptian Pound as default for this persona

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام ومشروبات',
  transport: 'مواصلات',
  utilities: 'فواتير وخدمات',
  entertainment: 'ترفيه',
  shopping: 'تسوق وملابس',
  health: 'صحة وأدوية',
  makeup: 'مكياج وتجميل',
  skincare: 'عناية بالبشرة (Skincare)',
  haircare: 'عناية بالشعر (Salon)',
  hygiene: 'مستلزمات خاصة',
  salary: 'راتب',
  freelance: 'عمل حر',
  investment: 'استثمار/أرباح',
  rental: 'إيجار (دخل/خرج)',
  private_sessions: 'جلسات برايفت',
  online_subs: 'اشتراكات اونلاين',
  installments: 'أقساط',
  other: 'أخرى',
};

// New: Colors for each category
export const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-100 text-orange-700',
  transport: 'bg-blue-100 text-blue-700',
  utilities: 'bg-yellow-100 text-yellow-700',
  entertainment: 'bg-purple-100 text-purple-700',
  shopping: 'bg-pink-100 text-pink-700',
  health: 'bg-red-100 text-red-700',
  makeup: 'bg-rose-100 text-rose-700', 
  skincare: 'bg-rose-50 text-rose-600',
  haircare: 'bg-fuchsia-100 text-fuchsia-700',
  hygiene: 'bg-pink-50 text-pink-600',
  salary: 'bg-green-100 text-green-700',
  freelance: 'bg-emerald-100 text-emerald-700',
  investment: 'bg-teal-100 text-teal-700',
  rental: 'bg-indigo-100 text-indigo-700',
  private_sessions: 'bg-cyan-100 text-cyan-700',
  online_subs: 'bg-violet-100 text-violet-700',
  installments: 'bg-gray-800 text-white',
  other: 'bg-gray-100 text-gray-700',
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'دخل',
  expense: 'مصروف',
};

export const PAYMENT_METHODS: Record<string, string> = {
  cash: 'كاش',
  card: 'بطاقة بنكية',
  wallet: 'محفظة إلكترونية',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي (كل 3 شهور)',
  yearly: 'سنوي',
};

// Expanded list for females
export const FEMALE_ONLY_CATEGORIES = ['makeup', 'skincare', 'haircare', 'hygiene'];

// Initial data removed for production (Data is now loaded from Firestore)
export const INITIAL_RECURRING: RecurringTransaction[] = [];
export const INITIAL_TRANSACTIONS = [];
