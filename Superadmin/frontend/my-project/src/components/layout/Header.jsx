import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Command,
  X,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

export default function Header({ sidebarCollapsed }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { notifications, markNotificationRead, activities } = useAppStore();
  const { user, logout } = useAuthStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  const searchResults = [
    { type: 'tenant', title: 'SolarMax Industries', subtitle: 'Enterprise Plan', icon: 'Building' },
    { type: 'page', title: 'Dashboard', subtitle: 'Analytics Overview', icon: 'Layout' },
    { type: 'setting', title: 'SMTP Configuration', subtitle: 'Email Settings', icon: 'Mail' },
  ].filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-20 border-b transition-all duration-300",
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
        "border-slate-200 dark:border-slate-800",
        sidebarCollapsed ? "left-20" : "left-72"
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Section - Breadcrumb & Search */}
        <div className="flex items-center gap-6">
          {/* Global Search */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
                "w-80"
              )}
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500 flex-1 text-left">Search anything...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-700 text-xs text-slate-500 border border-slate-200 dark:border-slate-600">
                <Command className="w-3 h-3" />
                <span>K</span>
              </kbd>
            </motion.button>

            {/* Search Modal */}
            <AnimatePresence>
              {searchOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSearchOpen(false)}
                    className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed left-1/2 top-32 -translate-x-1/2 z-50 w-full max-w-2xl"
                  >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search tenants, settings, pages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        <button
                          onClick={() => setSearchOpen(false)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="p-2">
                        {searchQuery && searchResults.length > 0 ? (
                          <div className="space-y-1">
                            {searchResults.map((result, i) => (
                              <motion.button
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                              >
                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                  <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">{result.title}</p>
                                  <p className="text-sm text-slate-500">{result.subtitle}</p>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-slate-500">Start typing to search...</p>
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↑↓</kbd>
                            <span>to navigate</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↵</kbd>
                            <span>to select</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">esc</kbd>
                            <span>to close</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={cn(
                "relative p-2.5 rounded-xl transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                notificationsOpen && "bg-slate-100 dark:bg-slate-800"
              )}
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {notificationsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setNotificationsOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 z-50 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center">
                          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {notifications.map((notification) => (
                            <motion.button
                              key={notification.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              onClick={() => markNotificationRead(notification.id)}
                              className={cn(
                                "w-full flex items-start gap-3 p-4 text-left transition-colors",
                                !notification.read && "bg-blue-50/50 dark:bg-blue-500/5"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                notification.type === 'success' && "bg-green-100 dark:bg-green-500/10",
                                notification.type === 'warning' && "bg-amber-100 dark:bg-amber-500/10",
                                notification.type === 'error' && "bg-red-100 dark:bg-red-500/10"
                              )}>
                                {notification.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
                                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                                {notification.type === 'error' && <Info className="w-5 h-5 text-red-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{notification.title}</p>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                profileOpen && "bg-slate-100 dark:bg-slate-800"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                SA
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Super Admin</p>
                <p className="text-xs text-slate-500">admin@solarios.com</p>
              </div>
            </motion.button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setProfileOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          SA
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">Super Admin</p>
                          <p className="text-sm text-slate-500">Platform Administrator</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Profile</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Settings</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Help & Support</span>
                      </button>
                    </div>

                    <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
