import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await usersApi.updateProfile(profile);
      useAuthStore.setState({ user: data.data });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await usersApi.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password updated');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account? All data will be permanently removed.')) return;
    try {
      await usersApi.deleteAccount();
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete account');
    }
  };

  return (
    <div className="page">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Profile</h2>
        <form onSubmit={handleProfileSave} className="settings-form">
          <div className="form-group">
            <label>Name</label>
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Avatar URL</label>
            <input
              value={profile.avatar}
              onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
              maxLength={500}
            />
          </div>
          {profile.avatar && (
            <img className="settings-avatar-preview" src={profile.avatar} alt="Avatar preview" />
          )}
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange} className="settings-form">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      <div className="settings-section settings-danger">
        <h2>Danger Zone</h2>
        <p className="text-muted">Permanently delete your account and all associated data.</p>
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete Account
        </button>
      </div>
    </div>
  );
}
