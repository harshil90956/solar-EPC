import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  DollarSign,
  Database,
  Settings,
  Shield,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tenants', label: 'Tenants', icon: Building2 },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/user-limits', label: 'User Limits', icon: Users },
  { path: '/pricing', label: 'Pricing', icon: DollarSign },
  { path: '/backup-restore', label: 'Backup & Restore', icon: Database },
  { path: '/system-settings', label: 'System Settings', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Shield className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <span
            className={`ml-3 font-bold text-xl whitespace-nowrap transition-opacity duration-300 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'
            }`}
          >
            Solar OS
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex ml-auto text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
                    sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Super Admin Badge */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div
            className={`flex items-center px-4 py-3 bg-slate-800 rounded-lg ${
              sidebarOpen ? '' : 'justify-center'
            }`}
          >
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div
              className={`ml-3 transition-opacity duration-300 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'
              }`}
            >
              <p className="text-sm font-medium text-white">Super Admin</p>
              <p className="text-xs text-slate-400">Platform Control</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Super Admin Panel
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-48"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                SA
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                Super Admin
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
            </div>

            <button className="p-2 text-gray-600 hover:text-gray-900" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
