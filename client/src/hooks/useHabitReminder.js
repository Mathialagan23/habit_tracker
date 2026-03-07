import { useEffect, useRef } from 'react';

export default function useHabitReminder(habits) {
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!habits || habits.length === 0) return;

    const check = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      habits.forEach((habit) => {
        if (!habit.reminderTime || habit.completedToday) return;

        const key = `${habit._id}-${currentTime}`;
        if (habit.reminderTime === currentTime && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);

          if (Notification.permission === 'granted') {
            new Notification('Habit Reminder', {
              body: `Time to complete: ${habit.name}`,
              icon: '/vite.svg',
            });
          }
        }
      });
    };

    check();
    const interval = setInterval(check, 60_000);

    return () => clearInterval(interval);
  }, [habits]);
}
