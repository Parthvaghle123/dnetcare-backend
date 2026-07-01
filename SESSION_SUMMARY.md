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
ADDED: src/modules/catalog/* → Module 4 Catalog (Service, Controller, DTOs, Module)
ADDED: src/modules/patient/* → Module 5 Patients (Service, Controller, DTOs, Module)
CHANGED: src/modules/auth/auth.controller.ts, auth.service.ts → Added public `GET /invite/:token` API for fetching invite info
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
ADDED: src/modules/catalog/* → Module 4 Catalog (Service, Controller, DTOs, Module)
ADDED: src/modules/patient/* → Module 5 Patients (Service, Controller, DTOs, Module)
CHANGED: src/modules/auth/auth.controller.ts, auth.service.ts → Added public `GET /invite/:token` API for fetching invite info
CHANGED: src/app.module.ts → Wired CatalogModule and PatientModule
DELETED: None
FROZEN: None
ADDED: src/modules/consultation/* → Created complete Module 6 Consultations including DTOs, service, controller, and module wiring.
CHANGED: src/modules/consultation/entities/* → Aligned consultation document and chart entry models with requested API schemas (file_key, enums).
CHANGED: src/app.module.ts → Wired ConsultationModule.
CHANGED: src/modules/appointment/entities/appointment.model.ts → Added IN_PROGRESS to AppointmentStatus enum
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
ADDED: src/modules/catalog/* → Module 4 Catalog (Service, Controller, DTOs, Module)
ADDED: src/modules/patient/* → Module 5 Patients (Service, Controller, DTOs, Module)
CHANGED: src/modules/auth/auth.controller.ts, auth.service.ts → Added public `GET /invite/:token` API for fetching invite info
CHANGED: src/app.module.ts → Wired CatalogModule and PatientModule
ADDED: src/modules/consultation/* → Created complete Module 6 Consultations including DTOs, service, controller, and module wiring.
CHANGED: src/modules/consultation/entities/* → Aligned consultation document and chart entry models with requested API schemas (file_key, enums).
CHANGED: src/app.module.ts → Wired ConsultationModule.
CHANGED: src/modules/appointment/entities/appointment.model.ts → Added IN_PROGRESS to AppointmentStatus enum
ADDED: src/modules/appointment/dto/* → Created CreateAppointmentDto, UpdateAppointmentStatusDto, RescheduleAppointmentDto
ADDED: src/modules/appointment/appointment.controller.ts, appointment.service.ts, appointment.module.ts → Created Appointment module with all 7 requested APIs and logic.
CHANGED: src/app.module.ts → Wired AppointmentModule.
ADDED: src/modules/billing/* → Created complete Module 9 Billing including DTOs, service, controller, and module wiring.
CHANGED: src/modules/billing/entities/invoice.model.ts, payment.model.ts → Aligned ENUM values with requested API schemas.
CHANGED: src/app.module.ts → Wired BillingModule.
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
ADDED: src/modules/catalog/* → Module 4 Catalog (Service, Controller, DTOs, Module)
ADDED: src/modules/patient/* → Module 5 Patients (Service, Controller, DTOs, Module)
CHANGED: src/modules/auth/auth.controller.ts, auth.service.ts → Added public `GET /invite/:token` API for fetching invite info
CHANGED: src/app.module.ts → Wired CatalogModule and PatientModule
ADDED: src/modules/consultation/* → Created complete Module 6 Consultations including DTOs, service, controller, and module wiring.
CHANGED: src/modules/consultation/entities/* → Aligned consultation document and chart entry models with requested API schemas (file_key, enums).
CHANGED: src/app.module.ts → Wired ConsultationModule.
CHANGED: src/modules/appointment/entities/appointment.model.ts → Added IN_PROGRESS to AppointmentStatus enum
ADDED: src/modules/appointment/dto/* → Created CreateAppointmentDto, UpdateAppointmentStatusDto, RescheduleAppointmentDto
ADDED: src/modules/appointment/appointment.controller.ts, appointment.service.ts, appointment.module.ts → Created Appointment module with all 7 requested APIs and logic.
CHANGED: src/app.module.ts → Wired AppointmentModule.
ADDED: src/modules/billing/* → Created complete Module 9 Billing including DTOs, service, controller, and module wiring.
CHANGED: src/modules/billing/entities/invoice.model.ts, payment.model.ts → Aligned ENUM values with requested API schemas.
CHANGED: src/app.module.ts → Wired BillingModule.
CHANGED: src/modules/patient/patient.controller.ts, patient.module.ts → Added GET /patients/:id/pending-balance API and imported BillingModule.
ADDED: src/modules/prescription/* → Created complete Module 10 Prescriptions including DTOs, service, controller, and module wiring.
CHANGED: src/modules/prescription/entities/prescription-medicine.model.ts → Added missing quantity column.
CHANGED: src/app.module.ts → Wired PrescriptionModule.
ADDED: src/modules/finance/* → Created complete Module 11 Finance including Expense categories, Expenses, Income Reports, Expense Reports, and P&L Reports.
CHANGED: src/app.module.ts → Wired FinanceModule.
CHANGED: src/modules/catalog/catalog.controller.ts, catalog.service.ts → Added `DELETE /catalog/:id` API for soft deleting procedures (`is_active: false`).
CHANGED: src/modules/auth/entities/user.model.ts, staff.controller.ts, staff.service.ts → Added `is_deleted` field to User model. Updated `deleteStaff` to set `is_deleted: true`, and updated `getStaffList` to filter out deleted staff by default but include both active and inactive staff.
CHANGED: src/modules/catalog/entities/procedure-catalog.model.ts, catalog.service.ts → Refactored `deleteCatalog` to act like staff delete by using `is_deleted: true` flag and skipping `is_active` modifications on delete. Added database column.
CHANGED: src/modules/treatment/dto/create-phase.dto.ts, treatment.service.ts → Made `cost` optional when creating or updating treatment phases. It now automatically pulls `default_cost` from the `ProcedureCatalog` if `procedure_id` is passed and `cost` is omitted.
NEXT: Wait for next module or instructions from user.
