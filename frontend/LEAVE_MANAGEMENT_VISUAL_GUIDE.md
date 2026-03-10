# Leave Management Module - Quick Visual Guide

## 📸 UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎯 Leave Management                                    [+ Apply Leave]  │
│  Manage employee leave applications and approvals                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Total    │  │ Pending  │  │ Approved │  │ Rejected │             │
│  │ Requests │  │ Approval │  │ Leaves   │  │ Leaves   │             │
│  │   145    │  │    24    │  │   103    │  │    18    │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│                                                                         │
├─────────────────────────────────────────────┬───────────────────────────┤
│                                             │                           │
│  Filters Section                            │   📅 Calendar Panel       │
│  ┌─────────────────────────────────┐       │   ┌─────────────────┐   │
│  │ [🔍 Search] [Status▾] [Type▾]  │       │   │  ← March 2026 →  │   │
│  │ [Date Range]           [Refresh]│       │   │  S M T W T F S   │   │
│  └─────────────────────────────────┘       │   │  1 2 3 4 5 6 7   │   │
│                                             │   │  8 🟢 10 11...   │   │
│  Main Table                                 │   │  (Calendar Grid)  │   │
│  ┌─────────────────────────────────┐       │   └─────────────────┘   │
│  │ Employee | Type | Start | End   │       │                           │
│  ├─────────────────────────────────┤       │   Legend:                 │
│  │ John Doe │ 🏖️ Casual │ ...     │       │   🟢 Approved             │
│  │ Jane Smith│ 🏥 Sick │ ...       │       │   🟡 Pending              │
│  │ ...                              │       │                           │
│  └─────────────────────────────────┘       │   Leaves on Selected:     │
│                                             │   ┌─────────────────┐   │
│       75% Width                             │   │ John Doe        │   │
│                                             │   │ 🏖️ Casual Leave │   │
│                                             │   └─────────────────┘   │
│                                             │                           │
│                                             │       25% Width           │
└─────────────────────────────────────────────┴───────────────────────────┘
```

---

## 🎨 Leave Type Color Reference

### Visual Color Palette

```
┌──────────────────────────────────────────────────────────┐
│  🏖️  Casual Leave          ███████ Blue    #3b82f6     │
│  🏥  Sick Leave            ███████ Red     #ef4444     │
│  ✈️   Paid Leave           ███████ Green   #22c55e     │
│  📅  Unpaid Leave          ███████ Gray    #64748b     │
│  ⭐  Earned Leave          ███████ Purple  #a855f7     │
│  🏠  Work From Home        ███████ Violet  #8b5cf6     │
│  🚨  Emergency Leave       ███████ Orange  #f97316     │
│  👶  Maternity Leave       ███████ Pink    #ec4899     │
│  👨‍👶  Paternity Leave       ███████ Cyan    #06b6d4     │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 Status Badge Design

```
┌────────────────────────────────────────────────┐
│  Pending   →  ⏳ Orange Badge  #f59e0b        │
│  Approved  →  ✅ Green Badge   #22c55e        │
│  Rejected  →  ❌ Red Badge     #ef4444        │
└────────────────────────────────────────────────┘
```

---

## 🗓️ Calendar Features

### Calendar Cell States

```
┌──────────────────────────────────────────────────┐
│  Empty Day        →  [  5 ]  Gray text           │
│  Today            →  [ 15 ]  Blue background     │
│  Selected         →  [ 20 ]  Primary ring        │
│  Has Approved     →  [ 25🟢]  With green dot     │
│  Has Pending      →  [ 28🟡]  With amber dot     │
│  Both Approved &  →  [ 30🟢🟡] Both dots         │
│  Pending                                          │
└──────────────────────────────────────────────────┘
```

### Calendar Navigation

```
┌──────────────────────────────────┐
│   [←]   March 2026   [→]        │
│                                  │
│   S   M   T   W   T   F   S     │
│   1   2   3   4   5   6   7     │
│   8   9  10  11  12  13  14     │
│  15  16  17  18  19  20  21     │
│  22  23  24  25  26  27  28     │
│  29  30  31                      │
└──────────────────────────────────┘
```

---

## 📋 Table Column Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Employee        │ Leave Type    │ Start     │ End       │ Days │ Status│
├────────────────────────────────────────────────────────────────────────┤
│ [JD] John Doe   │ 🏖️ Casual    │ 15 Mar    │ 17 Mar    │  3   │ ⏳    │
│ EMP001          │ Blue Badge    │ Monday    │ Wednesday │ days │Pending│
├────────────────────────────────────────────────────────────────────────┤
│ [JS] Jane Smith │ 🏥 Sick      │ 20 Mar    │ 22 Mar    │  3   │ ✅    │
│ EMP002          │ Red Badge     │ Friday    │ Sunday    │ days │Approve│
├────────────────────────────────────────────────────────────────────────┤
│                                                      [View] [Approve] [Reject] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Action Buttons

### Status-Based Actions

```
Pending Status:
┌──────────────────────────────────────┐
│  [👁️ View] [✅ Approve] [❌ Reject] │
└──────────────────────────────────────┘

Approved/Rejected Status:
┌──────────────────┐
│  [👁️ View]       │
└──────────────────┘
```

---

## 📱 Modal Layouts

### 1. Apply Leave Modal

```
┌─────────────────────────────────────┐
│  Apply for Leave              [×]   │
├─────────────────────────────────────┤
│                                     │
│  Employee *                         │
│  [Select Employee ▾]                │
│                                     │
│  Leave Type *                       │
│  [🏖️ Casual Leave ▾]               │
│                                     │
│  Start Date *    │  End Date *     │
│  [15 Mar 2026]   │  [17 Mar 2026]  │
│                                     │
│  📅 Total Days: 3                   │
│                                     │
│  Reason for Leave *                 │
│  [Text area...]                     │
│                                     │
├─────────────────────────────────────┤
│              [Cancel] [Submit]      │
└─────────────────────────────────────┘
```

### 2. Leave Detail Modal

```
┌──────────────────────────────────────────┐
│  Leave Request Details          [×]      │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ [JD] John Doe                     │   │
│  │ EMP001 • john@company.com         │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Leave Type       │  Status              │
│  🏖️ Casual Leave  │  ⏳ Pending          │
│                                          │
│  Start Date       │  End Date            │
│  15 March 2026    │  17 March 2026       │
│  Monday           │  Wednesday           │
│                                          │
│  Total Days: 3                           │
│                                          │
│  Reason for Leave:                       │
│  "Family vacation..."                    │
│                                          │
├──────────────────────────────────────────┤
│      [Close] [✅ Approve] [❌ Reject]    │
└──────────────────────────────────────────┘
```

---

## 🎨 Color Coding System

### Primary Colors
```
Success:  #22c55e  ███  Used for approved, positive actions
Warning:  #f59e0b  ███  Used for pending, awaiting attention
Error:    #ef4444  ███  Used for rejected, negative actions
Info:     #3b82f6  ███  Used for information, neutral states
```

### Background Shades
```
Base:        var(--bg-base)      Light gray
Elevated:    var(--bg-elevated)  Slightly lighter
Card:        White               Clean white cards
```

---

## 📊 KPI Card Design

```
┌──────────────────────┐
│  📅 Calendar Icon    │
│                      │
│  Total Requests      │
│       145            │  Large number
│                      │
│  ▲ 12% vs last month │  Trend indicator
└──────────────────────┘
    Blue gradient
```

---

## 🔍 Filter Section Layout

```
┌─────────────────────────────────────────────────────────┐
│  [🔍 Search employee...]  [Status ▾]  [Type ▾]  [Date] │
│                                                         │
│  Showing 24 of 145 records                    [Refresh]│
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Interactive Elements

### Hover States
```
Calendar Day:     background-color: var(--bg-elevated)
Table Row:        background-color: rgba(primary, 0.05)
Button:           background-color: darken(primary, 10%)
Card:             box-shadow: 0 4px 12px rgba(0,0,0,0.1)
```

### Active States
```
Selected Date:    ring-2 ring-primary
Active Filter:    background-color: primary, color: white
Focused Input:    ring-2 ring-primary
```

---

## 📏 Spacing Guidelines

```
Card Padding:     16px (p-4)
Section Gap:      20px (space-y-5)
Grid Gap:         16px (gap-4)
Button Gap:       8px (gap-2)
Text Spacing:     4px (space-y-1)
```

---

## 🎭 Responsive Breakpoints

```
Mobile:    < 768px   → Vertical layout, collapsible calendar
Tablet:    768-1024px → Stacked layout
Laptop:    1024-1920px → Side-by-side with 75-25 split
Desktop:   > 1920px   → Full width, optimal spacing
```

---

## 🎬 Animation Timings

```
Page Load:        0.3s fade-in
Modal Open:       0.2s scale + fade
Hover Effects:    0.15s transition
Filter Update:    instant (no delay)
Calendar Switch:  0.2s slide
```

---

## ✅ Accessibility Features

```
✓ ARIA labels on all interactive elements
✓ Keyboard navigation support
✓ Focus indicators visible
✓ Color contrast ratios meet WCAG AA
✓ Screen reader friendly
✓ Alt text on icons
```

---

## 🎯 Best Practices Applied

```
✓ Consistent spacing system
✓ Unified color palette
✓ Clear visual hierarchy
✓ Intuitive icon usage
✓ Meaningful micro-interactions
✓ Fast loading times
✓ Clean, modern aesthetics
```

---

## 📱 Mobile-First Considerations

```
Touch Targets:    Minimum 44x44px
Font Sizes:       Minimum 14px for body
Buttons:          Full width on mobile
Modals:           Bottom sheet style
Calendar:         Swipeable months
```

---

**Quick Reference Complete!** 🎉

Use this guide as a visual reference when implementing or customizing the Leave Management Module.
