
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedTransaction, Transaction, InvestmentAnalysisResponse } from "../types";
import { CATEGORY_LABELS } from "../constants";

// Helper to get AI client safely without crashing the app on load
const getAIClient = () => {
    // Try to get key from Vite env or Process env
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY || 
                   (import.meta as any).env?.VITE_API_KEY || 
                   process.env.API_KEY;

    if (!apiKey) {
        console.error("Gemini API Key is missing! Check your .env file.");
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey: apiKey.trim() });
};

/**
 * Parses natural language input into a structured transaction object using Gemini API.
 */
export const parseTransactionFromText = async (text: string, customCategoriesString: string = ''): Promise<ParsedTransaction | null> => {
  try {
    const ai = getAIClient();
    const categories = Object.keys(CATEGORY_LABELS).join(', ') + (customCategoriesString ? ', ' + customCategoriesString : '');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract transaction details from this text: "${text}".
      
      Categories: ${categories}
      Payment Methods: cash, card, wallet
      Types: income, expense
      
      Return a JSON object matching the schema.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            type: { type: Type.STRING }, // 'income' | 'expense'
            category: { type: Type.STRING }, 
            note: { type: Type.STRING },
            paymentMethod: { type: Type.STRING }, // 'cash' | 'card' | 'wallet'
          },
          required: ['amount', 'type', 'category', 'paymentMethod'],
        },
      },
    });

    if (!response.text) return null;
    const data = JSON.parse(response.text);

    // Basic validation / Defaults
    return {
      amount: data.amount,
      currency: data.currency || 'ج.م',
      type: data.type || 'expense',
      category: data.category || 'other',
      note: data.note || text,
      paymentMethod: data.paymentMethod || 'cash',
    } as ParsedTransaction;

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
};

/**
 * Generates financial advice based on transaction history using Gemini API.
 */
export const getFinancialAdvice = async (
  history: Transaction[], 
  userQuery: string
): Promise<string> => {
  try {
    const ai = getAIClient();
    // Summarize history to reduce token usage (limit to last 50 transactions)
    const summary = history.slice(0, 50).map(t => 
      `${t.date.split('T')[0]}: ${t.type} ${t.amount} (${t.category})`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a helpful financial advisor assistant.
      User's recent transaction history:
      ${summary}
      
      User Query: "${userQuery}"
      
      Provide a concise, helpful answer in Arabic (Egypt). Focus on insights derived from the data.`,
    });

    return response.text || "عذراً، لم أتمكن من الحصول على إجابة.";
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return "حدث خطأ في الاتصال بالمستشار الذكي (تأكد من إعدادات API Key).";
  }
};

/**
 * Fetches current market rates in Egypt (Gold, USD, Silver) using Gemini knowledge/grounding.
 */
export const getMarketRatesFromAI = async (): Promise<{ price21: number, price24: number, usdRate: number, silverPrice: number } | null> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Find current market prices in Egypt today (EGP).
            Required:
            1. Gold 21k (gram).
            2. Gold 24k (gram).
            3. USD to EGP rate.
            4. Silver (gram).

            Output JSON ONLY:
            { "price21": number, "price24": number, "usdRate": number, "silverPrice": number }`,
            config: {
                tools: [{googleSearch: {}}],
                // Note: responseSchema is removed here to prevent conflicts with Search Grounding which can cause hanging
            }
        });

        const text = response.text;
        if (!text) return null;

        // Clean up markdown code blocks if present (e.g. ```json ... ```)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Robust JSON extraction: find first { and last }
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace >= 0 && lastBrace >= 0) {
            const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
            return JSON.parse(jsonStr);
        }
        
        // Fallback parse
        return JSON.parse(cleanText);

    } catch (e) {
        console.error("Market rates fetch error", e);
        return null;
    }
};

/**
 * Generates a comprehensive investment comparison report.
 */
export const getDetailedInvestmentAnalysis = async (amount: number): Promise<InvestmentAnalysisResponse | null> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Act as an expert Egyptian financial advisor.
            User wants to invest ${amount} EGP.
            
            Task:
            1. Search for the BEST current high-yield Certificates of Deposit (CDs) in Egyptian banks (e.g., NBE, Banque Misr, CIB). Find the highest interest rate available NOW.
            2. Search for current Gold price trends and expected growth.
            3. Search for Treasury Bills (أذون الخزانة) approximate net return after tax.
            4. Compare these options: Gold (24k bullion), The Best Certificate found, Silver, and Treasury Bills.
            
            For each option:
            - Calculate expected profit after 1 year based on the amount ${amount}.
            - Provide Sharia ruling based on common Egyptian scholarly consensus (Dar Al-Ifta/Al-Azhar view). e.g., Certificates are "Allowed by Dar Al-Ifta" or "Debated", Gold is "Halal", etc.
            - List Pros and Cons.

            CRITICAL: Return the response strictly in ARABIC language (Egypt).
            - The 'title', 'details', 'shariaRuling', 'aiReasoning', 'pros', and 'cons' MUST be in Arabic.
            - Keep descriptions simple and short for a beginner.
            - 'riskLevel' must be one of: 'low', 'medium', 'high'.
            - 'type' must be one of: 'gold', 'certificate', 'silver', 'bills'.
            
            Return JSON matching the schema provided.`,
            config: {
                tools: [{googleSearch: {}}],
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        options: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING }, // 'gold', 'certificate', 'silver', 'bills'
                                    title: { type: Type.STRING },
                                    expectedReturnPercentage: { type: Type.NUMBER },
                                    profitAmount: { type: Type.NUMBER },
                                    totalValueAfterYear: { type: Type.NUMBER },
                                    riskLevel: { type: Type.STRING }, // 'low', 'medium', 'high'
                                    shariaRuling: { type: Type.STRING },
                                    details: { type: Type.STRING },
                                    pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    cons: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                        bestOption: { type: Type.STRING },
                        aiReasoning: { type: Type.STRING }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as InvestmentAnalysisResponse;
        }
        return null;
    } catch (e) {
        console.error("Investment analysis error", e);
        return null;
    }
};

/**
 * Handles follow-up questions for investment advice (The Mentor Chat).
 */
export const askInvestmentMentor = async (
    userQuery: string, 
    amount: number, 
    previousContext: any
): Promise<string> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a smart, friendly Egyptian financial mentor ("ابن بلد" tone). 
            You are talking to a BEGINNER who wants to make money but doesn't understand complex terms.
            
            Context:
            - User wants to invest: ${amount} EGP.
            - Previous Analysis provided to user: ${JSON.stringify(previousContext)}
            
            User Question: "${userQuery}"
            
            Instructions:
            1. Search online for the absolutely latest info if the question needs it (e.g. current bank rates, gold vs jewelry fees).
            2. Answer in simple Egyptian Arabic ("عامية مصرية مهذبة"). 
            3. Be direct. If they ask "Why 24k not 21k", explain that 21k has high "Masna'eya" (workmanship fees) so you lose money when selling, but 24k (Bullions) has low fees (Cashback).
            4. **FORMATTING IS CRITICAL:**
               - Use bullet points (*) for lists.
               - Use **double asterisks** for important terms like numbers or key names.
               - Use line breaks (enter) between ideas to make it readable. NEVER output a wall of text.
               - Keep paragraphs short (max 2-3 lines).
            5. Keep the answer encouraging but realistic.
            
            Output: Just the text answer.`,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        return response.text || "معلش، ممكن تعيد السؤال تاني؟";
    } catch (error) {
        console.error("Mentor Chat Error:", error);
        return "حدث خطأ في الاتصال بالمستشار، حاول تاني.";
    }
};
