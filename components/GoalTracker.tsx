import React, { useState } from 'react';
import { FinancialGoal } from '../types';
import { CURRENCY } from '../constants';
import { Target, Plus, Trash2, Calendar, TrendingUp, Save } from 'lucide-react';

interface GoalTrackerProps {
  goals: FinancialGoal[];
  onAdd: (goal: FinancialGoal) => void;
  onUpdate: (goal: FinancialGoal) => void;
  onDelete: (id: string) => void;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ goals, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<FinancialGoal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;

    onAdd({
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: Number(newGoal.targetAmount),
      currentAmount: Number(newGoal.currentAmount) || 0,
      deadline: newGoal.deadline,
    } as FinancialGoal);

    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, deadline: '' });
    setShowForm(false);
  };

  const handleAddFunds = (goal: FinancialGoal) => {
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    onUpdate({
      ...goal,
      currentAmount: goal.currentAmount + amount
    });
    setEditingId(null);
    setAddAmount('');
  };

  const getProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const getDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? `${days} يوم متبقي` : 'انتهى الوقت';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Add Button */}
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              أهدافي المالية
            </h2>
            <p className="text-sm text-gray-400">تابع تقدمك نحو أحلامك المالية</p>
         </div>
         <button 
           onClick={() => setShowForm(!showForm)}
           className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
         >
           {showForm ? 'إلغاء' : 'هدف جديد'}
           {!showForm && <Plus size={18} />}
         </button>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 mb-2">
            <h3 className="font-bold text-gray-700">إضافة هدف جديد</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-500">اسم الهدف</label>
            <input 
              type="text" 
              required
              placeholder="مثال: شراء سيارة، زواج..."
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              value={newGoal.name}
              onChange={e => setNewGoal({...newGoal, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">المبلغ المطلوب ({CURRENCY})</label>
            <input 
              type="number" 
              required
              placeholder="0.00"
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              value={newGoal.targetAmount || ''}
              onChange={e => setNewGoal({...newGoal, targetAmount: parseFloat(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">المبلغ الحالي (اختياري)</label>
            <input 
              type="number" 
              placeholder="0.00"
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              value={newGoal.currentAmount || ''}
              onChange={e => setNewGoal({...newGoal, currentAmount: parseFloat(e.target.value)})}
            />
          </div>

           <div className="space-y-2">
            <label className="text-sm text-gray-500">تاريخ التحقيق</label>
            <input 
              type="date" 
              required
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              value={newGoal.deadline}
              onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
            />
          </div>

          <div className="col-span-1 md:col-span-2 pt-2">
             <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
               حفظ الهدف
             </button>
          </div>
        </form>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{goal.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Calendar size={12} />
                  <span>{getDaysLeft(goal.deadline)}</span>
                </div>
              </div>
              <button onClick={() => onDelete(goal.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">تم توفير: <span className="text-green-600 font-bold">{goal.currentAmount.toLocaleString()}</span></span>
                <span className="text-gray-500">الهدف: <span className="text-gray-800 font-bold">{goal.targetAmount.toLocaleString()}</span></span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500 relative" 
                  style={{width: `${getProgress(goal.currentAmount, goal.targetAmount)}%`}}
                >
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <div className="text-right text-xs text-gray-400">
                {Math.round(getProgress(goal.currentAmount, goal.targetAmount))}% مكتمل
              </div>
            </div>

            {/* Quick Add Funds Action */}
            <div className="pt-3 border-t border-gray-50">
               {editingId === goal.id ? (
                 <div className="flex gap-2 animate-fade-in">
                   <input 
                     type="number" 
                     autoFocus
                     placeholder="المبلغ..." 
                     className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                     value={addAmount}
                     onChange={e => setAddAmount(e.target.value)}
                   />
                   <button 
                     onClick={() => handleAddFunds(goal)}
                     className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                   >
                     <Save size={16} />
                   </button>
                   <button 
                     onClick={() => { setEditingId(null); setAddAmount(''); }}
                     className="bg-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-300 transition-colors"
                   >
                     x
                   </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => { setEditingId(goal.id); setAddAmount(''); }}
                   className="w-full py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                 >
                   <TrendingUp size={16} />
                   إضافة مدخرات
                 </button>
               )}
            </div>
          </div>
        ))}

        {goals.length === 0 && !showForm && (
           <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
             <Target className="w-12 h-12 mb-2 opacity-50" />
             <p>لا توجد أهداف حالية. ابدأ بإضافة هدف جديد!</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default GoalTracker;