// ReminderSidebar.js — Professional Reminder Sidebar for all roles
import React, { useState, useEffect } from 'react';
import {
  Bell, Plus, Check, Clock, AlertTriangle, X, Volume2, VolumeX,
  Calendar, Filter, Search, ChevronDown, ChevronUp, RefreshCw,
  Users, User, Settings, Trash2, Edit3, MoreVertical, Play, Pause
} from 'lucide-react';
import { useReminders } from '../../context/ReminderContext';
import { useAuth } from '../../context/AuthContext';

const ReminderSidebar = ({ isOpen, onClose, onNavigate }) => {
  const {
    reminders,
    activeNotifications,
    addReminder,
    markComplete,
    deleteReminder,
    snoozeReminder,
    dismissNotification,
    dismissAllNotifications,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByModule,
    settings,
    updateSettings,
    totalReminders,
    upcomingCount,
    overdueCount,
    criticalCount
  } = useReminders();

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [filterModule, setFilterModule] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(settings.notificationSound);

  // Filter reminders based on user role and filters
  const filteredReminders = React.useMemo(() => {
    let filtered = reminders;

    // Filter by tab
    if (activeTab === 'upcoming') {
      filtered = getUpcomingReminders();
    } else if (activeTab === 'overdue') {
      filtered = getOverdueReminders();
    } else if (activeTab === 'all') {
      filtered = reminders.filter(r => r.status !== 'completed');
    }

    // Filter by module
    if (filterModule !== 'all') {
      filtered = filtered.filter(r => r.module === filterModule);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    // Role-based filtering - show reminders relevant to user's role
    if (user?.role) {
      const roleModuleMap = {
        'Sales': ['sales', 'crm', 'quotation'],
        'Survey Engineer': ['survey'],
        'Design Engineer': ['design'],
        'Project Manager': ['project', 'installation', 'commissioning'],
        'Store Manager': ['inventory', 'procurement'],
        'Procurement Officer': ['procurement', 'logistics'],
        'Finance': ['finance'],
        'Technician': ['installation', 'service'],
        'Service Manager': ['service', 'commissioning'],
        'Admin': ['all']
      };

      const allowedModules = roleModuleMap[user.role] || ['all'];
      if (!allowedModules.includes('all')) {
        filtered = filtered.filter(r =>
          allowedModules.includes(r.module) ||
          r.assignedTo === user.email ||
          r.createdBy === user.email
        );
      }
    }

    return filtered.sort((a, b) => a.dueDate - b.dueDate);
  }, [reminders, activeTab, filterModule, filterPriority, searchQuery, user, getUpcomingReminders, getOverdueReminders]);

  const modules = [
    { id: 'sales', label: 'Sales', color: '#a855f7' },
    { id: 'survey', label: 'Survey', color: '#06b6d4' },
    { id: 'design', label: 'Design', color: '#6366f1' },
    { id: 'finance', label: 'Finance', color: '#10b981' },
    { id: 'procurement', label: 'Procurement', color: '#f43f5e' },
    { id: 'service', label: 'Service', color: '#ec4899' },
    { id: 'inventory', label: 'Inventory', color: '#f97316' },
    { id: 'installation', label: 'Installation', color: '#14b8a6' },
    { id: 'project', label: 'Project', color: '#f59e0b' },
    { id: 'logistics', label: 'Logistics', color: '#8b5cf6' },
    { id: 'commissioning', label: 'Commissioning', color: '#3b82f6' }
  ];

  const priorities = [
    { id: 'critical', label: 'Critical', color: '#ef4444' },
    { id: 'high', label: 'High', color: '#f97316' },
    { id: 'medium', label: 'Medium', color: '#f59e0b' },
    { id: 'low', label: 'Low', color: '#3b82f6' }
  ];

  const getPriorityColor = (priority) => {
    const p = priorities.find(p => p.id === priority);
    return p?.color || '#6b7280';
  };

  const getModuleColor = (module) => {
    const m = modules.find(m => m.id === module);
    return m?.color || '#6b7280';
  };

  const formatTimeRemaining = (dueDate) => {
    const now = new Date();
    const diff = dueDate - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      const overdueHours = Math.abs(hours);
      return `Overdue by ${overdueHours}h ${Math.abs(minutes)}m`;
    }

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} days left`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }

    return `${minutes}m left`;
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    updateSettings({ notificationSound: newState });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="relative w-full max-w-md h-full bg-[var(--bg-elevated)] border-l border-[var(--border-base)] shadow-2xl flex flex-col animate-slide-in-right pt-safe">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center">
              <Bell size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Reminders</h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                {upcomingCount} upcoming · {overdueCount} overdue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg transition-colors ${soundEnabled
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                }`}
              title={soundEnabled ? 'Sound On' : 'Sound Off'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="p-2 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors"
              title="Add Reminder"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Active Notifications */}
        {activeNotifications.length > 0 && (
          <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                Active Alerts ({activeNotifications.length})
              </span>
              <button
                onClick={dismissAllNotifications}
                className="text-[9px] text-red-400 hover:text-red-300"
              >
                Dismiss All
              </button>
            </div>
            <div className="space-y-1">
              {activeNotifications.slice(0, 3).map(notif => (
                <div
                  key={notif.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--text-primary)] truncate">{notif.title}</p>
                    <p className="text-[9px] text-red-400">{notif.timeToGo}</p>
                  </div>
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="px-3 py-3 border-b border-[var(--border-base)] space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[11px] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Modules</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[11px] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-base)]">
          {[
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'overdue', label: 'Overdue', count: overdueCount },
            { id: 'all', label: 'All', count: totalReminders }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-[11px] font-medium transition-colors relative ${activeTab === tab.id
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${tab.id === 'overdue' && tab.count > 0
                    ? 'bg-red-500/20 text-red-400'
                    : activeTab === tab.id
                      ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                  }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-3">
                <Bell size={24} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">No reminders found</p>
              <p className="text-[10px] text-[var(--text-faint)] mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Add a new reminder to get started'}
              </p>
            </div>
          ) : (
            filteredReminders.map(reminder => {
              const isExpanded = expandedReminder === reminder.id;
              const priorityColor = getPriorityColor(reminder.priority);
              const moduleColor = getModuleColor(reminder.module);

              return (
                <div
                  key={reminder.id}
                  className={`group rounded-xl border transition-all ${reminder.status === 'overdue'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-[var(--bg-base)] border-[var(--border-base)] hover:border-[var(--primary)]/30'
                    }`}
                >
                  {/* Main Row */}
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Priority Indicator */}
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                        style={{ backgroundColor: priorityColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                            {reminder.title}
                          </h3>
                          <div className="flex items-center gap-1">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{
                                backgroundColor: `${moduleColor}20`,
                                color: moduleColor
                              }}
                            >
                              {modules.find(m => m.id === reminder.module)?.label || reminder.module}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                          {reminder.description}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className={
                              reminder.status === 'overdue' ? 'text-red-400' : 'text-[var(--text-faint)]'
                            } />
                            <span className={`text-[10px] ${reminder.status === 'overdue' ? 'text-red-400 font-medium' : 'text-[var(--text-muted)]'
                              }`}>
                              {formatTimeRemaining(reminder.dueDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                snoozeReminder(reminder.id, 15);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                              title="Snooze 15 min"
                            >
                              <Pause size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markComplete(reminder.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500"
                              title="Mark Complete"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-[var(--border-base)] pt-2">
                      <div className="space-y-2">
                        {reminder.assignedTo && (
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <User size={12} />
                            <span>Assigned to: {reminder.assignedTo}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                          <Calendar size={12} />
                          <span>Due: {reminder.dueDate.toLocaleString()}</span>
                        </div>

                        {reminder.recurring && (
                          <div className="flex items-center gap-2 text-[11px] text-[var(--primary)]">
                            <RefreshCw size={12} />
                            <span>Recurring: {reminder.recurringPattern}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border-base)]">
                          <button
                            onClick={() => markComplete(reminder.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 text-[11px] font-medium hover:bg-green-500/20 transition-colors"
                          >
                            <Check size={14} />
                            Complete
                          </button>
                          <button
                            onClick={() => snoozeReminder(reminder.id, 15)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)] text-[11px] font-medium hover:bg-[var(--border-base)] transition-colors"
                          >
                            <Pause size={14} />
                            Snooze
                          </button>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-3 border-t border-[var(--border-base)] bg-[var(--bg-hover)]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-[var(--primary)]">{upcomingCount}</p>
              <p className="text-[9px] text-[var(--text-muted)]">Upcoming</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{overdueCount}</p>
              <p className="text-[9px] text-[var(--text-muted)]">Overdue</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-500">{criticalCount}</p>
              <p className="text-[9px] text-[var(--text-muted)]">Critical</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderSidebar;
