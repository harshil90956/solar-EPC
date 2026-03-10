import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Download,
  Upload,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Archive,
  Calendar,
  HardDrive,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function CreateBackupModal({ isOpen, onClose, onCreate, tenants }) {
  const [backupType, setBackupType] = useState('full');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    // Simulate backup creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    onCreate({
      type: backupType === 'full' ? 'Full Database' : `Tenant Specific - ${tenants.find(t => t.id === parseInt(selectedTenant))?.name}`,
      size: backupType === 'full' ? '2.5 GB' : '450 MB',
      status: 'Completed',
    });

    setIsCreating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div variants={itemVariants} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Create Backup</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Backup Type</label>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${backupType === 'full' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  value="full"
                  checked={backupType === 'full'}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Full Database Backup</p>
                  <p className="text-sm text-gray-500">Backup entire platform database</p>
                </div>
              </label>

              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${backupType === 'tenant' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  value="tenant"
                  checked={backupType === 'tenant'}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Tenant Specific</p>
                  <p className="text-sm text-gray-500">Backup data for specific tenant only</p>
                </div>
              </label>
            </div>
          </div>

          {backupType === 'tenant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tenant</label>
              <select
                required={backupType === 'tenant'}
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a tenant...</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Creating a backup may take several minutes depending on the database size. Do not close this window during the process.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || (backupType === 'tenant' && !selectedTenant)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Create Backup
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RestoreModal({ isOpen, onClose, backup, onRestore }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (confirmText !== 'RESTORE') return;

    setIsRestoring(true);

    // Simulate restore process
    await new Promise(resolve => setTimeout(resolve, 3000));

    onRestore(backup.id);
    setIsRestoring(false);
    onClose();
    setConfirmText('');
  };

  if (!isOpen || !backup) return null;

  return (
    <motion.div variants={itemVariants} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-red-600">Restore Backup</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Warning: Destructive Action</p>
                <p className="text-sm text-red-600 mt-1">
                  Restoring this backup will overwrite all current data. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600">Backup Date: <span className="font-medium text-gray-900">{new Date(backup.date).toLocaleString()}</span></p>
            <p className="text-sm text-gray-600">Type: <span className="font-medium text-gray-900">{backup.type}</span></p>
            <p className="text-sm text-gray-600">Size: <span className="font-medium text-gray-900">{backup.size}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "RESTORE" to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
              placeholder="RESTORE"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isRestoring}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRestoring || confirmText !== 'RESTORE'}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Restore Backup
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function BackupRestore() {
  const { backups, tenants, addActivity } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredBackups = backups.filter(backup => {
    const matchesSearch = backup.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || backup.type.includes(typeFilter);
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredBackups.length / itemsPerPage);
  const paginatedBackups = filteredBackups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateBackup = (backupData) => {
    addBackup({
      ...backupData,
      date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
    addActivity({
      type: 'backup_completed',
      message: `${backupData.type} backup created successfully`,
      user: 'Super Admin',
    });
  };

  const handleRestore = (backupId) => {
    addActivity({
      type: 'backup_restored',
      message: `Backup restored (ID: ${backupId})`,
      user: 'Super Admin',
    });
    alert('Backup restored successfully!');
  };

  const handleDownload = (backup) => {
    // Simulate download
    addActivity({
      type: 'backup_downloaded',
      message: `Backup downloaded: ${backup.type}`,
      user: 'Super Admin',
    });
    alert(`Downloading backup: ${backup.type}\nSize: ${backup.size}`);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Backup & Restore</h1>
          <p className="text-slate-500 mt-1">Manage system backups and data recovery</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/25"
        >
          <Database className="w-5 h-5" />
          Create Backup
        </motion.button>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Database, label: 'Create Backup', desc: 'Full or tenant-specific', color: 'blue' },
          { icon: Download, label: 'Download Latest', desc: 'Get most recent backup', color: 'green' },
          { icon: Clock, label: 'Schedule', desc: 'Configure auto-backup', color: 'purple' }
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -2 }}
            className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all text-left"
          >
            <div className={cn(
              "p-3 rounded-xl",
              action.color === 'blue' && "bg-blue-50 dark:bg-blue-500/10",
              action.color === 'green' && "bg-green-50 dark:bg-green-500/10",
              action.color === 'purple' && "bg-purple-50 dark:bg-purple-500/10"
            )}>
              <action.icon className={cn(
                "w-6 h-6",
                action.color === 'blue' && "text-blue-600",
                action.color === 'green' && "text-green-600",
                action.color === 'purple' && "text-purple-600"
              )} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{action.label}</p>
              <p className="text-sm text-slate-500">{action.desc}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search backups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Full Database">Full Database</option>
            <option value="Tenant Specific">Tenant Specific</option>
          </select>
        </div>
      </motion.div>

      {/* Backup History */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Backup History</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Size</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Duration</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedBackups.map((backup) => (
              <tr key={backup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{backup.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{backup.size}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {backup.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{backup.duration}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                      <Upload className="w-4 h-4 text-amber-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Pagination */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-500">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBackups.length)} of {filteredBackups.length} results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Storage Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Backups</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{backups.length}</p>
            </div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Storage Used</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">12.4 GB</p>
            </div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Last Backup</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">Today</p>
            </div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Auto-Backup</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">Enabled</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <CreateBackupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateBackup}
        tenants={tenants}
      />

      <RestoreModal
        isOpen={!!restoringBackup}
        onClose={() => setRestoringBackup(null)}
        backup={restoringBackup}
        onRestore={handleRestore}
      />
    </motion.div>
  );
}
