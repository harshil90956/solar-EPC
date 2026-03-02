// AddReminderModal.js — Modal for creating new reminders
import React, { useState } from 'react';
import { X, Bell, Volume2, Smartphone, Plus } from 'lucide-react';
import { useReminders } from '../../context/ReminderContext';

const AddReminderModal = ({ isOpen, onClose }) => {
    const { addReminder } = useReminders();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        module: 'sales',
        priority: 'medium',
        type: 'task',
        dueDate: '',
        dueTime: '',
        assignedTo: '',
        notificationChannels: ['in-app'],
        recurring: false,
        recurringPattern: 'daily',
        metadata: {}
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Combine date and time
        const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);

        const reminderData = {
            ...formData,
            dueDate: dueDateTime,
            createdBy: 'current-user', // In real app, get from auth context
        };

        addReminder(reminderData);
        onClose();

        // Reset form
        setFormData({
            title: '',
            description: '',
            module: 'sales',
            priority: 'medium',
            type: 'task',
            dueDate: '',
            dueTime: '',
            assignedTo: '',
            notificationChannels: ['in-app'],
            recurring: false,
            recurringPattern: 'daily',
            metadata: {}
        });
    };

    const handleChannelToggle = (channel) => {
        setFormData(prev => ({
            ...prev,
            notificationChannels: prev.notificationChannels.includes(channel)
                ? prev.notificationChannels.filter(c => c !== channel)
                : [...prev.notificationChannels, channel]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-elevated)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[var(--border-base)]">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Reminder</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    placeholder="Enter reminder title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors resize-none"
                                    placeholder="Enter reminder description"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Module
                                    </label>
                                    <select
                                        value={formData.module}
                                        onChange={(e) => setFormData(prev => ({ ...prev, module: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    >
                                        <option value="sales">Sales</option>
                                        <option value="survey">Survey</option>
                                        <option value="design">Design</option>
                                        <option value="finance">Finance</option>
                                        <option value="procurement">Procurement</option>
                                        <option value="service">Service</option>
                                        <option value="inventory">Inventory</option>
                                        <option value="installation">Installation</option>
                                        <option value="project">Project</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Priority
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    >
                                        <option value="task">Task</option>
                                        <option value="followup">Follow-up</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="approval">Approval</option>
                                        <option value="payment">Payment</option>
                                        <option value="procurement">Procurement</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="deployment">Deployment</option>
                                        <option value="stock-alert">Stock Alert</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Assigned To
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                        placeholder="Assign to user/role"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Schedule</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Due Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                        Due Time *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.dueTime}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Recurring Options */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.recurring}
                                        onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.checked }))}
                                        className="w-4 h-4 text-[var(--primary)] bg-[var(--bg-base)] border-[var(--border-base)] rounded focus:ring-[var(--primary)] focus:ring-2"
                                    />
                                    <span className="text-sm font-medium text-[var(--text-primary)]">Recurring reminder</span>
                                </label>

                                {formData.recurring && (
                                    <div className="mt-2">
                                        <select
                                            value={formData.recurringPattern}
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurringPattern: e.target.value }))}
                                            className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notification Channels */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Notification Channels</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleChannelToggle('in-app')}
                                    className={`p-3 rounded-lg border transition-all ${formData.notificationChannels.includes('in-app')
                                        ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                                        : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'
                                        }`}
                                >
                                    <Bell size={20} className="mx-auto mb-1" />
                                    <div className="text-xs font-medium">In-App</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleChannelToggle('voice')}
                                    className={`p-3 rounded-lg border transition-all ${formData.notificationChannels.includes('voice')
                                        ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                                        : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'
                                        }`}
                                >
                                    <Volume2 size={20} className="mx-auto mb-1" />
                                    <div className="text-xs font-medium">Voice</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleChannelToggle('sms')}
                                    className={`p-3 rounded-lg border transition-all ${formData.notificationChannels.includes('sms')
                                        ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                                        : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'
                                        }`}
                                >
                                    <Smartphone size={20} className="mx-auto mb-1" />
                                    <div className="text-xs font-medium">SMS</div>
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-6 border-t border-[var(--border-base)]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-lg text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                Create Reminder
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddReminderModal;
