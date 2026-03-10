# Leave Management Module - Testing Guide

## 🧪 Comprehensive Testing Checklist

---

## 1. **Initial Page Load Testing**

### ✅ Test Cases

- [ ] **TC-001**: Page loads without errors
  - Navigate to `/hrm-leaves`
  - Verify no console errors
  - Confirm page renders completely

- [ ] **TC-002**: KPI cards display correct data
  - Verify "Total Requests" shows correct count
  - Verify "Pending Approval" shows correct count
  - Verify "Approved Leaves" shows correct count
  - Verify "Rejected Leaves" shows correct count

- [ ] **TC-003**: Table loads with data
  - Confirm leaves are displayed
  - Verify all columns are visible
  - Check data formatting is correct

- [ ] **TC-004**: Calendar displays current month
  - Verify current month is shown
  - Confirm today's date is highlighted
  - Check leave indicators are visible

---

## 2. **Search & Filter Testing**

### ✅ Employee Search

- [ ] **TC-005**: Search by employee name
  - Enter employee first name → Verify results filter
  - Enter employee last name → Verify results filter
  - Enter partial name → Verify partial match works
  - Clear search → Verify all leaves show again

- [ ] **TC-006**: Search by employee ID
  - Enter exact employee ID → Verify single result
  - Enter partial employee ID → Verify results
  - Test case sensitivity → Should be case-insensitive

### ✅ Status Filter

- [ ] **TC-007**: Filter by "All Status"
  - Select "All Status" → All leaves displayed

- [ ] **TC-008**: Filter by "Pending"
  - Select "Pending" → Only pending leaves shown
  - Verify count matches KPI card

- [ ] **TC-009**: Filter by "Approved"
  - Select "Approved" → Only approved leaves shown
  - Verify count matches KPI card

- [ ] **TC-010**: Filter by "Rejected"
  - Select "Rejected" → Only rejected leaves shown
  - Verify count matches KPI card

### ✅ Leave Type Filter

- [ ] **TC-011**: Filter by leave type
  - Test each leave type (Casual, Sick, Paid, etc.)
  - Verify only selected type shows
  - Check colored badges match filter

### ✅ Date Range Filter

- [ ] **TC-012**: Filter by date range
  - Set start date only → Verify filter works
  - Set end date only → Verify filter works
  - Set both dates → Verify range filter works
  - Test overlapping leaves → Should be included

### ✅ Combined Filters

- [ ] **TC-013**: Multiple filters together
  - Search + Status filter
  - Search + Type filter
  - Status + Type + Date range
  - Verify "Showing X of Y records" updates correctly

---

## 3. **Calendar Testing**

### ✅ Calendar Display

- [ ] **TC-014**: Calendar renders correctly
  - Verify 7-column grid (Sun-Sat)
  - Confirm month name displays
  - Check year displays

- [ ] **TC-015**: Calendar navigation
  - Click left arrow → Previous month
  - Click right arrow → Next month
  - Navigate multiple months
  - Verify data updates with month change

### ✅ Date Selection

- [ ] **TC-016**: Click on calendar date
  - Click date with leaves → Table filters
  - Click date without leaves → Table shows empty
  - Click multiple dates → Selection updates

- [ ] **TC-017**: Today's date highlighting
  - Verify current date has special styling
  - Confirm blue background on today

- [ ] **TC-018**: Selected date highlighting
  - Click any date → Gets highlighted
  - Click another date → Highlight moves
  - Verify ring/border on selected date

### ✅ Leave Indicators

- [ ] **TC-019**: Green dots for approved leaves
  - Dates with approved leaves show green dot
  - Hover over date → See leave count in tooltip

- [ ] **TC-020**: Amber dots for pending leaves
  - Dates with pending leaves show amber dot
  - Multiple statuses → Show both dots

### ✅ Leaves on Selected Date Panel

- [ ] **TC-021**: Side panel updates
  - Select date with leaves → Panel shows leaves
  - Verify employee names display
  - Check leave type badges
  - Confirm status colors
  - Test scrolling if many leaves

---

## 4. **Table Interaction Testing**

### ✅ Column Display

- [ ] **TC-022**: Employee column
  - Avatar with initials displays
  - Full name shows
  - Employee ID shows below name

- [ ] **TC-023**: Leave type column
  - Colored badge displays
  - Correct icon shows
  - Label text is correct

- [ ] **TC-024**: Date columns
  - Dates formatted as "dd MMM yyyy"
  - Day of week shows below date
  - Dates are readable

- [ ] **TC-025**: Total days column
  - Days calculated correctly
  - Displays as pill/badge
  - Shows "day" or "days" correctly

- [ ] **TC-026**: Status column
  - Color coding correct
  - Badge style consistent
  - Text capitalized properly

- [ ] **TC-027**: Actions column
  - "View" button always shows
  - "Approve" shows for pending only
  - "Reject" shows for pending only
  - No actions for approved/rejected (except View)

### ✅ Sorting

- [ ] **TC-028**: Table sorting (if implemented)
  - Click column header → Sort ascending
  - Click again → Sort descending
  - Verify sort indicator

### ✅ Pagination

- [ ] **TC-029**: Pagination (if implemented)
  - Navigate to page 2
  - Go to last page
  - Return to first page
  - Change items per page

---

## 5. **Apply Leave Modal Testing**

### ✅ Modal Open/Close

- [ ] **TC-030**: Open modal
  - Click "Apply Leave" button
  - Modal opens with animation
  - Backdrop appears

- [ ] **TC-031**: Close modal
  - Click X icon → Modal closes
  - Click backdrop → Modal closes
  - Press Escape key → Modal closes
  - Click Cancel button → Modal closes

### ✅ Form Fields

- [ ] **TC-032**: Employee selection
  - Dropdown opens
  - All employees listed
  - Select an employee → Field updates

- [ ] **TC-033**: Leave type selection
  - All 9 leave types available
  - Icons display in dropdown
  - Selection updates badge preview

- [ ] **TC-034**: Date pickers
  - Start date picker opens
  - Select start date → Updates
  - End date picker opens
  - End date minimum = start date
  - Cannot select end before start

- [ ] **TC-035**: Auto-calculate days
  - Select dates → Days calculate instantly
  - Blue info box shows total days
  - Calculation is accurate (includes both days)

- [ ] **TC-036**: Reason textarea
  - Can type text
  - Placeholder shows
  - Text wraps correctly
  - No character limit (or verify limit)

### ✅ Form Validation

- [ ] **TC-037**: Required field validation
  - Submit without employee → Error message
  - Submit without dates → Error message
  - Submit without reason → Error message

- [ ] **TC-038**: Date validation
  - End date before start → Disabled/Error
  - Past dates (if not allowed) → Validation message

### ✅ Form Submission

- [ ] **TC-039**: Successful submission
  - Fill all fields correctly
  - Click "Submit Application"
  - Success toast appears
  - Modal closes
  - Table refreshes with new leave
  - KPI cards update

- [ ] **TC-040**: Failed submission
  - API error → Error toast shows
  - Modal stays open
  - Form data retained

---

## 6. **Leave Detail Modal Testing**

### ✅ Modal Display

- [ ] **TC-041**: Open detail modal
  - Click "View" on any leave
  - Modal opens
  - Correct leave data loads

- [ ] **TC-042**: Employee section
  - Avatar displays with initials
  - Full name shows
  - Employee ID shows
  - Email shows (if available)

- [ ] **TC-043**: Leave type section
  - Correct icon displays
  - Colored badge shows
  - Label matches leave type

- [ ] **TC-044**: Status section
  - Current status displays
  - Color coding matches
  - Badge style consistent

- [ ] **TC-045**: Date information
  - Start date formatted correctly
  - End date formatted correctly
  - Day names display
  - Total days highlighted

- [ ] **TC-046**: Reason display
  - Full reason text shows
  - Proper formatting
  - Scrollable if long

### ✅ Approval/Rejection Info

- [ ] **TC-047**: Approved leave details
  - Shows "Approved" status
  - Displays approval date
  - Shows who approved (if available)

- [ ] **TC-048**: Rejected leave details
  - Shows "Rejected" status
  - Displays rejection reason
  - Red color coding

### ✅ Action Buttons in Detail Modal

- [ ] **TC-049**: Pending leave actions
  - "Approve" button visible
  - "Reject" button visible
  - Click Approve → Confirmation
  - Click Reject → Reason prompt

- [ ] **TC-050**: Approved/Rejected leave
  - No action buttons except Close
  - Only "Close" button shows

---

## 7. **Approve/Reject Testing**

### ✅ Approve Leave

- [ ] **TC-051**: Approve from table
  - Click "Approve" on pending leave
  - Leave status updates to "Approved"
  - Success toast appears
  - KPI cards update
  - Leave moves to approved filter

- [ ] **TC-052**: Approve from detail modal
  - Open leave details (pending)
  - Click "Approve" button
  - Confirmation/success
  - Modal closes
  - Table updates

### ✅ Reject Leave

- [ ] **TC-053**: Reject from table
  - Click "Reject" on pending leave
  - Prompt for rejection reason appears
  - Enter reason → Submit
  - Leave status updates to "Rejected"
  - Success toast appears
  - KPI cards update

- [ ] **TC-054**: Reject without reason
  - Click "Reject"
  - Cancel reason prompt → No change
  - Leave stays pending

- [ ] **TC-055**: Reject from detail modal
  - Open leave details (pending)
  - Click "Reject" button
  - Enter rejection reason
  - Confirm → Leave rejected
  - Modal closes

---

## 8. **UI/UX Testing**

### ✅ Responsive Design

- [ ] **TC-056**: Desktop view (1920px+)
  - 75%-25% split layout
  - All filters visible
  - Calendar on right side

- [ ] **TC-057**: Laptop view (1024-1920px)
  - Layout adjusts
  - Calendar still visible
  - No horizontal scroll

- [ ] **TC-058**: Tablet view (768-1024px)
  - Responsive grid
  - Calendar moves/stacks
  - Table scrolls horizontally

- [ ] **TC-059**: Mobile view (<768px)
  - Vertical layout
  - Touch-friendly buttons
  - Calendar collapsible

### ✅ Theme & Colors

- [ ] **TC-060**: Light theme
  - All colors display correctly
  - Good contrast ratios
  - Readable text

- [ ] **TC-061**: Dark theme (if supported)
  - Theme switches correctly
  - Colors invert properly
  - Calendar stays readable

### ✅ Animations

- [ ] **TC-062**: Page transitions
  - Fade-in on load
  - Smooth animations
  - No jank or lag

- [ ] **TC-063**: Modal animations
  - Open: scale + fade
  - Close: smooth exit
  - Backdrop transition

- [ ] **TC-064**: Hover effects
  - Calendar days: hover state
  - Buttons: hover color change
  - Table rows: hover highlight

---

## 9. **Performance Testing**

### ✅ Load Times

- [ ] **TC-065**: Initial page load
  - Loads under 2 seconds
  - No blocking requests
  - Progressive rendering

- [ ] **TC-066**: Large datasets
  - 100+ leaves → Renders smoothly
  - Filtering is instant
  - No lag in calendar

- [ ] **TC-067**: Calendar month switching
  - Instant month change
  - No delay in rendering
  - Smooth navigation

### ✅ Memory & Resources

- [ ] **TC-068**: No memory leaks
  - Open/close modals 10 times
  - Check memory usage stays stable
  - No console warnings

- [ ] **TC-069**: Network efficiency
  - API calls only when needed
  - No redundant requests
  - Proper caching

---

## 10. **Accessibility Testing**

### ✅ Keyboard Navigation

- [ ] **TC-070**: Tab navigation
  - Tab through all interactive elements
  - Focus visible on each element
  - Logical tab order

- [ ] **TC-071**: Keyboard shortcuts
  - Escape closes modals
  - Enter submits forms
  - Arrow keys navigate calendar

### ✅ Screen Reader

- [ ] **TC-072**: ARIA labels
  - All buttons have labels
  - Form fields have labels
  - Icons have alt text

- [ ] **TC-073**: Screen reader testing
  - Test with NVDA/JAWS
  - All content readable
  - Proper announcements

### ✅ Color Contrast

- [ ] **TC-074**: WCAG compliance
  - Text contrast ratio > 4.5:1
  - Button contrast sufficient
  - Status badges readable

---

## 11. **Error Handling Testing**

### ✅ API Errors

- [ ] **TC-075**: Network error
  - Disconnect network
  - Try any action
  - Error toast shows
  - Graceful degradation

- [ ] **TC-076**: Server error (500)
  - Mock 500 error
  - User-friendly error message
  - Retry option available

- [ ] **TC-077**: Unauthorized (401)
  - Invalid token
  - Redirect to login
  - Or show auth error

### ✅ Data Errors

- [ ] **TC-078**: Missing employee data
  - Leave without employee
  - Shows placeholder/fallback

- [ ] **TC-079**: Invalid dates
  - Malformed date in API response
  - Shows error or fallback

### ✅ Form Errors

- [ ] **TC-080**: Validation errors
  - Clear error messages
  - Field highlighting
  - Error clears on fix

---

## 12. **Edge Case Testing**

### ✅ Boundary Conditions

- [ ] **TC-081**: Zero leaves
  - No leaves in system
  - Empty state displays
  - Helpful message shown

- [ ] **TC-082**: Single leave
  - Only 1 leave exists
  - Displays correctly
  - No layout issues

- [ ] **TC-083**: Very long reason
  - 1000+ character reason
  - Text wraps properly
  - Scrollable in modal

- [ ] **TC-084**: Same-day leave
  - Start date = End date
  - Shows "1 day"
  - Calculates correctly

- [ ] **TC-085**: Year-spanning leave
  - Leave crosses year boundary (Dec 31 - Jan 2)
  - Dates display correctly
  - Days calculated accurately

### ✅ Special Characters

- [ ] **TC-086**: Special chars in search
  - Search with symbols: @#$%
  - No errors
  - Proper escaping

- [ ] **TC-087**: Unicode in employee names
  - Names with accents: José, François
  - Displays correctly
  - Search works

---

## 13. **Integration Testing**

### ✅ API Integration

- [ ] **TC-088**: GET /hrm/leaves
  - Fetches all leaves
  - Proper response format
  - Error handling

- [ ] **TC-089**: POST /hrm/leaves
  - Creates new leave
  - Returns created leave
  - ID generated

- [ ] **TC-090**: PATCH /hrm/leaves/:id/approve
  - Approves leave
  - Status updates
  - Timestamp added

- [ ] **TC-091**: PATCH /hrm/leaves/:id/reject
  - Rejects leave
  - Rejection reason saved
  - Status updates

- [ ] **TC-092**: GET /hrm/employees
  - Fetches employee list
  - Used in dropdown
  - Proper formatting

### ✅ Backend Validation

- [ ] **TC-093**: Backend validates dates
  - End before start → 400 error
  - Proper error message

- [ ] **TC-094**: Backend validates employee exists
  - Invalid employee ID → 404 error
  - User-friendly message

---

## 14. **Security Testing**

### ✅ Authentication

- [ ] **TC-095**: Unauthenticated access
  - No token → Redirect to login
  - Or show login modal

- [ ] **TC-096**: Expired token
  - Token expires → Handle gracefully
  - Refresh token or re-login

### ✅ Authorization

- [ ] **TC-097**: Role-based access
  - Admin can approve all
  - Manager can approve team only
  - Employee can only view own

- [ ] **TC-098**: Cross-tenant isolation
  - Cannot see other tenant's leaves
  - Proper tenant filtering

### ✅ Input Sanitization

- [ ] **TC-099**: XSS prevention
  - Script tags in reason field
  - Properly escaped in display

- [ ] **TC-100**: SQL injection (not applicable if using MongoDB)
  - Special chars in search
  - No query errors

---

## 15. **User Experience Testing**

### ✅ Loading States

- [ ] **TC-101**: Table loading
  - Skeleton or spinner shows
  - Smooth transition when loaded

- [ ] **TC-102**: Calendar loading
  - Loading indicator
  - Data populates smoothly

### ✅ Toast Notifications

- [ ] **TC-103**: Success toasts
  - Clear success message
  - Auto-dismiss after 3-5 seconds
  - Positioned correctly

- [ ] **TC-104**: Error toasts
  - Clear error message
  - User-friendly language
  - Action-oriented (what to do)

### ✅ Empty States

- [ ] **TC-105**: No leaves found
  - Friendly empty state
  - Helpful message
  - CTA to add leave

- [ ] **TC-106**: No employees
  - Cannot apply leave
  - Helpful error message

---

## 📊 Test Results Template

### Test Execution Summary

```
Total Test Cases: 106
Passed: ___
Failed: ___
Blocked: ___
Not Tested: ___

Pass Rate: ___%
```

### Severity Levels

- **Critical**: Prevents core functionality
- **High**: Major feature not working
- **Medium**: Minor issue, workaround exists
- **Low**: Cosmetic/nice-to-have

### Bug Template

```
Bug ID: LEAVE-XXX
Title: [Brief description]
Severity: Critical/High/Medium/Low
Steps to Reproduce:
1. ...
2. ...
3. ...
Expected Result: ...
Actual Result: ...
Screenshots: [Attach]
Browser/Device: ...
Tester: ...
Date: ...
```

---

## 🚀 Testing Best Practices

1. **Test in Order**: Follow the checklist sequence
2. **Document Issues**: Log every bug found
3. **Retest Fixes**: Verify bugs are resolved
4. **Cross-Browser**: Test on Chrome, Firefox, Safari, Edge
5. **Real Data**: Use production-like data volumes
6. **Performance**: Monitor load times and responsiveness
7. **Accessibility**: Test with keyboard and screen readers
8. **Mobile**: Test on actual devices, not just emulators

---

## ✅ Sign-Off Checklist

- [ ] All critical test cases passed
- [ ] All high-priority bugs fixed
- [ ] Performance meets requirements
- [ ] Accessibility standards met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] User acceptance testing done

---

**Testing Complete!** 🎉

Once all tests pass, the Leave Management Module is ready for production deployment.

---

**Version**: 1.0.0  
**Last Updated**: March 9, 2026  
**Prepared by**: QA Team - Solar EPC System
