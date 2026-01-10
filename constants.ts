import { Category, TransactionType, RecurringTransaction } from "./types";

export const CURRENCY = "ج.م"; // Egyptian Pound as default for this persona

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام ومشروبات',
  transport: 'مواصلات',
  utilities: 'فواتير وخدمات',
  entertainment: 'ترفيه',
  shopping: 'تسوق',
  health: 'صحة',
  salary: 'راتب',
  freelance: 'عمل حر',
  other: 'أخرى',
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

// Initial data removed for production (Data is now loaded from Firestore)
export const INITIAL_RECURRING: RecurringTransaction[] = [];
export const INITIAL_TRANSACTIONS = [];