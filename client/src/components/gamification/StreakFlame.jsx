import { motion } from 'framer-motion';

const TIERS = [
  { min: 100, label: 'Legendary', color: '#8b5cf6' },
  { min: 30, label: 'Gold', color: '#f59e0b' },
  { min: 7, label: 'Silver', color: '#94a3b8' },
  { min: 3, label: 'Bronze', color: '#f97316' },
];

function getTier(streak) {
  return TIERS.find((t) => streak >= t.min) || null;
}

export default function StreakFlame({ streak }) {
  if (!streak || streak < 1) return null;

  const tier = getTier(streak);

  return (
    <motion.div
      className="streak-flame"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <span className="streak-flame-icon" style={{ color: tier?.color || '#f59e0b' }}>
        🔥
      </span>
      <div className="streak-flame-info">
        <span className="streak-flame-count">{streak} Day Streak</span>
        {tier && (
          <span className="streak-flame-tier" style={{ color: tier.color }}>
            {tier.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
