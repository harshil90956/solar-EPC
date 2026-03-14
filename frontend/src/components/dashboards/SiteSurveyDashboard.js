import React from 'react';
import { MapPin, Calendar, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';

// SiteSurveyDashboard - Survey Analytics Dashboard
const SiteSurveyDashboard = ({ surveys = [], loading, onRefresh }) => {
  const totalSurveys = surveys.length;
  const completedSurveys = surveys.filter(s => s.status === 'Completed' || s.status === 'Done').length;
  const pendingSurveys = surveys.filter(s => s.status === 'Pending' || s.status === 'Scheduled').length;
  const inProgressSurveys = surveys.filter(s => s.status === 'In Progress').length;

  const stats = [
    { label: 'Total Surveys', value: totalSurveys, icon: MapPin, color: 'bg-blue-500' },
    { label: 'Completed', value: completedSurveys, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'In Progress', value: inProgressSurveys, icon: Clock, color: 'bg-amber-500' },
    { label: 'Pending', value: pendingSurveys, icon: Calendar, color: 'bg-purple-500' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-elevated)] rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[var(--bg-elevated)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card p-5 rounded-xl border border-[var(--border-base)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.color}/20 flex items-center justify-center`}>
                  <Icon size={20} className={`${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Surveys */}
      <div className="glass-card p-6 rounded-xl border border-[var(--border-base)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Surveys</h3>
          <button 
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
        
        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">No surveys available</p>
            <p className="text-sm text-[var(--text-faint)] mt-1">Create a new survey to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.slice(0, 5).map((survey) => (
              <div key={survey.id || survey._id} className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-muted)]/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    survey.status === 'Completed' ? 'bg-green-500' :
                    survey.status === 'In Progress' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{survey.customerName || survey.customer || 'Unknown'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{survey.siteAddress || survey.location || 'No location'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  survey.status === 'Completed' ? 'bg-green-500/20 text-green-600' :
                  survey.status === 'In Progress' ? 'bg-amber-500/20 text-amber-600' :
                  'bg-blue-500/20 text-blue-600'
                }`}>
                  {survey.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteSurveyDashboard;
