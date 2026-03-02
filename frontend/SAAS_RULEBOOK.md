# 🌞 SOLAR OS – SAAS RULEBOOK
## EPC Edition – Platform Engineering Standard
**Version 1.0**

---

### 1️⃣ CORE SAAS PRINCIPLES
Every module must follow:
- ✔ Standard CRUD
- ✔ Pagination
- ✔ Advanced Filters
- ✔ Global Search
- ✔ Multi-select + Bulk Actions
- ✔ 3-Dot Action Menu
- ✔ Import / Export (CSV / JSON)
- ✔ Reminder System
- ✔ Audit Log
- ✔ Module-wise Dashboard
- ✔ Custom Fields
- ✔ Role-based Permissions
- ✔ Cross-Module Linking

### 2️⃣ UNIVERSAL MODULE STRUCTURE STANDARD
Applies to: CRM, Survey, Design, Quotation, Project, Inventory, Procurement, Installation, Finance, Service, Compliance.

#### 2.1 CRUD STRUCTURE
Each module must include:
- Create, Read, Update, Delete (Soft Delete only)
- Additional: Duplicate, Archive, Restore
- All actions must be logged.

#### 2.2 PAGINATION STANDARD
- Default: 10 / 25 / 50 / 100 rows per page
- Features: Page jump, Total records counter, Dynamic load.
- Performance: Server-side queries mandatory.

#### 2.3 FILTER SYSTEM (MANDATORY ADVANCED)
- Basic: Date range, Status, Assigned user.
- Advanced: Multi-condition filters, AND/OR logic, Save/Share filter presets.

#### 2.4 GLOBAL SEARCH ENGINE
- Fields: Name, Phone, Project ID, Invoice/Serial number, Vendor name.
- Types: Exact, Partial, Fuzzy. Indexed for performance.

#### 2.5 SELECTION CHECKBOX + BULK ACTIONS
- UI: Row checkbox + Select all checkbox.
- Actions: Assign, Change status, Export, Delete (soft), Send reminder, Add tag, Generate report.

#### 2.6 3-DOT ACTION MENU (PER ROW)
Standard actions: View, Edit, Duplicate, Delete, Export, Timeline, Activity Log.

#### 2.7 IMPORT / EXPORT STANDARD
- Formats: CSV, JSON.
- Import Tool: Template download, Field mapping, Validation, Error preview.
- Export Options: Selected rows, Filtered results, All data.

#### 2.8 REMINDER SYSTEM
- Multi-channel: Email + in-app notification.
- Features: Recurring reminders, Module-specific use cases.

---

### 3️⃣ DASHBOARD STANDARDS
#### 3.1 Module-wise Dashboard
- Summary Metrics (Count, Value, Status breakdown).
- Performance Charts (Trend graph, Stage distribution).
- Risk Alerts (Delayed items, Overdue payments).

#### 3.2 Global Dashboard Layer
- Founder, Sales, Operations, and Finance specific views.

---

### 4️⃣ UTILITY & CORE SYSTEMS
#### 4.1 Custom Fields
- Types: Text, Number, Dropdown, Multi-select, Date, File, Boolean, Formula.
- Rules: Admin controlled, Role-based visibility, Filterable/Exportable.

#### 4.2 Settings Module
- Company Setup, Role & Permission (Field-level), Workflow Settings (Custom stages/approvals), Backup & Restore (Full/Module-wise).

---

### 5️⃣ INTERCONNECTION & LOGGING
#### 5.1 Module Interconnection Rules
- CRM → Survey → Design → Quotation → Project → Inventory → Procurement → Installation → Commission → Finance → Service.
- Real-time updates across the chain.

#### 5.2 Activity & Audit Log
- Immutable, searchable, and exportable logs for all actions (Created/Updated/Deleted/Status change).

---

### 6️⃣ UI / DESIGN SYSTEM STANDARD
- **Framework**: ShadCN UI + Tailwind.
- **Principles**: Clean enterprise look, Neutral base, Dark mode ready, High contrast for alerts, Minimal cognitive load.
- **Table UI**: Sortable, Sticky headers/actions, Column toggle, Drag reorder.

---

### 7️⃣ TECHNICAL STANDARDS
- **Data Architecture**: `created_at`, `updated_at`, `created_by`, `updated_by`, `tenant_id`, `is_deleted` (soft delete). Multi-tenant isolation.
- **Performance**: Server-side pagination, Indexed fields, Lazy loading, <300ms API response.
- **Security**: JWT, RBAC, Field-level masking, Rate limiting.
- **Scalability**: Multi-branch, Multi-warehouse, Multi-currency.
