## ./
.env | configuration/docs/script | -
.gitignore | source code | -
.prettierrc | source code | -
AGENTS.md | configuration/docs/script | -
eslint.config.mjs | configuration/docs/script | -
generate-map.js | configuration/docs/script | -
nest-cli.json | configuration/docs/script | -
package-lock.json | configuration/docs/script | -
package.json | configuration/docs/script | -
README.md | configuration/docs/script | -
tsconfig.build.json | configuration/docs/script | -
tsconfig.json | configuration/docs/script | -

## src/
src/app.controller.spec.ts | source code | -
src/app.controller.ts | nest controller | AppController
src/app.module.ts | nest module | AppModule
src/app.service.ts | source code | -
src/main.ts | bootstrap | bootstrap

## src/config/
src/config/database.config.ts | source code | -

## src/database/
src/database/database.module.ts | nest module | DatabaseModule

## src/modules/appointment/entities/
src/modules/appointment/entities/appointment-status-history.model.ts | sequelize model | AppointmentStatusHistory
src/modules/appointment/entities/appointment.model.ts | sequelize model | Appointment
src/modules/appointment/entities/index.ts | barrel export | *

## src/modules/auth/entities/
src/modules/auth/entities/index.ts | barrel export | *
src/modules/auth/entities/refresh-token.model.ts | sequelize model | RefreshToken
src/modules/auth/entities/user-branch.model.ts | sequelize model | UserBranch
src/modules/auth/entities/user.model.ts | sequelize model | User

## src/modules/billing/entities/
src/modules/billing/entities/index.ts | barrel export | *
src/modules/billing/entities/invoice-line-item.model.ts | sequelize model | InvoiceLineItem
src/modules/billing/entities/invoice.model.ts | sequelize model | Invoice
src/modules/billing/entities/payment.model.ts | sequelize model | Payment

## src/modules/catalog/entities/
src/modules/catalog/entities/index.ts | barrel export | *
src/modules/catalog/entities/procedure-catalog.model.ts | sequelize model | ProcedureCatalog
src/modules/catalog/entities/procedure-category.model.ts | sequelize model | ProcedureCategory

## src/modules/consultation/entities/
src/modules/consultation/entities/consultation-document.model.ts | sequelize model | ConsultationDocument
src/modules/consultation/entities/consultation.model.ts | sequelize model | Consultation
src/modules/consultation/entities/dental-chart-entry.model.ts | sequelize model | DentalChartEntry
src/modules/consultation/entities/index.ts | barrel export | *

## src/modules/doctor/entities/
src/modules/doctor/entities/doctor-leave.model.ts | sequelize model | DoctorLeave
src/modules/doctor/entities/doctor-profile.model.ts | sequelize model | DoctorProfile
src/modules/doctor/entities/doctor-schedule.model.ts | sequelize model | DoctorSchedule
src/modules/doctor/entities/index.ts | barrel export | *

## src/modules/finance/entities/
src/modules/finance/entities/expense-category.model.ts | sequelize model | ExpenseCategory
src/modules/finance/entities/expense.model.ts | sequelize model | Expense
src/modules/finance/entities/index.ts | barrel export | *

## src/modules/notification/entities/
src/modules/notification/entities/index.ts | barrel export | *
src/modules/notification/entities/notification-log.model.ts | sequelize model | NotificationLog

## src/modules/organization/entities/
src/modules/organization/entities/branch.model.ts | sequelize model | Branch
src/modules/organization/entities/index.ts | barrel export | *
src/modules/organization/entities/organization.model.ts | sequelize model | Organization

## src/modules/patient/entities/
src/modules/patient/entities/index.ts | barrel export | *
src/modules/patient/entities/medical-condition-master.model.ts | sequelize model | MedicalConditionMaster
src/modules/patient/entities/patient-medical-condition.model.ts | sequelize model | PatientMedicalCondition
src/modules/patient/entities/patient.model.ts | sequelize model | Patient

## src/modules/prescription/entities/
src/modules/prescription/entities/index.ts | barrel export | *
src/modules/prescription/entities/medicine-master.model.ts | sequelize model | MedicineMaster
src/modules/prescription/entities/prescription-medicine.model.ts | sequelize model | PrescriptionMedicine
src/modules/prescription/entities/prescription.model.ts | sequelize model | Prescription

## src/modules/treatment/entities/
src/modules/treatment/entities/index.ts | barrel export | *
src/modules/treatment/entities/treatment-plan-phase.model.ts | sequelize model | TreatmentPlanPhase
src/modules/treatment/entities/treatment-plan.model.ts | sequelize model | TreatmentPlan

## test/
test/app.e2e-spec.ts | source code | -
test/jest-e2e.json | configuration/docs/script | -

