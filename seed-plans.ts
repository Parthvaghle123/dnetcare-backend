import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Plan, PlanType } from './src/modules/subscription/entities/plan.model';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const plans = [
    {
      name: 'Digital Presence',
      description: 'Perfect for doctors using another clinic software. Google Business Optimization, Instagram Setup, Facebook Setup, Monthly 8 Posters, 2 Educational Reels, Caption + Hashtags, Monthly Report.',
      price_monthly: 1999,
      type: PlanType.MARKETING,
      max_branches: null,
      max_patients: null,
      max_appointments: null,
      is_active: true,
    },
    {
      name: 'Growth Plan',
      description: 'Everything in Plan 1 + more to grow faster. 8 Reels, 12 Posters, Weekly Stories, Review Collection Campaign, One-page Website, WhatsApp CTA, Monthly Strategy Call.',
      price_monthly: 4999,
      type: PlanType.MARKETING,
      max_branches: null,
      max_patients: null,
      max_appointments: null,
      is_active: true,
    },
    {
      name: 'Practice Growth',
      description: 'Everything in Plan 2 + complete growth system. DentCare360 Software, Website & Appointment Booking, Patient Review Automation, 12 Professional Reels, 20 Graphics, Google SEO, Instagram & Facebook Mgmt, Monthly Analytics.',
      price_monthly: 8999,
      type: PlanType.BUNDLE,
      max_branches: null,
      max_patients: null,
      max_appointments: null,
      is_active: true,
    },
    {
      name: 'Premium Growth',
      description: 'For multi-branch clinics & serious growth. Everything in Plan 3, Professional Video Shoot, Ads Management & Leads, Personal Content Strategy, Monthly Doctor Interview, YouTube Shorts & Blog, Dedicated Account Manager, Priority Support.',
      price_monthly: 16999,
      type: PlanType.BUNDLE,
      max_branches: null,
      max_patients: null,
      max_appointments: null,
      is_active: true,
    },
    {
      name: 'Pro Plan',
      description: 'For growing clinics & single location practices. 1 Branch Mgmt, 300 Appointments, Finance Mgmt, Procedure Catalog Mgmt, WhatsApp SMS Integration, 100 Patients Mgmt, Invoice Mgmt, Staff Mgmt.',
      price_monthly: 1999,
      type: PlanType.SOFTWARE,
      max_branches: 1,
      max_patients: 100,
      max_appointments: 300,
      is_active: true,
    },
    {
      name: 'Ultra Pro Plan',
      description: 'For multi-branch dental practices & enterprise. 3 Branch Mgmt, Unlimited Appointments, Staff Mgmt, Procedure Catalog Mgmt, WhatsApp SMS Integration, Unlimited Patients Mgmt, Invoice Mgmt, Finance Mgmt.',
      price_monthly: 3999,
      type: PlanType.SOFTWARE,
      max_branches: 3,
      max_patients: null,
      max_appointments: null,
      is_active: true,
    }
  ];

  for (const planData of plans) {
    const existingPlan = await Plan.findOne({ where: { name: planData.name } });
    if (!existingPlan) {
      await Plan.create(planData);
      console.log(`Created plan: ${planData.name}`);
    } else {
      console.log(`Plan already exists: ${planData.name}`);
    }
  }

  await app.close();
}

bootstrap();
