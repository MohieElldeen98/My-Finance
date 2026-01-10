import { ParsedTransaction, Transaction, Category, TransactionType } from "../types";
import { CATEGORY_LABELS } from "../constants";

// Helper to find keywords in text
const containsAny = (text: string, keywords: string[]) => {
  return keywords.some(keyword => text.toLowerCase().includes(keyword));
};

/**
 * Parses natural language input into a structured transaction object using LOCAL LOGIC (No API Cost).
 */
export const parseTransactionFromText = async (text: string): Promise<ParsedTransaction | null> => {
  // Simulate a small delay for "processing" feel
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // 1. Extract Amount (Looking for numbers)
    const amountMatch = text.match(/(\d+(\.\d+)?)/); // Matches 50, 50.5, etc.
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[0]);

    // 2. Determine Type (Income vs Expense)
    let type: TransactionType = 'expense'; // Default
    const incomeKeywords = ['دخل', 'قبض', 'مرتب', 'مكافأة', 'income', 'salary', 'added', 'deposit'];
    if (containsAny(text, incomeKeywords)) {
      type = 'income';
    }

    // 3. Determine Category (Keyword Matching)
    let category: string = 'other';
    
    const categoryKeywords: Record<Category, string[]> = {
      food: ['اكل', 'طعام', 'فطار', 'غدا', 'عشا', 'مطعم', 'سوبر', 'food', 'meal', 'kfc', 'mac'],
      transport: ['مواصلات', 'تاكسي', 'اوبر', 'بنزين', 'عربية', 'transport', 'uber', 'gas', 'car'],
      utilities: ['فاتورة', 'كهرباء', 'مياه', 'نت', 'باقة', 'شحن', 'رصيد', 'bill', 'wifi', 'phone'],
      health: ['دكتور', 'علاج', 'دواء', 'صيدلية', 'كشف', 'health', 'doctor', 'pharmacy'],
      entertainment: ['سينما', 'خروجة', 'فسحة', 'لعب', 'game', 'movie', 'fun'],
      shopping: ['ملابس', 'لبس', 'جزمة', 'شراء', 'shopping', 'clothes'],
      salary: ['مرتب', 'قبض', 'salary'],
      freelance: ['فريلانس', 'عمل حر', 'عميل', 'freelance', 'project'],
      other: []
    };

    // If type is income, default category is Salary or Freelance
    if (type === 'income') {
        if (containsAny(text, categoryKeywords.freelance)) category = 'freelance';
        else category = 'salary';
    } else {
        // Find matching expense category
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
            if (containsAny(text, keywords)) {
                category = cat;
                break;
            }
        }
    }

    // 4. Determine Payment Method
    let paymentMethod: 'cash' | 'card' | 'wallet' = 'cash';
    if (containsAny(text, ['فيزا', 'بنك', 'كارت', 'card', 'visa'])) paymentMethod = 'card';
    if (containsAny(text, ['فودافون', 'كاش', 'محفظة', 'wallet', 'instapay'])) paymentMethod = 'wallet';

    return {
      amount,
      currency: 'ج.م',
      type,
      category,
      note: text, // Use the full text as the note
      paymentMethod,
    };

  } catch (error) {
    console.error("Error parsing transaction locally:", error);
    return null;
  }
};

/**
 * Generates financial advice based on local math logic instead of AI API.
 */
export const getFinancialAdvice = async (
  history: Transaction[], 
  userQuery: string
): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Calculate basics
  const totalIncome = history.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = history.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Simple keyword matching for query
  const query = userQuery.toLowerCase();

  if (query.includes('مرحبا') || query.includes('اهلا')) {
    return "أهلاً بك! أنا نظام التحليل المالي الخاص بك. أنا هنا لمساعدتك في فهم مصاريفك بدون أي تكلفة إضافية. اسألني عن 'ملخص' أو 'نصيحة'.";
  }

  if (query.includes('وضع') || query.includes('حالة') || query.includes('ملخص')) {
    if (balance < 0) {
        return `وضعك المالي يحتاج لانتباه ⚠️. مصاريفك (${totalExpense}) أعلى من دخلك (${totalIncome}). العجز الحالي: ${Math.abs(balance)}. حاول تقليل النفقات غير الضرورية.`;
    } else if (savingsRate < 20) {
        return `وضعك مستقر، لكن يمكن تحسينه. متبقي معك ${balance} ج.م. نسبة توفيرك ${savingsRate.toFixed(1)}% وهي أقل من النسبة الموصى بها (20%).`;
    } else {
        return `وضعك المالي ممتاز! 👏 متبقي معك ${balance} ج.م بنسبة توفير ${savingsRate.toFixed(1)}%. استمر على هذا المنوال وفكر في استثمار الفائض.`;
    }
  }

  if (query.includes('اكل') || query.includes('طعام')) {
     const foodExpense = history.filter(t => t.category === 'food' && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
     return `إجمالي صرفك على الطعام هو ${foodExpense} ج.م.`;
  }

  if (query.includes('نصيحة') || query.includes('توفير')) {
      // Find highest category
      const catTotals: Record<string, number> = {};
      history.filter(t => t.type === 'expense').forEach(t => {
          catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      });
      const highestCat = Object.entries(catTotals).sort((a,b) => b[1] - a[1])[0];
      
      if (highestCat) {
          return `أكبر بند مصاريف عندك هو "${CATEGORY_LABELS[highestCat[0]]}" بقيمة ${highestCat[1]} ج.م. حاول تراجع مصاريفك في البند ده لو حابب توفر أكتر.`;
      }
      return "نصيحتي الذهبية: حاول دائماً تدخر 20% من دخلك أول ما تقبض، وعيش بالباقي.";
  }

  return "أنا أعتمد على تحليل الأرقام فقط. يمكنك سؤالي عن 'ملخص الشهر' أو 'نصيحة للتوفير' أو 'مصاريف الاكل'.";
};