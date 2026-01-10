export type TransactionType = 'income' | 'expense';

export type Category = 
  | 'food' 
  | 'transport' 
  | 'utilities' 
  | 'entertainment' 
  | 'shopping' 
  | 'health' 
  | 'salary' 
  | 'freelance' 
  | 'other';

export type Frequency = 'monthly' | 'quarterly' | 'yearly';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  date: string; // ISO string
  note: string;
  paymentMethod: 'cash' | 'card' | 'wallet';
}

export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: Frequency;
  nextDueDate: string; // ISO Date string
  active: boolean;
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