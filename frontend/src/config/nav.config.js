// NAVIGATION CONFIG — Dynamic, schema-driven. Never hardcode nav items in Layout.
import {
    LayoutDashboard, Users, MapPin, Pencil, FileText, FolderOpen,
    Package, ShoppingCart, Truck, Wrench, CheckCircle, DollarSign,
    Headphones, FileCheck, Settings, Brain, Bell, Shield,
} from 'lucide-react';
import { INVENTORY, TICKETS, LEADS, PROJECTS, QUOTATIONS } from '../data/mockData';

// ── Live badge counts (derived from data, never hardcoded) ──
const lowStockCount = INVENTORY.filter(i => i.available <= i.minStock).length;
const openTickets = TICKETS.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
const hotLeads = LEADS.filter(l => l.status === 'Hot' || l.status === 'Qualified').length;
const activeProjects = PROJECTS.filter(p => p.status !== 'Commissioned').length;
const draftQuotes = QUOTATIONS.filter(q => q.status === 'Draft' || q.status === 'Sent').length;

export const NAV_CONFIG = [
    {
        section: 'OVERVIEW',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
            { id: 'admin', label: 'Admin', icon: Shield, badge: null, badgeVariant: 'red' },
            { id: 'intelligence', label: 'AI Intelligence', icon: Brain, badge: null, badgeVariant: 'accent' },
        ],
    },
    {
        section: 'PIPELINE',
        items: [
            { id: 'crm', label: 'CRM & Sales', icon: Users, badge: hotLeads || null },
            { id: 'survey', label: 'Survey', icon: MapPin, badge: null },
            { id: 'design', label: 'Design & BOQ', icon: Pencil, badge: null },
            { id: 'quotation', label: 'Quotation', icon: FileText, badge: draftQuotes || null },
            { id: 'project', label: 'Projects', icon: FolderOpen, badge: activeProjects || null },
        ],
    },
    {
        section: 'OPERATIONS',
        items: [
            { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount || null, badgeVariant: 'amber' },
            { id: 'procurement', label: 'Procurement', icon: ShoppingCart, badge: null },
            { id: 'logistics', label: 'Logistics', icon: Truck, badge: null },
        ],
    },
    {
        section: 'FIELD',
        items: [
            { id: 'installation', label: 'Installation', icon: Wrench, badge: null },
            { id: 'commissioning', label: 'Commissioning', icon: CheckCircle, badge: null },
        ],
    },
    {
        section: 'FINANCE',
        items: [
            { id: 'finance', label: 'Finance', icon: DollarSign, badge: null },
        ],
    },
    {
        section: 'POST SALE',
        items: [
            { id: 'service', label: 'Service & AMC', icon: Headphones, badge: openTickets || null, badgeVariant: 'red' },
            { id: 'compliance', label: 'Compliance', icon: FileCheck, badge: null },
        ],
    },
    {
        section: 'SYSTEM',
        items: [
            { id: 'settings', label: 'Settings', icon: Settings, badge: null },
        ],
    },
];
