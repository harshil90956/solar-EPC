import React, { useState, useEffect } from 'react';
import { Clock, Save, Building2, AlertCircle, Info, Coffee } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/apiClient';

const weekDays = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const defaultPolicy = {
  checkInTime: '09:00',
  checkOutTime: '18:00',
  gracePeriodMinutes: 15,
  halfDayAfterMinutes: 240,
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  lateMarkAfterMinutes: 30,
  earlyLeaveBeforeMinutes: 30,
  overtimeThresholdMinutes: 30,
  breakStartTime: '12:00',
  breakEndTime: '13:00',
  isBreakTimeDeducted: true,
  isActive: true,
};

const AttendancePolicySettings = () => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(defaultPolicy);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExistingPolicy, setHasExistingPolicy] = useState(false);

  useEffect(() => {
    console.log('[DEBUG] AttendancePolicySettings MOUNTED');
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hrm/attendance/policy');
      if (response.data?.success && response.data?.data) {
        setPolicy({ ...defaultPolicy, ...response.data.data });
        setHasExistingPolicy(true);
      }
    } catch (error) {
      console.log('No existing policy found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('[DEBUG] handleSave called');
    setSaving(true);
    try {
      const response = await api.post('/hrm/attendance/policy', policy);
      if (response.data?.success) {
        toast.success('Attendance policy saved successfully');
        setHasExistingPolicy(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setPolicy(prev => ({ ...prev, [field]: value }));
  };

  const toggleWorkingDay = (dayId) => {
    setPolicy(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayId)
        ? prev.workingDays.filter(d => d !== dayId)
        : [...prev.workingDays, dayId],
    }));
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {console.log('[DEBUG] AttendancePolicySettings RENDERING')}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Attendance Policy Settings</h2>
            <p className="text-sm text-gray-500">Define company-wide check-in/check-out rules</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Policy'}
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">How it works</p>
          <p className="text-sm text-blue-600 mt-1">
            These settings define when employees should check in and out. 
            Late marks and early departures are calculated based on these times.
            Changes take effect immediately for all attendance records.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in/Check-out Times */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Standard Timings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard Check-in Time
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={policy.checkInTime}
                  onChange={(e) => handleChange('checkInTime', e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-gray-500">
                  ({formatTime(policy.checkInTime)})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Employees should check in by this time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard Check-out Time
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={policy.checkOutTime}
                  onChange={(e) => handleChange('checkOutTime', e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-gray-500">
                  ({formatTime(policy.checkOutTime)})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Standard working day ends at this time
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grace Period (minutes)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={policy.gracePeriodMinutes}
                  onChange={(e) => handleChange('gracePeriodMinutes', parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Employees can check in late by this many minutes without penalty
              </p>
            </div>
          </div>
        </div>

        {/* Late/Early Rules */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Late & Early Rules</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Mark Threshold (minutes)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={policy.lateMarkAfterMinutes}
                  onChange={(e) => handleChange('lateMarkAfterMinutes', parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">minutes after check-in time</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Beyond grace period, employees are marked late after this many minutes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Half Day Threshold (minutes)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="480"
                  value={policy.halfDayAfterMinutes}
                  onChange={(e) => handleChange('halfDayAfterMinutes', parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Arriving this late marks attendance as Half Day
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Early Leave Threshold (minutes)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={policy.earlyLeaveBeforeMinutes}
                  onChange={(e) => handleChange('earlyLeaveBeforeMinutes', parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">minutes before check-out time</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leaving before this threshold marks as Early Exit
              </p>
            </div>
          </div>
        </div>

        {/* Break Time Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Coffee className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Break Time Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isBreakTimeDeducted"
                checked={policy.isBreakTimeDeducted}
                onChange={(e) => handleChange('isBreakTimeDeducted', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="isBreakTimeDeducted" className="text-sm font-medium text-gray-700">
                Deduct break time from total hours
              </label>
            </div>

            {policy.isBreakTimeDeducted && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break Start Time
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="time"
                        value={policy.breakStartTime}
                        onChange={(e) => handleChange('breakStartTime', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">
                        ({formatTime(policy.breakStartTime)})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break End Time
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="time"
                        value={policy.breakEndTime}
                        onChange={(e) => handleChange('breakEndTime', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">
                        ({formatTime(policy.breakEndTime)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Break Duration:</strong> {(() => {
                      const [startH, startM] = policy.breakStartTime.split(':').map(Number);
                      const [endH, endM] = policy.breakEndTime.split(':').map(Number);
                      let diff = (endH * 60 + endM) - (startH * 60 + startM);
                      if (diff < 0) diff += 24 * 60;
                      const hours = Math.floor(diff / 60);
                      const mins = diff % 60;
                      return `${hours}h ${mins}m`;
                    })()} will be deducted from total working hours
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Working Days */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Working Days</h3>
          </div>

          <div className="grid grid-cols-7 gap-3 mt-4">
            {weekDays.map((day) => (
              <button
                key={day.id}
                onClick={() => toggleWorkingDay(day.id)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  policy.workingDays.includes(day.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Click to toggle working days. Attendance is only tracked on selected days.
          </p>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Policy Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-500 mb-1">Office Hours</p>
            <p className="font-semibold text-gray-900">
              {formatTime(policy.checkInTime)} - {formatTime(policy.checkOutTime)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {policy.gracePeriodMinutes} min grace period
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-500 mb-1">Working Days</p>
            <p className="font-semibold text-gray-900">
              {policy.workingDays.length} days/week
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {policy.workingDays.map(d => d.slice(0, 3)).join(', ')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-500 mb-1">Late Rules</p>
            <p className="font-semibold text-gray-900">
              Late after {policy.lateMarkAfterMinutes} min
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Half day after {policy.halfDayAfterMinutes} min
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicySettings;
