import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { statsApi } from '../api';
import toast from 'react-hot-toast';

export default function Streaks() {
  const [streaks, setStreaks] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streakRes, scoreRes] = await Promise.all([
          statsApi.streaks(),
          statsApi.scores(),
        ]);
        setStreaks(streakRes.data.data || []);
        setScores(scoreRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load streaks');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  const scoreMap = {};
  scores.forEach((s) => {
    scoreMap[s.habitId] = s;
  });

  return (
    <div className="page">
      <h1>Streaks</h1>
      {streaks.length === 0 ? (
        <div className="empty-state">No habits yet. Create one to start tracking streaks!</div>
      ) : (
        <div className="streak-list">
          {streaks.map((habit) => (
            <div key={habit.habitId} className="streak-card">
              <div className="streak-icon">
                <Flame
                  size={28}
                  color={habit.currentStreak > 0 ? '#f59e0b' : '#cbd5e1'}
                />
              </div>
              <div className="streak-info">
                <div className="streak-header-row">
                  <h3>{habit.name}</h3>
                  <div className="streak-badges">
                    {scoreMap[habit.habitId] && (
                      <span className="score-inline">
                        {Math.round(scoreMap[habit.habitId].score)}pts
                      </span>
                    )}
                  </div>
                </div>
                <div className="streak-numbers">
                  <span className="current-streak">
                    {habit.currentStreak}d current
                  </span>
                  <span className="best-streak">
                    {habit.bestStreak}d best
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
