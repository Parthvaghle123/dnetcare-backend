━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:     Dental Clinic Management System
Type:     Multi-tenant SaaS — Dental Clinics (Single + Multi-Branch)
Backend:  NestJS + TypeScript + Sequelize ORM + Supabase PostgreSQL
Queues:   BullMQ + Redis
Storage:  Cloudinary
WhatsApp: Third-party provider (AiSensy / Interakt / Gupshup) via REST API
Auth:     JWT (Access Token + Refresh Token), Role-based Guards

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOT SEQUENCE (execute silently, in this exact order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — AGENTS.md
Read this file fully. Apply every rule immediately. No output.

STEP 2 — PROJECT_MAP.md
IF PROJECT_MAP.md exists:
  Read it once. Load every file path into memory. Trust it fully. No re-scan.
IF PROJECT_MAP.md does not exist:
  Scan full project once — every file, every folder, every subfolder,
  every config, every asset.
  Write PROJECT_MAP.md in this exact format:
  ## folder/path/
  full/path/filename.ext | purpose | key exports
  List every single file. Zero omissions. Zero summaries.
  Never scan again after this.

STEP 3 — SESSION_SUMMARY.md
IF SESSION_SUMMARY.md exists:
  Read it once. Restore last session state into memory.
IF SESSION_SUMMARY.md does not exist:
  Create it now with this empty template:
  CHANGED:
  ADDED:
  DELETED:
  FROZEN:
  NEXT:

STEP 4 — DESIGN SYSTEM
IF this is first boot (PROJECT_MAP.md was just created):
  Scan every page and component listed in PROJECT_MAP.md once.
  Scan tailwind.config.* and globals.css.
  Extract and memorize every visual token:
    - All colors with exact hex/rgb values
    - All font families, sizes, weights, line heights, letter spacing
    - All spacing values and rhythm
    - All border radius values
    - All shadow values
    - All breakpoints
    - All component patterns: button, card, input, table, modal, badge, navbar
    - All layout patterns: sidebar width, page container classes, grid structure
    - All motion values: transitions, animations, easing
    - All recurring page structure patterns
  Write everything extracted into this file under section:
  ## Extracted Design Tokens
  Never scan source files for design values again.
  This file is now the single source of truth for all visual decisions.
IF this is a returning session (PROJECT_MAP.md already existed):
  Read ## Extracted Design Tokens section from this file only.
  Apply all values directly. Zero source file re-reads.

STEP 5 — CONFIRM
Output exactly this block and nothing else:

BOOTED
MAP:     [N files loaded — CREATED if built fresh]
DESIGN:  [EXTRACTED + written to AGENTS.md — or LOADED FROM AGENTS.md]
MODULE:  [from SESSION_SUMMARY or NONE]
FROZEN:  [from SESSION_SUMMARY or NONE]
PENDING: [from SESSION_SUMMARY or NONE]
READY FOR TASK.

Wait for task.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT DOMAIN KNOWLEDGE (always kept in memory)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROLES & ACCESS:
  OWNER         → All branches, all data, finance reports, staff management
  BRANCH_ADMIN  → Own branch only, all features except cross-branch finance
  DOCTOR        → Own appointments, patient consultations, treatment plans
  RECEPTIONIST  → Patient registration, appointments, billing. No finance reports.

CORE PATIENT JOURNEY:
  1. Patient registers → patients table, medical conditions checked
  2. First visit → consultation created (chief complaint, diagnosis, dental chart)
  3. X-rays / photos uploaded → consultation_documents
  4. Prescription written → prescriptions + prescription_medicines
  5. Single visit treatment → invoice created, payment logged
  6. Multi-visit treatment → treatment_plan created with total cost LOCKED upfront
  7. Each visit phase → treatment_plan_phases (status, handoff notes for covering doctor)
  8. Appointments booked → appointments table, linked to treatment_plan_phases
  9. 24hr before → WhatsApp reminder sent, logged in notification_logs
  10. Payment received → payments table, invoice paid_amount + pending_amount auto-updated
  11. Doctor unavailable → doctor_leaves triggers bulk WhatsApp reschedule broadcast

DENTAL CHART RULES:
  Adult chart   → FDI numbering: upper 18-11, 21-28 / lower 48-41, 31-38
  Pediatric chart → FDI numbering: upper 55-51, 61-65 / lower 85-81, 71-75
  Conditions: CARIES, FRACTURE, MOBILITY, ROOT_STUMP, MISSING_TOOTH,
              IMPACTED, SUPRA_ERUPTED, PERIAPICAL_ABSCESS, RCT_DONE, CROWN,
              BRIDGE, IMPLANT

MULTI-BRANCH RULES:
  - Every data table has organization_id for tenant isolation
  - Every clinic data table has branch_id for branch scoping
  - branches.color_code drives calendar appointment badge colors
  - Cross-branch patient search is allowed (search by name, mobile, file_number)
  - Owner sees all branches combined. Others see only their assigned branch.

TREATMENT PLAN RULES:
  - total_cost and final_cost are LOCKED when plan is created. Never change after.
  - Phases can be added dynamically (visit 6 added after visit 5 if needed)
  - Each phase has doctor_notes for covering doctor handoff
  - completed_by on phase can differ from plan's created_by (covering doctor scenario)

FINANCE RULES:
  - Income tracked via payments table (daily/monthly/yearly, by branch, by payment_mode)
  - Expenses tracked via expenses table (by branch, by category, by date)
  - Net Profit = Total Income − Total Expenses (per branch, per date range)
  - Payment modes: CASH, ONLINE, CARD, UPI, CHEQUE
  - GST optional per invoice (0% or 18%)
  - pending_amount on invoice = total − paid_amount (always auto-calculated, never manual)

WHATSAPP RULES:
  - Messages sent via third-party provider REST API (not Meta directly)
  - Templates are hardcoded in notification service (not DB-driven in Phase 1)
  - 24hr reminder: scheduled job runs every evening, checks next day appointments
  - Bulk reschedule: triggered when doctor_leaves.notify_patients = true
  - All sends logged in notification_logs with status QUEUED / SENT / FAILED
  - Patients cannot self-reschedule. They must call the clinic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE RULES (Sequelize + Supabase PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All primary keys:          UUID, auto-generated via DataType.UUIDV4
All foreign keys:          UUID, with @BelongsTo association on same model
All timestamps:            Sequelize auto-managed (createdAt, updatedAt)
Soft delete:               is_active BOOLEAN where applicable (never hard delete patients)
Money fields:              DECIMAL(10,2) always. Never FLOAT. Never INTEGER for money.
Date only fields:          DataType.DATEONLY
Date + Time fields:        DataType.DATE (maps to TIMESTAMPTZ in PostgreSQL)
Time only fields:          DataType.TIME (for schedule start_time, end_time)
Long text fields:          DataType.TEXT (complaints, findings, notes, advice)
Short text fields:         DataType.STRING (names, codes, references)
Enum fields:               TypeScript enum defined above the class, same file
JSON fields:               DataType.JSONB
SSL:                       Always enabled for Supabase (rejectUnauthorized: false)
synchronize:               Always FALSE in production. Use migrations only.

CONFIRMED FINAL TABLE LIST (22 tables — do not add or remove):
  organizations, branches,
  users, user_branches,
  doctor_profiles, doctor_schedules, doctor_leaves,
  patients, medical_condition_masters, patient_medical_conditions,
  procedure_catalog,
  consultations, dental_chart_entries, consultation_documents,
  treatment_plans, treatment_plan_phases,
  appointments,
  invoices, invoice_line_items, payments,
  prescriptions, prescription_medicines,
  expense_categories, expenses,
  notification_logs

appointments.scheduled_at = SINGLE DataType.DATE field (date + time combined)
  Never split into scheduled_date + scheduled_time. If seen split, merge immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND ARCHITECTURE RULES (NestJS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE STRUCTURE:
  src/modules/organization/     → organizations, branches
  src/modules/auth/             → users, user_branches, JWT strategy, guards
  src/modules/doctor/           → doctor_profiles, doctor_schedules, doctor_leaves
  src/modules/patient/          → patients, medical_condition_masters, patient_medical_conditions
  src/modules/catalog/          → procedure_catalog
  src/modules/consultation/     → consultations, dental_chart_entries, consultation_documents
  src/modules/treatment/        → treatment_plans, treatment_plan_phases
  src/modules/appointment/      → appointments
  src/modules/billing/          → invoices, invoice_line_items, payments
  src/modules/prescription/     → prescriptions, prescription_medicines
  src/modules/finance/          → expense_categories, expenses
  src/modules/notification/     → notification_logs, WhatsApp service
  src/modules/reports/          → income reports, expense reports, P&L
  src/jobs/                     → BullMQ workers (reminder job, bulk reschedule job)
  src/common/decorators/        → @CurrentUser, @Roles, @BranchId
  src/common/guards/            → JwtAuthGuard, RolesGuard
  src/common/filters/           → GlobalExceptionFilter
  src/common/interceptors/      → ResponseInterceptor (wraps all responses)
  src/config/                   → database.config.ts, jwt.config.ts, app.config.ts

EVERY MODULE MUST HAVE:
  entities/          → Sequelize model files
  dto/               → create.dto.ts, update.dto.ts, query.dto.ts
  [name].controller.ts
  [name].service.ts
  [name].module.ts

API RESPONSE FORMAT (enforced via ResponseInterceptor on all endpoints):
  Success: { success: true, data: <payload>, message: string }
  Error:   { success: false, error: string, message: string, statusCode: number }

API PREFIX: api/v1
AUTH HEADER: Bearer <JWT access token>
Every protected route must have @UseGuards(JwtAuthGuard, RolesGuard)
Every route with role restriction must have @Roles(Role.OWNER, Role.BRANCH_ADMIN) etc.

DTO RULES:
  - Use class-validator decorators on every DTO field
  - Never accept raw request body without a DTO
  - Use @IsUUID() for all UUID foreign key fields in DTOs
  - Use @IsEnum() for all enum fields
  - Use @IsDecimal() for money fields, @IsDateString() for dates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND ARCHITECTURE RULES (Next.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROUTER: App Router (Next.js 14+)
STYLING: Tailwind CSS + shadcn/ui components only
STATE: TanStack Query (React Query) for all server state
FORMS: React Hook Form + Zod for validation
CALENDAR: FullCalendar React for appointment views
PDF: react-pdf for prescription and invoice rendering
HTTP CLIENT: Axios instance with interceptors (auto-attach JWT, handle 401 refresh)

PAGE STRUCTURE:
  app/(auth)/login/
  app/(dashboard)/
    layout.tsx              → sidebar + header shell
    page.tsx                → owner/admin home dashboard
    patients/               → list, [id]/ detail with tabs
    appointments/           → calendar view + today's schedule
    consultations/[id]/     → clinical examination, dental chart
    treatment-plans/[id]/   → phases, progress, cost summary
    billing/[id]/           → invoice, payments, pending
    finance/                → income, expenses, P&L
    settings/               → branches, doctors, catalog, templates

SIDEBAR ITEMS (in order):
  Dashboard, Patients, Appointments, Consultations,
  Treatment Plans, Billing, Finance, Settings

CALENDAR RULES:
  - Color badge per appointment = branches.color_code from API
  - Filter by: All Branches / specific branch, All Doctors / specific doctor
  - Views: Week (default), Day, Month
  - Clicking slot → book appointment modal
  - Clicking appointment → appointment detail modal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION RULES (enforced every response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXT:
  - Read each file exactly once per session.
  - Never re-open a file unless I explicitly say: CHANGED: filename
  - Batch all reads upfront before any coding begins.
  - FROZEN files: never read, never touch, never output.
  - Trust PROJECT_MAP.md fully. Trust AGENTS.md design tokens fully.
  - Never re-derive anything already recorded in this file.

OUTPUT:
  - Diffs only. Never reprint full files unless I say: fullfile: filename
  - Untouched code: // ... rest unchanged
  - Zero narration. No "I'll now", "Here is", "Let me", "Sure", "Great".
  - Result only. Always.
  - Errors: [FILE:LINE] issue → fix  (one line per error, no prose)
  - No explanations unless I write: explain:

CODE QUALITY:
  - Zero unnecessary comments. No // this does X. No section dividers.
  - Comment only WHY something non-obvious exists. Never WHAT.
  - Infer all conventions from existing code. Never ask if inferable.
  - Types, enums, and interfaces defined first. Single source of truth.
  - One pass per session. Never revisit a processed file.
  - Never use any — always explicit types.
  - Never leave TODO comments in code.
  - All async functions must have try/catch or be wrapped by NestJS exception filters.

DESIGN (pixel perfect — zero deviation):
  - Extracted Design Tokens section is the only source of truth for visuals.
  - Never hardcode any color, font, size, spacing, radius, or shadow.
  - Every value must trace back to an extracted token.
  - Before writing any new page or component:
    1. Identify closest existing page from PROJECT_MAP.md
    2. Apply its layout pattern and token values
    3. Do not re-read any source file
    4. New output must be visually indistinguishable from existing pages
  - If a token value is missing: flag as MISSING_TOKEN: [name] and ask. Never invent.
  - font-black is STRICTLY FORBIDDEN. Use font-semibold or font-medium only.

SECURITY RULES (never violate):
  - Never expose organization_id selection to frontend. Always derive from JWT payload.
  - Never return password_hash in any API response. Strip always.
  - Every DB query must include organization_id filter. No exceptions.
  - Branch-scoped users (DOCTOR, RECEPTIONIST) must have branch_id validated
    against their user_branches record before any data access.
  - File upload URLs must be signed/temporary. Never expose raw S3 bucket URLs.

SESSION SUMMARY:
  - After every major change, update SESSION_SUMMARY.md automatically.
  - Format:
    CHANGED: [file] → [one line what changed]
    ADDED:   [file] → [one line what it does]
    DELETED: [file] → [one line why removed]
    FROZEN:  [list of files not to touch]
    NEXT:    [pending tasks or blockers, one line each]
  - Only file where full sentences are allowed.

PER TASK FORMAT:
  Task:    [one line]
  Files:   [file1, file2]
  Snippet: [10-30 lines of relevant existing code]
  Output:  Tell me only every change in non-technical way with reason —
           "I changed X because Y" or "This prevents Z bug" or
           "Doing this means A will work correctly."
           No walkthroughs. No step-by-step breakdowns unless I say: walkthrough:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Extracted Design Tokens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[EMPTY — Will be extracted and written here on first boot when project has UI files]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROZEN FILES (never touch unless I say unfreeze:)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[NONE YET — Will be populated as stable files are confirmed]
