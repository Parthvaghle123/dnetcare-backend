import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Holiday, HolidayType } from './entities/holiday.model';
import { CreateHolidayDto } from './dto/create-holiday.dto';

export const FIVE_YEAR_INDIAN_HOLIDAYS = [
  // 2026
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: HolidayType.FESTIVAL, icon: '🪁', is_gazetted: true, year: 2026 },
  { date: '2026-01-26', name: 'Republic Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2026 },
  { date: '2026-02-15', name: 'Maha Shivratri', type: HolidayType.GAZETTED, icon: '🔱', is_gazetted: true, year: 2026 },
  { date: '2026-03-03', name: 'Holi', type: HolidayType.GAZETTED, icon: '🎨', is_gazetted: true, year: 2026 },
  { date: '2026-03-04', name: 'Dhuleti', type: HolidayType.FESTIVAL, icon: '🎨', is_gazetted: true, year: 2026 },
  { date: '2026-03-20', name: 'Eid-ul-Fitr', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2026 },
  { date: '2026-03-27', name: 'Ram Navami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2026 },
  { date: '2026-03-31', name: 'Mahavir Jayanti', type: HolidayType.GAZETTED, icon: '🕊️', is_gazetted: true, year: 2026 },
  { date: '2026-04-03', name: 'Good Friday', type: HolidayType.GAZETTED, icon: '✝️', is_gazetted: true, year: 2026 },
  { date: '2026-05-01', name: 'Maharashtra / Gujarat Day', type: HolidayType.FESTIVAL, icon: '🏛️', is_gazetted: false, year: 2026 },
  { date: '2026-05-01', name: 'Buddha Purnima', type: HolidayType.GAZETTED, icon: '🪷', is_gazetted: true, year: 2026 },
  { date: '2026-05-27', name: 'Bakrid / Eid-al-Adha', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2026 },
  { date: '2026-06-25', name: 'Muharram', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2026 },
  { date: '2026-08-15', name: 'Independence Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2026 },
  { date: '2026-08-27', name: 'Raksha Bandhan', type: HolidayType.FESTIVAL, icon: '🧵', is_gazetted: true, year: 2026 },
  { date: '2026-09-04', name: 'Janmashtami', type: HolidayType.GAZETTED, icon: '🦚', is_gazetted: true, year: 2026 },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', type: HolidayType.GAZETTED, icon: '🐘', is_gazetted: true, year: 2026 },
  { date: '2026-09-15', name: 'Milad-un-Nabi', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2026 },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2026 },
  { date: '2026-10-20', name: 'Dussehra / Vijayadashami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2026 },
  { date: '2026-11-08', name: 'Dhanteras', type: HolidayType.FESTIVAL, icon: '🪙', is_gazetted: false, year: 2026 },
  { date: '2026-11-09', name: 'Kali Chaudas', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: false, year: 2026 },
  { date: '2026-11-10', name: 'Diwali / Deepavali', type: HolidayType.GAZETTED, icon: '🪔', is_gazetted: true, year: 2026 },
  { date: '2026-11-11', name: 'Vikram Samvat New Year', type: HolidayType.FESTIVAL, icon: '✨', is_gazetted: true, year: 2026 },
  { date: '2026-11-12', name: 'Bhai Dooj', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: true, year: 2026 },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: HolidayType.GAZETTED, icon: '☬', is_gazetted: true, year: 2026 },
  { date: '2026-12-25', name: 'Christmas Day', type: HolidayType.GAZETTED, icon: '🎄', is_gazetted: true, year: 2026 },

  // 2027
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal', type: HolidayType.FESTIVAL, icon: '🪁', is_gazetted: true, year: 2027 },
  { date: '2027-01-26', name: 'Republic Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2027 },
  { date: '2027-03-07', name: 'Maha Shivratri', type: HolidayType.GAZETTED, icon: '🔱', is_gazetted: true, year: 2027 },
  { date: '2027-03-10', name: 'Eid-ul-Fitr', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2027 },
  { date: '2027-03-22', name: 'Holi', type: HolidayType.GAZETTED, icon: '🎨', is_gazetted: true, year: 2027 },
  { date: '2027-03-23', name: 'Dhuleti', type: HolidayType.FESTIVAL, icon: '🎨', is_gazetted: true, year: 2027 },
  { date: '2027-03-26', name: 'Good Friday', type: HolidayType.GAZETTED, icon: '✝️', is_gazetted: true, year: 2027 },
  { date: '2027-04-15', name: 'Ram Navami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2027 },
  { date: '2027-04-19', name: 'Mahavir Jayanti', type: HolidayType.GAZETTED, icon: '🕊️', is_gazetted: true, year: 2027 },
  { date: '2027-05-16', name: 'Bakrid / Eid-al-Adha', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2027 },
  { date: '2027-05-20', name: 'Buddha Purnima', type: HolidayType.GAZETTED, icon: '🪷', is_gazetted: true, year: 2027 },
  { date: '2027-06-15', name: 'Muharram', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2027 },
  { date: '2027-08-15', name: 'Independence Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2027 },
  { date: '2027-08-17', name: 'Raksha Bandhan', type: HolidayType.FESTIVAL, icon: '🧵', is_gazetted: true, year: 2027 },
  { date: '2027-08-25', name: 'Janmashtami', type: HolidayType.GAZETTED, icon: '🦚', is_gazetted: true, year: 2027 },
  { date: '2027-09-04', name: 'Ganesh Chaturthi', type: HolidayType.GAZETTED, icon: '🐘', is_gazetted: true, year: 2027 },
  { date: '2027-09-05', name: 'Milad-un-Nabi', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2027 },
  { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2027 },
  { date: '2027-10-09', name: 'Dussehra', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2027 },
  { date: '2027-10-29', name: 'Diwali / Deepavali', type: HolidayType.GAZETTED, icon: '🪔', is_gazetted: true, year: 2027 },
  { date: '2027-10-30', name: 'Govardhan Puja / New Year', type: HolidayType.FESTIVAL, icon: '✨', is_gazetted: true, year: 2027 },
  { date: '2027-10-31', name: 'Bhai Dooj', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: true, year: 2027 },
  { date: '2027-11-14', name: 'Guru Nanak Jayanti', type: HolidayType.GAZETTED, icon: '☬', is_gazetted: true, year: 2027 },
  { date: '2027-12-25', name: 'Christmas Day', type: HolidayType.GAZETTED, icon: '🎄', is_gazetted: true, year: 2027 },

  // 2028
  { date: '2028-01-14', name: 'Makar Sankranti / Pongal', type: HolidayType.FESTIVAL, icon: '🪁', is_gazetted: true, year: 2028 },
  { date: '2028-01-26', name: 'Republic Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2028 },
  { date: '2028-02-24', name: 'Maha Shivratri', type: HolidayType.GAZETTED, icon: '🔱', is_gazetted: true, year: 2028 },
  { date: '2028-02-28', name: 'Eid-ul-Fitr', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2028 },
  { date: '2028-03-11', name: 'Holi', type: HolidayType.GAZETTED, icon: '🎨', is_gazetted: true, year: 2028 },
  { date: '2028-03-12', name: 'Dhuleti', type: HolidayType.FESTIVAL, icon: '🎨', is_gazetted: true, year: 2028 },
  { date: '2028-04-03', name: 'Ram Navami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2028 },
  { date: '2028-04-07', name: 'Mahavir Jayanti', type: HolidayType.GAZETTED, icon: '🕊️', is_gazetted: true, year: 2028 },
  { date: '2028-04-14', name: 'Good Friday', type: HolidayType.GAZETTED, icon: '✝️', is_gazetted: true, year: 2028 },
  { date: '2028-05-06', name: 'Bakrid / Eid-al-Adha', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2028 },
  { date: '2028-05-09', name: 'Buddha Purnima', type: HolidayType.GAZETTED, icon: '🪷', is_gazetted: true, year: 2028 },
  { date: '2028-06-03', name: 'Muharram', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2028 },
  { date: '2028-08-05', name: 'Raksha Bandhan', type: HolidayType.FESTIVAL, icon: '🧵', is_gazetted: true, year: 2028 },
  { date: '2028-08-13', name: 'Janmashtami', type: HolidayType.GAZETTED, icon: '🦚', is_gazetted: true, year: 2028 },
  { date: '2028-08-15', name: 'Independence Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2028 },
  { date: '2028-08-24', name: 'Ganesh Chaturthi', type: HolidayType.GAZETTED, icon: '🐘', is_gazetted: true, year: 2028 },
  { date: '2028-08-25', name: 'Milad-un-Nabi', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2028 },
  { date: '2028-10-02', name: 'Mahatma Gandhi Jayanti', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2028 },
  { date: '2028-10-28', name: 'Dussehra', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2028 },
  { date: '2028-11-17', name: 'Diwali / Deepavali', type: HolidayType.GAZETTED, icon: '🪔', is_gazetted: true, year: 2028 },
  { date: '2028-11-18', name: 'Govardhan Puja / New Year', type: HolidayType.FESTIVAL, icon: '✨', is_gazetted: true, year: 2028 },
  { date: '2028-11-19', name: 'Bhai Dooj', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: true, year: 2028 },
  { date: '2028-12-02', name: 'Guru Nanak Jayanti', type: HolidayType.GAZETTED, icon: '☬', is_gazetted: true, year: 2028 },
  { date: '2028-12-25', name: 'Christmas Day', type: HolidayType.GAZETTED, icon: '🎄', is_gazetted: true, year: 2028 },

  // 2029
  { date: '2029-01-14', name: 'Makar Sankranti / Pongal', type: HolidayType.FESTIVAL, icon: '🪁', is_gazetted: true, year: 2029 },
  { date: '2029-01-26', name: 'Republic Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2029 },
  { date: '2029-02-11', name: 'Maha Shivratri', type: HolidayType.GAZETTED, icon: '🔱', is_gazetted: true, year: 2029 },
  { date: '2029-02-15', name: 'Eid-ul-Fitr', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2029 },
  { date: '2029-03-01', name: 'Holi', type: HolidayType.GAZETTED, icon: '🎨', is_gazetted: true, year: 2029 },
  { date: '2029-03-02', name: 'Dhuleti', type: HolidayType.FESTIVAL, icon: '🎨', is_gazetted: true, year: 2029 },
  { date: '2029-03-30', name: 'Good Friday', type: HolidayType.GAZETTED, icon: '✝️', is_gazetted: true, year: 2029 },
  { date: '2029-04-23', name: 'Ram Navami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2029 },
  { date: '2029-04-24', name: 'Bakrid / Eid-al-Adha', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2029 },
  { date: '2029-04-26', name: 'Mahavir Jayanti', type: HolidayType.GAZETTED, icon: '🕊️', is_gazetted: true, year: 2029 },
  { date: '2029-05-24', name: 'Muharram', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2029 },
  { date: '2029-05-27', name: 'Buddha Purnima', type: HolidayType.GAZETTED, icon: '🪷', is_gazetted: true, year: 2029 },
  { date: '2029-07-24', name: 'Milad-un-Nabi', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2029 },
  { date: '2029-08-15', name: 'Independence Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2029 },
  { date: '2029-08-23', name: 'Raksha Bandhan', type: HolidayType.FESTIVAL, icon: '🧵', is_gazetted: true, year: 2029 },
  { date: '2029-09-01', name: 'Janmashtami', type: HolidayType.GAZETTED, icon: '🦚', is_gazetted: true, year: 2029 },
  { date: '2029-09-11', name: 'Ganesh Chaturthi', type: HolidayType.GAZETTED, icon: '🐘', is_gazetted: true, year: 2029 },
  { date: '2029-10-02', name: 'Mahatma Gandhi Jayanti', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2029 },
  { date: '2029-10-16', name: 'Dussehra / Vijayadashami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2029 },
  { date: '2029-11-05', name: 'Diwali / Deepavali', type: HolidayType.GAZETTED, icon: '🪔', is_gazetted: true, year: 2029 },
  { date: '2029-11-06', name: 'Govardhan Puja / New Year', type: HolidayType.FESTIVAL, icon: '✨', is_gazetted: true, year: 2029 },
  { date: '2029-11-07', name: 'Bhai Dooj', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: true, year: 2029 },
  { date: '2029-11-21', name: 'Guru Nanak Jayanti', type: HolidayType.GAZETTED, icon: '☬', is_gazetted: true, year: 2029 },
  { date: '2029-12-25', name: 'Christmas Day', type: HolidayType.GAZETTED, icon: '🎄', is_gazetted: true, year: 2029 },

  // 2030
  { date: '2030-01-14', name: 'Makar Sankranti / Pongal', type: HolidayType.FESTIVAL, icon: '🪁', is_gazetted: true, year: 2030 },
  { date: '2030-01-26', name: 'Republic Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2030 },
  { date: '2030-02-05', name: 'Eid-ul-Fitr', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2030 },
  { date: '2030-03-02', name: 'Maha Shivratri', type: HolidayType.GAZETTED, icon: '🔱', is_gazetted: true, year: 2030 },
  { date: '2030-03-20', name: 'Holi', type: HolidayType.GAZETTED, icon: '🎨', is_gazetted: true, year: 2030 },
  { date: '2030-03-21', name: 'Dhuleti', type: HolidayType.FESTIVAL, icon: '🎨', is_gazetted: true, year: 2030 },
  { date: '2030-04-12', name: 'Ram Navami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2030 },
  { date: '2030-04-14', name: 'Bakrid / Eid-al-Adha', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2030 },
  { date: '2030-04-16', name: 'Mahavir Jayanti', type: HolidayType.GAZETTED, icon: '🕊️', is_gazetted: true, year: 2030 },
  { date: '2030-04-19', name: 'Good Friday', type: HolidayType.GAZETTED, icon: '✝️', is_gazetted: true, year: 2030 },
  { date: '2030-05-13', name: 'Muharram', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2030 },
  { date: '2030-05-17', name: 'Buddha Purnima', type: HolidayType.GAZETTED, icon: '🪷', is_gazetted: true, year: 2030 },
  { date: '2030-07-13', name: 'Milad-un-Nabi', type: HolidayType.GAZETTED, icon: '🌙', is_gazetted: true, year: 2030 },
  { date: '2030-08-13', name: 'Raksha Bandhan', type: HolidayType.FESTIVAL, icon: '🧵', is_gazetted: true, year: 2030 },
  { date: '2030-08-15', name: 'Independence Day', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2030 },
  { date: '2030-08-20', name: 'Janmashtami', type: HolidayType.GAZETTED, icon: '🦚', is_gazetted: true, year: 2030 },
  { date: '2030-09-01', name: 'Ganesh Chaturthi', type: HolidayType.GAZETTED, icon: '🐘', is_gazetted: true, year: 2030 },
  { date: '2030-10-02', name: 'Mahatma Gandhi Jayanti', type: HolidayType.NATIONAL, icon: '🇮🇳', is_gazetted: true, year: 2030 },
  { date: '2030-10-06', name: 'Dussehra / Vijayadashami', type: HolidayType.GAZETTED, icon: '🏹', is_gazetted: true, year: 2030 },
  { date: '2030-10-26', name: 'Diwali / Deepavali', type: HolidayType.GAZETTED, icon: '🪔', is_gazetted: true, year: 2030 },
  { date: '2030-10-27', name: 'Govardhan Puja / New Year', type: HolidayType.FESTIVAL, icon: '✨', is_gazetted: true, year: 2030 },
  { date: '2030-10-28', name: 'Bhai Dooj', type: HolidayType.FESTIVAL, icon: '🪔', is_gazetted: true, year: 2030 },
  { date: '2030-11-10', name: 'Guru Nanak Jayanti', type: HolidayType.GAZETTED, icon: '☬', is_gazetted: true, year: 2030 },
  { date: '2030-12-25', name: 'Christmas Day', type: HolidayType.GAZETTED, icon: '🎄', is_gazetted: true, year: 2030 },
];

@Injectable()
export class HolidayService implements OnModuleInit {
  private readonly logger = new Logger(HolidayService.name);

  constructor(
    @InjectModel(Holiday)
    private readonly holidayModel: typeof Holiday,
  ) {}

  async onModuleInit() {
    try {
      // Ensure is_cancelled column exists silently without any logs or re-seeding
      await this.holidayModel.sequelize?.query(
        'ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false;',
      );
    } catch (e) {
      // ignore
    }
  }

  /**
   * Seed 5 years (2026–2030) of official Indian Government holidays into PostgreSQL
   */
  async seed5Years(): Promise<number> {
    let inserted = 0;
    for (const h of FIVE_YEAR_INDIAN_HOLIDAYS) {
      const [record, created] = await this.holidayModel.findOrCreate({
        where: {
          date: h.date,
          name: h.name,
          organization_id: null,
        },
        defaults: {
          ...h,
          organization_id: null,
          branch_id: null,
          is_cancelled: false,
        },
      });
      if (created) inserted++;
    }
    this.logger.log(`5-Year Indian holidays verified (2026–2030). ${inserted} new holidays seeded.`);
    return inserted;
  }

  /**
   * Find holidays by year, month, and optional organization/branch
   */
  async findAll(query: {
    year?: number | string;
    month?: number | string;
    organization_id?: string;
    branch_id?: string;
  }): Promise<Holiday[]> {
    const where: any = {};

    if (query.year) {
      where.year = Number(query.year);
    }

    if (query.month && query.year) {
      const mStr = String(query.month).padStart(2, '0');
      where.date = {
        [Op.startsWith]: `${query.year}-${mStr}`,
      };
    }

    // Include official universal holidays (organization_id is null) OR holidays specific to this organization
    if (query.organization_id) {
      where[Op.or] = [
        { organization_id: null },
        { organization_id: query.organization_id },
      ];
    }

    // Branch filter: either universal for all branches (branch_id is null) OR for this specific branch
    if (query.branch_id && query.branch_id !== 'all') {
      where[Op.and] = [
        where[Op.and] || {},
        {
          [Op.or]: [{ branch_id: null }, { branch_id: query.branch_id }],
        },
      ];
    }

    return this.holidayModel.findAll({
      where,
      order: [['date', 'ASC']],
    });
  }

  /**
   * Create a custom clinic holiday
   */
  async create(dto: CreateHolidayDto, organizationId?: string): Promise<Holiday> {
    const year = new Date(dto.date).getFullYear();
    return this.holidayModel.create({
      ...dto,
      year,
      type: dto.type || HolidayType.CLINIC,
      icon: dto.icon || '🏥',
      is_gazetted: dto.is_gazetted ?? false,
      organization_id: organizationId || null,
      is_cancelled: false,
    } as any);
  }

  /**
   * Cancel or re-enable a holiday (so clinic can be open on that holiday)
   */
  async toggleCancelHoliday(
    dto: { id?: string; date?: string; branch_id?: string; is_cancelled?: boolean; name?: string; icon?: string },
    organizationId?: string,
  ): Promise<any> {
    const isCancelled = dto.is_cancelled ?? true;
    const date = dto.date ? dto.date.split('T')[0] : null;

    // 1. If an actual DB ID is provided and is not a seed alias
    if (dto.id && !dto.id.startsWith('seed_')) {
      const record = await this.holidayModel.findByPk(dto.id);
      if (record) {
        if (isCancelled && (record.organization_id || record.type === HolidayType.CLINIC)) {
          await record.destroy();
          return { deleted: true, id: dto.id, date: record.date };
        }
        record.is_cancelled = isCancelled;
        await record.save();
        return record;
      }
    }

    // 2. If a date is provided
    if (date) {
      const where: any = { date };
      if (organizationId) {
        where[Op.or] = [
          { organization_id: null },
          { organization_id: organizationId },
        ];
      }
      if (dto.branch_id && dto.branch_id !== 'all') {
        where[Op.and] = [
          where[Op.and] || {},
          {
            [Op.or]: [{ branch_id: null }, { branch_id: dto.branch_id }],
          },
        ];
      }

      const existing = await this.holidayModel.findOne({ where });
      if (existing) {
        if (isCancelled && (existing.organization_id || existing.type === HolidayType.CLINIC)) {
          await existing.destroy();
          return { deleted: true, id: existing.id, date: existing.date };
        }
        existing.is_cancelled = isCancelled;
        await existing.save();
        return existing;
      }

      // If not in DB yet (e.g. from static 5-year seed), create a record with is_cancelled set
      const year = new Date(date).getFullYear();
      return this.holidayModel.create({
        date,
        name: dto.name || 'Holiday',
        type: HolidayType.CLINIC,
        icon: dto.icon || '🏥',
        is_gazetted: false,
        year,
        organization_id: organizationId || null,
        branch_id: dto.branch_id && dto.branch_id !== 'all' ? dto.branch_id : null,
        is_cancelled: isCancelled,
      } as any);
    }

    throw new NotFoundException('Holiday date or ID must be provided');
  }

  /**
   * Delete or cancel a holiday (handles UUIDs, date strings, and seed_ IDs)
   */
  async remove(id: string, organizationId?: string): Promise<boolean> {
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(id);
    const isSeed = id.startsWith('seed_');
    const dateStr = isSeed ? id.replace('seed_', '') : isDate ? id : null;

    if (dateStr) {
      // Mark or delete for that date
      const where: any = {
        date: dateStr,
      };
      if (organizationId) {
        where[Op.or] = [
          { organization_id: null },
          { organization_id: organizationId },
        ];
      }
      const count = await this.holidayModel.destroy({ where });
      if (!count) {
        // If nothing was in DB, record a cancelled override so frontend knows clinic is open
        await this.toggleCancelHoliday({ date: dateStr, is_cancelled: true }, organizationId);
      }
      return true;
    }

    const where: any = { id };
    if (organizationId) {
      where[Op.or] = [
        { organization_id: null },
        { organization_id: organizationId },
      ];
    }
    const count = await this.holidayModel.destroy({ where });
    if (!count) {
      throw new NotFoundException('Holiday not found or you do not have permission to delete it');
    }
    return true;
  }
}
