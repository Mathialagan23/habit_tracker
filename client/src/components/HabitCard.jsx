import { useState } from 'react';
import { Check, Circle, Pencil, Trash2 } from 'lucide-react';

export default function HabitCard({ habit, onToggle, onEdit, onDelete }) {
  const [animating, setAnimating] = useState(false);

  const handleToggle = () => {
    if (!habit.completedToday) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    }
    onToggle();
  };

  return (
    <div
      className={`habit-card ${animating ? 'habit-card-pop' : ''}`}
      style={{ borderLeftColor: habit.color }}
    >
      <button
        className={`habit-toggle ${habit.completedToday ? 'completed' : ''}`}
        onClick={handleToggle}
      >
        {habit.completedToday ? (
          <Check size={22} className={animating ? 'check-animate' : ''} />
        ) : (
          <Circle size={22} />
        )}
      </button>
      <div className="habit-card-body" style={{ flex: 1 }}>
        <div className="habit-card-top">
          <h3 className={habit.completedToday ? 'line-through' : ''}>{habit.name}</h3>
          <div className="habit-card-actions">
            <button className="btn-icon" onClick={() => onEdit(habit)}>
              <Pencil size={14} />
            </button>
            <button className="btn-icon btn-icon-danger" onClick={() => onDelete(habit._id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {habit.description && (
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            {habit.description}
          </p>
        )}
        <div className="habit-card-meta">
          {habit.category && habit.category !== 'other' && (
            <span className="category-badge">{habit.category}</span>
          )}
          {habit.difficulty && (
            <span
              className="difficulty-badge"
              style={{
                color: habit.difficulty === 'hard' ? '#f43f5e' : habit.difficulty === 'easy' ? '#10b981' : '#f59e0b',
              }}
            >
              {habit.difficulty}
            </span>
          )}
          {habit.currentStreak > 0 && (
            <span className="streak-badge">{habit.currentStreak}d streak</span>
          )}
        </div>
      </div>
    </div>
  );
}
