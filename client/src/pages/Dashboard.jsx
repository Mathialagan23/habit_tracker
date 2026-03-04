import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BarChart3, LayoutDashboard, ListChecks } from 'lucide-react';
import { habitsApi, logsApi, statsApi } from '../api';
import HabitCard from '../components/HabitCard';
import EditHabitModal from '../components/EditHabitModal';
import WeeklyChart from '../components/WeeklyChart';
import MonthlyChart from '../components/MonthlyChart';
import HeatMap from '../components/HeatMap';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editHabit, setEditHabit] = useState(null);
  const [activeSection, setActiveSection] = useState('dash-overview');

  const overviewRef = useRef(null);
  const analyticsRef = useRef(null);
  const habitsRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, weekRes, monthRes, heatRes] = await Promise.all([
        statsApi.dashboard(),
        statsApi.weekly(),
        statsApi.monthly(),
        statsApi.heatmap(),
      ]);
      setDashboard(dashRes.data.data);
      setWeekly(weekRes.data.data);
      setMonthly(monthRes.data.data);
      setHeatmap(heatRes.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll spy
  useEffect(() => {
    const sections = [
      overviewRef.current,
      analyticsRef.current,
      habitsRef.current
    ].filter(Boolean);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-120px 0px -40% 0px",
        threshold: 0.25
      }
    );

    sections.forEach((section) => observer.observe(section));

    // Detect when user reaches bottom → activate habits
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 50
      ) {
        setActiveSection("dash-habits");
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [loading]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggle = async (habitId) => {
    try {
      await logsApi.create(habitId);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to toggle habit');
    }
  };

  const handleEdit = (habit) => {
    setEditHabit(habit);
  };

  const handleSave = async (id, data) => {
    try {
      await habitsApi.update(id, data);
      setEditHabit(null);
      toast.success('Habit updated');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update habit');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit? This cannot be undone.')) return;
    try {
      await habitsApi.remove(id);
      toast.success('Habit deleted');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete habit');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const habits = dashboard?.habits || [];
  const stats = dashboard || {};

  return (
    <div className="page">
      <nav className="dash-nav">
        <button
          className={`dash-nav-btn ${activeSection === 'dash-overview' ? 'active' : ''}`}
          onClick={() => scrollTo('dash-overview')}
        >
          <LayoutDashboard size={14} /> Dashboard
        </button>
        <button
          className={`dash-nav-btn ${activeSection === 'dash-analytics' ? 'active' : ''}`}
          onClick={() => scrollTo('dash-analytics')}
        >
          <BarChart3 size={14} /> Analytics
        </button>
        <button
          className={`dash-nav-btn ${activeSection === 'dash-habits' ? 'active' : ''}`}
          onClick={() => scrollTo('dash-habits')}
        >
          <ListChecks size={14} /> Habits
        </button>
      </nav>

      <div id="dash-overview" ref={overviewRef}>
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <Link to="/habits/new" className="btn btn-primary">
            <Plus size={18} /> New Habit
          </Link>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{stats.todayCompleted || 0}</span>
            <span className="stat-label">Done Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalActiveHabits || 0}</span>
            <span className="stat-label">Active Habits</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.weeklyCompletionRate || 0}%</span>
            <span className="stat-label">Weekly Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{monthly?.consistencyScore || 0}%</span>
            <span className="stat-label">Consistency</span>
          </div>
        </div>
      </div>

      <div id="dash-analytics" ref={analyticsRef}>
        <HeatMap data={heatmap} />

        <div className="charts-row">
          <WeeklyChart data={weekly} totalHabits={stats.totalActiveHabits || 0} />
          <MonthlyChart data={monthly} />
        </div>
      </div>

      <div id="dash-habits" ref={habitsRef}>
        <h2 className="section-title">Your Habits</h2>
        {habits.length === 0 ? (
          <div className="empty-state">
            No habits yet. <Link to="/habits/new">Create your first habit</Link>
          </div>
        ) : (
          <div className="habit-list">
            {habits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                onToggle={() => handleToggle(habit._id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {editHabit && (
        <EditHabitModal
          habit={editHabit}
          onSave={handleSave}
          onClose={() => setEditHabit(null)}
        />
      )}
    </div>
  );
}
