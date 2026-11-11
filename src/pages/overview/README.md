# Role-based Overview

`/` renders `OverviewRouter`, which picks the dashboard from `users.role` (via `AuthContext.profile`):

| Role | Component | Database function |
|---|---|---|
| `sales_staff` | `SalesOverview` | `overview_sales(p_period)` |
| `pro_officer` | `ProOfficerOverview` | `overview_pro()` |
| `accounts_staff` | `AccountsOverview` | `overview_accounts()` |
| `manager` | `ManagerOverview` | `overview_manager()` |
| `super_admin` | `SuperAdminOverview` | `overview_admin()` |

Every Overview is available to every active user (no `can_access_overview` check). Quick actions and links are
shown only when the user's tab permission allows the destination (`useOverviewNav`).

## Security model

The functions live in `supabase/migrations/20261110000000_overview_rpcs.sql`. They are `SECURITY DEFINER`, identify the caller
from `auth.uid()` (there is **no user-id parameter**), and refuse any role that is not theirs (`42501`). Finance data also requires
`user_permissions.can_view_financials`. The client never filters by a user id it supplies. Query keys include the signed-in user's id.

`supabase/proposed/tighten_overview_sensitive_rls.sql` is an **unapplied**, opt-in migration that closes today's wide-open
SELECT policies on leads/payments/expenses. The Overview does not depend on it.

## Definitions

- **Qatar business date**: `Asia/Qatar` (UTC+3). Daily work, follow-ups, deadlines and month boundaries use it
  (`lib/qatarTime.js` in the browser, `_ov_today()` / `_ov_qdate()` in the database). Never `toISOString().slice(0, 10)`.
- **Invoiced revenue**: approved invoices, dated by `invoices.created_at` (the date printed on the document), Qatar date.
- **Collections**: approved receipts (`receipts.issue_date`) + `payments.payment_date`. The receipt flow is how money is
  recorded today; `payments` is empty and `invoices.amount_paid` is not maintained.
- **Outstanding receivables**: remaining balance of approved invoices' line items (`invoice_item_balances`; approved receipts
  count as received). Draft invoices are excluded.
- **Overdue receivable**: outstanding on an approved invoice whose `due_date` is before the Qatar today. Invoices with no due
  date are shown as "No due date" and are never called overdue.
- **Won (period)**: `stage = 'won'`, dated by `leads.converted_at` (Qatar date). Won leads with no `converted_at` count only in
  "All Time" and are called out in the UI.
- **Case overdue**: not completed/cancelled and (`due_date` before today, or `status = 'overdue'`). Cases past due without the
  status being updated are reported separately.
- **Stalled government approval**: `government_review` with no case activity or update for 14+ days.
- **Manager scope**: all active sales, PRO and accounts staff (there is no manager-to-staff mapping). No finance data.

Overview queries are keyed `['overview', ...]` and are invalidated after any successful mutation (`lib/queryClient.js`).
Tests: `npm test`.
