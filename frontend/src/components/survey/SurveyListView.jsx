import React, { useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  Play,
  MapPin,
  User,
  Zap,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function SurveyListView({
  surveys,
  search,
  onSearch,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onStartSurvey
}) {
  // Filter surveys based on search
  const filteredSurveys = useMemo(() => {
    if (!search) return surveys;
    const searchLower = search.toLowerCase();
    return surveys.filter(s =>
      s.customerName?.toLowerCase().includes(searchLower) ||
      s.id?.toLowerCase().includes(searchLower) ||
      s.site?.toLowerCase().includes(searchLower) ||
      s.engineer?.toLowerCase().includes(searchLower)
    );
  }, [surveys, search]);

  // Pagination
  const totalPages = Math.ceil(filteredSurveys.length / pageSize) || 1;
  const paginatedSurveys = filteredSurveys.slice((page - 1) * pageSize, page * pageSize);

  // Empty state
  if (filteredSurveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4">
          <Inbox size={32} className="text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          No surveys available
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center max-w-md">
          {search 
            ? `No surveys found matching "${search}". Try adjusting your search terms.`
            : "There are no surveys in the system yet. Create a new survey to get started."
          }
        </p>
        {search && (
          <Button 
            variant="outline" 
            onClick={() => onSearch('')}
            className="mt-4"
          >
            Clear Search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-base)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={16} />
          <Input
            placeholder="Search by lead name, location, or engineer..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span>{filteredSurveys.length} surveys</span>
        </div>
      </div>

      {/* Survey Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedSurveys.map((survey) => (
          <SurveyCard
            key={survey.id}
            survey={survey}
            onView={() => onView(survey)}
            onEdit={() => onEdit(survey)}
            onDelete={() => onDelete(survey)}
            onStartSurvey={() => onStartSurvey(survey)}
          />
        ))}
      </div>

      {/* Pagination */}
      {filteredSurveys.length > pageSize && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-base)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredSurveys.length)} of {filteredSurveys.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-[var(--bg-hovered)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-[var(--primary)] text-white'
                        : 'hover:bg-[var(--bg-hovered)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-1 text-[var(--text-muted)]">...</span>
                  <button
                    onClick={() => onPageChange(totalPages)}
                    className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-hovered)] text-[var(--text-secondary)]"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-[var(--bg-hovered)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)]"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      )}
    </div>
  );
}

function SurveyCard({ survey, onView, onEdit, onDelete, onStartSurvey }) {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };

  return (
    <div className="group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] overflow-hidden hover:shadow-lg transition-all hover:border-[var(--primary)]/30">
      {/* Card Header */}
      <div className="p-4 border-b border-[var(--border-base)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar size="md" className="bg-[var(--primary)]/10 text-[var(--primary)]">
              {survey.customerName?.charAt(0) || 'S'}
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-semibold text-[var(--text-primary)] truncate">
                {survey.customerName}
              </h4>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <MapPin size={10} />
                {survey.site || 'Location not set'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${statusColors[survey.status] || statusColors.pending}`}>
            {survey.status?.toUpperCase() || 'PENDING'}
          </span>
        </div>

        {/* Capacity Badge */}
        <div className="flex items-center gap-2 text-sm">
          <Zap size={14} className="text-[var(--solar)]" />
          <span className="font-medium text-[var(--text-primary)]">
            {survey.estimatedKw ? `${survey.estimatedKw} kW` : 'Capacity not set'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <User size={14} />
          <span>{survey.engineer || 'Unassigned'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Calendar size={14} />
          <span>
            {survey.scheduledDate 
              ? format(new Date(survey.scheduledDate), 'MMM dd, yyyy')
              : 'Not scheduled'
            }
          </span>
        </div>

        {/* Shadow Percentage */}
        {survey.shadowPct !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <div 
              className={`w-2 h-2 rounded-full ${
                survey.shadowPct > 10 ? 'bg-red-400' : 'bg-emerald-400'
              }`} 
            />
            <span className="text-[var(--text-secondary)]">
              Shadow: {survey.shadowPct}%
            </span>
          </div>
        )}
      </div>

      {/* Card Footer - Actions */}
      <div className="p-4 pt-0 flex items-center gap-2">
        {survey.status === 'pending' && (
          <Button
            size="sm"
            variant="primary"
            onClick={onStartSurvey}
            className="flex-1"
          >
            <Play size={14} className="mr-1" />
            Start Survey
          </Button>
        )}
        
        <button
          onClick={onView}
          className="p-2 rounded-lg hover:bg-[var(--bg-hovered)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="View"
        >
          <Eye size={16} />
        </button>
        
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-[var(--bg-hovered)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-red-50 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
