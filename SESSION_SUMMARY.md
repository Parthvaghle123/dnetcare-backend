CHANGED: src/modules/auth/dto/register.dto.ts → Refined validation and made branch_city optional
CHANGED: src/modules/auth/auth.service.ts → Added database transaction and phone duplication check
CHANGED: src/config/database.config.ts → Added global underscored definition and enabled `sync: { alter: true }` in development to automatically apply schema changes without dropping the database.
CHANGED: tsconfig.json → Disabled useDefineForClassFields to fix Sequelize model shadowing validation errors
CHANGED: src/modules/**/*.model.ts (29 files) → Swapped @AllowNull(false) with @CreatedAt and @UpdatedAt decorators for all timestamp fields so Sequelize properly auto-manages them.
CHANGED: src/modules/auth/dto/verify-otp.dto.ts → Updated `otp` field to expect a number in the request body instead of a string.
CHANGED: src/modules/auth/auth.service.ts → Refactored `generateTokens`, `refresh`, and `logout` to properly save and validate sessions using the `RefreshToken` database model instead of basic user hashes.
CHANGED: src/modules/auth/strategies/jwt.strategy.ts → Added database lookup inside `validate` to instantly reject tokens from revoked or expired sessions, fully enforcing strict logout.
CHANGED: src/modules/auth/auth.module.ts → Registered `RefreshToken` model.
CHANGED: src/modules/auth/dto/invite-staff.dto.ts → Made `primary_branch_id` optional using `@IsOptional()`.
CHANGED: src/modules/auth/auth.service.ts → Updated `inviteStaff` to auto-assign `primary_branch_id` if only 1 branch is provided, but throw a BAD_REQUEST if it's omitted when multiple branches are provided.
CHANGED: src/common/filters/global-exception.filter.ts → Enforced strict API error response schema (`{ success, message, error, statusCode }`) and added dynamic generation for `error` shortcodes like `BAD_REQUEST` or `UNAUTHORIZED`.
CHANGED: src/modules/auth/dto/register.dto.ts → Made `phone` field optional.
CHANGED: src/modules/auth/auth.service.ts → Wrapped phone duplication check with if condition for optional phone in registration.
CHANGED: src/modules/organization/dto/update-organization.dto.ts → Added optional `logo_url` field.
CHANGED: src/modules/organization/organization.service.ts → Handled `logo_url` in get and update organization operations.
CHANGED: src/main.ts → Fixed Vercel deployment by exporting a default serverless handler, importing `pg` to force bundling, and separating local bootstrap logic.
CHANGED: src/modules/auth/auth.service.ts → Refactored `logout` to accept optional `refresh_token`. Now accurately supports multi-session by verifying Argon2 hash and only revoking the specific session device.
CHANGED: src/modules/auth/auth.controller.ts → Updated `logout` endpoint to accept optional `refresh_token` from the request body.
CHANGED: src/modules/auth/auth.service.ts → Replaced internal mocked `sendEmail` with proper injection of `EmailService`. Now actually sends Brevo emails instead of logging `DEV EMAIL`.
CHANGED: src/main.ts → Added custom request logging middleware and root `/` path handler.
CHANGED: src/modules/auth/auth.controller.ts → Added comprehensive staff management APIs (`getStaffById`, `updateStaff`, `updateStaffStatus`, `getStaffBranches`).
CHANGED: src/modules/auth/auth.service.ts → Added service logic for `getStaffById`, `updateStaff`, `updateStaffStatus` (with token revocation on deactivate), and `getStaffBranches`.
ADDED: src/modules/organization/* → Created complete Organization and Branch module including DTOs, service, controller, and module wiring. Enforced role-based access control inside the service logic (OWNER, BRANCH_ADMIN, DOCTOR, RECEPTIONIST). Connected to app.module.ts.
ADDED: src/modules/upload/* → Created pure Upload API (`/upload/file`) using Cloudinary. Configured `resource_type: auto` to accept all dental files (Images, PDFs, DICOM, STL, ZIP up to 50MB) and upload them to `dental-software` folder. Returns public URL, size, and metadata.
ADDED: src/modules/notification/* → Created EmailService using Brevo SDK for sending professional OTP emails (Register, Login, Invite Staff) styled specifically for the Dental Clinic theme. Wired NotificationModule globally.
ADDED: src/modules/doctor/* → Created complete Doctor Module including `doctor_profiles`, `doctor_schedules`, and `doctor_leaves`. Generated full CRUD endpoints respecting `reqUser.org_id` and strict `Role` access guards. Hooked up validation DTOs.
CHANGED: src/modules/doctor/dto/*-doctor-profile.dto.ts → Swapped @IsDecimal() to @IsNumber() to allow int and float for default_consultation_fee
DELETED:
FROZEN:
NEXT:
