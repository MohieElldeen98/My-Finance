
export type TransactionType = 'income' | 'expense';

export type Category = 
  | 'food' 
  | 'transport' 
  | 'utilities' 
  | 'entertainment' 
  | 'shopping' 
  | 'health' 
  | 'makeup' // Cosmetics
  | 'skincare' // New: Skin Care
  | 'haircare' // New: Hair Care / Salon
  | 'hygiene'  // New: Feminine Hygiene
  | 'salary' 
  | 'freelance' 
  | 'investment'
  | 'rental'
  | 'private_sessions'
  | 'online_subs'
  | 'installments'
  | 'other';

export type Frequency = 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  gender?: 'male' | 'female';
  createdAt?: any;
  settings?: {
    currency?: string;
  };
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  date: string; // ISO string
  note: string;
  paymentMethod: 'cash' | 'card' | 'wallet';
  recurringId?: string; // Link to the original recurring item
}

export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number; // قيمة القسط الواحد
  totalValue?: number; // القيمة الإجمالية للسلعة (سعر الكاش)
  maintenance?: number; // 👈 (جديد) مصاريف إدارية أو صيانة
  downPayment?: number; // قيمة المقدم المدفوع
  
  durationValue?: number; // 👈 (جديد) رقم المدة (مثلا 12)
  durationUnit?: 'months' | 'years'; // 👈 (جديد) وحدة المدة

  type: TransactionType;
  category: string;
  frequency: Frequency;
  nextDueDate: string; // ISO Date string for the NEXT payment
  startDate?: string; // تاريخ البداية
  active: boolean;
  isOneTime?: boolean;
  installmentsCount?: number; // عدد الأقساط الكلي (يتم حسابه تلقائياً الآن)
  totalPaidCount?: number; // كم قسط اندفع لحد دلوقتي
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isThinking?: boolean;
}

// Gemini Response Schemas
export interface ParsedTransaction {
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  note: string;
  paymentMethod: 'cash' | 'card' | 'wallet';
}

// Investment Comparison Schema
export interface InvestmentOption {
  type: 'gold' | 'certificate' | 'silver' | 'bills' | 'stocks';
  title: string; // e.g., "شهادة البنك الأهلي البلاتينية" or "سبيكة ذهب عيار 24"
  expectedReturnPercentage: number; // e.g., 27 for 27%
  profitAmount: number; // Calculated profit
  totalValueAfterYear: number;
  riskLevel: 'low' | 'medium' | 'high';
  shariaRuling: string; // e.g., "حلال بإجماع"، "فيه شبهة"، "جائز حسب دار الإفتاء"
  details: string; // Duration, payout frequency info
  pros: string[];
  cons: string[];
}

export interface InvestmentAnalysisResponse {
  options: InvestmentOption[];
  bestOption: string;
  aiReasoning: string; // Why is this the best option?
}
