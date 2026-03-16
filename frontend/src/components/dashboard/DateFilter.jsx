import React from 'react';

/**
 * Reusable Date Filter Component for Dashboard Charts
 * Usage: <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
 */
export const DateFilter = ({ dateRange, onDateRangeChange, size = 'sm' }) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  const baseClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onDateRangeChange(filter.key)}
          className={`${baseClasses} rounded-md font-medium transition-all ${
            dateRange === filter.key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Filter data by date range
 * Usage: const filteredData = filterByDateRange(data, dateRange, 'createdAt')
 */
export const filterByDateRange = (data, dateRange, dateField = 'createdAt') => {
  if (!data || !Array.isArray(data) || dateRange === 'all') return data;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getStartDate = () => {
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  };

  const startDate = getStartDate();
  if (!startDate) return data;

  return data.filter(item => {
    const itemDate = new Date(item[dateField] || item.date || item.created || item.timestamp);
    return itemDate >= startDate;
  });
};

/**
 * Filter leads/agents by date range (specialized for lead data)
 */
export const filterLeadsByDateRange = (leads, dateRange) => {
  if (!leads || !Array.isArray(leads) || dateRange === 'all') return leads;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getStartDate = () => {
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  };

  const startDate = getStartDate();
  if (!startDate) return leads;

  return leads.filter(lead => {
    const leadDate = new Date(lead.createdAt || lead.created_at || lead.date || lead.created);
    return leadDate >= startDate;
  });
};

export default DateFilter;
