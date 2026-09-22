import { Injectable, Logger, HttpException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Op } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { Holiday } from '../holiday/entities/holiday.model';
import { FIVE_YEAR_INDIAN_HOLIDAYS } from '../holiday/holiday.service';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { User, UserRole } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { WebsiteConfig } from '../website/entities/website-config.model';
import { FestivalPosterSetting } from './entities/festival-poster-setting.model';
import { FestivalPoster } from './entities/festival-poster.model';
import { UploadService } from '../upload/upload.service';
import { StatusCode } from '../../common/enums/status-code.enum';
import { GeneratePosterDto } from './dto/generate-poster.dto';
import { PosterContextQueryDto } from './dto/poster-context-query.dto';
import { SavePosterSettingDto } from './dto/save-poster-setting.dto';

export interface FestivalTemplate {
  name: string;
  category: string;
  icon: string;
  visualTheme: string;
  mood: string;
  colorDirection: string;
  greeting: string;
}

export interface PosterConfig {
  version: string;
  purpose: string;
  selection: any;
  systemFields: any;
  posterDefaults: any;
  festivalTemplates: FestivalTemplate[];
  generationRules: any;
}

@Injectable()
export class FestivalPosterService implements OnModuleInit {
  private readonly logger = new Logger(FestivalPosterService.name);
  private config: PosterConfig;
  private promptTemplate: string;

  constructor(
    @InjectModel(Holiday) private holidayModel: typeof Holiday,
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(DoctorProfile) private doctorProfileModel: typeof DoctorProfile,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectModel(ProcedureCatalog) private catalogModel: typeof ProcedureCatalog,
    @InjectModel(WebsiteConfig) private websiteConfigModel: typeof WebsiteConfig,
    @InjectModel(FestivalPosterSetting) private posterSettingModel: typeof FestivalPosterSetting,
    @InjectModel(FestivalPoster) private posterModel: typeof FestivalPoster,
    private configService: ConfigService,
    private uploadService: UploadService,
  ) {}

  async onModuleInit() {
    this.loadConfigAndPrompt();
    try {
      await this.posterSettingModel.sync({ alter: true });
      await this.posterModel.sync({ alter: true });
      this.logger.log('✅ Festival poster settings & gallery tables synced.');
    } catch (err) {
      this.logger.error('Failed to sync festival poster tables:', err);
    }
  }

  private loadConfigAndPrompt() {
    try {
      // Look for config in assets or root directory
      const candidateConfigPaths = [
        path.join(__dirname, 'assets', 'festival_poster_config.json'),
        path.join(process.cwd(), 'src', 'modules', 'festival-poster', 'assets', 'festival_poster_config.json'),
        path.join(process.cwd(), 'festival_poster_config.json'),
        path.join(process.cwd(), '..', 'festival_poster_config.json'),
      ];

      for (const p of candidateConfigPaths) {
        if (fs.existsSync(p)) {
          this.config = JSON.parse(fs.readFileSync(p, 'utf-8'));
          this.logger.log(`[FestivalPosterService] Loaded festival config from: ${p}`);
          break;
        }
      }

      const candidatePromptPaths = [
        path.join(__dirname, 'assets', 'event_post_gen.txt'),
        path.join(process.cwd(), 'src', 'modules', 'festival-poster', 'assets', 'event_post_gen.txt'),
        path.join(process.cwd(), 'event_post_gen.txt'),
        path.join(process.cwd(), '..', 'event_post_gen.txt'),
      ];

      for (const p of candidatePromptPaths) {
        if (fs.existsSync(p)) {
          this.promptTemplate = fs.readFileSync(p, 'utf-8');
          this.logger.log(`[FestivalPosterService] Loaded event prompt template from: ${p}`);
          break;
        }
      }
    } catch (err) {
      this.logger.error('[FestivalPosterService] Failed to load config or prompt template:', err);
    }
  }

  public getConfig(): PosterConfig {
    if (!this.config) {
      this.loadConfigAndPrompt();
    }
    return this.config;
  }

  public getFestivalTemplates(): FestivalTemplate[] {
    const config = this.getConfig();
    return config?.festivalTemplates || [];
  }

  /**
   * Find matching template from festivalTemplates
   */
  public matchTemplate(holidayName: string): FestivalTemplate {
    const templates = this.getFestivalTemplates();
    if (!holidayName) return templates[0];

    const clean = holidayName.toLowerCase().trim();

    // 1. Direct match
    let match = templates.find(t => t.name.toLowerCase() === clean);
    if (match) return match;

    // 2. Split by slash, e.g. "Makar Sankranti / Pongal" or "Diwali / Deepavali"
    match = templates.find(t => {
      const parts = t.name.toLowerCase().split('/').map(s => s.trim());
      return parts.some(p => clean.includes(p) || p.includes(clean));
    });
    if (match) return match;

    // 3. Keyword / partial matching
    const keywords: { [key: string]: string } = {
      krishna: 'Janmashtami',
      janmashtami: 'Janmashtami',
      diwali: 'Diwali / Deepavali',
      deepavali: 'Diwali / Deepavali',
      holi: 'Holi',
      dhuleti: 'Dhuleti',
      ganesh: 'Ganesh Chaturthi',
      shivratri: 'Maha Shivratri',
      eid: 'Eid-ul-Fitr',
      ramzan: 'Eid-ul-Fitr',
      bakrid: 'Bakrid / Eid-al-Adha',
      independence: 'Independence Day',
      republic: 'Republic Day',
      sankranti: 'Makar Sankranti / Pongal',
      pongal: 'Makar Sankranti / Pongal',
      rakhi: 'Raksha Bandhan',
      raksha: 'Raksha Bandhan',
      navami: 'Ram Navami',
      dussehra: 'Dussehra / Vijayadashami',
      vijayadashami: 'Dussehra / Vijayadashami',
      dhanteras: 'Dhanteras',
      christmas: 'Christmas Day',
      gandhi: 'Mahatma Gandhi Jayanti',
      buddha: 'Buddha Purnima',
      mahavir: 'Mahavir Jayanti',
      muharram: 'Muharram',
      nanak: 'Guru Nanak Jayanti',
      newyear: 'Vikram Samvat New Year',
      bhai: 'Bhai Dooj',
    };

    for (const [kw, templateName] of Object.entries(keywords)) {
      if (clean.includes(kw)) {
        const found = templates.find(t => t.name.toLowerCase().includes(templateName.toLowerCase()));
        if (found) return found;
      }
    }

    // Default fallback
    return {
      name: holidayName,
      category: 'FESTIVAL',
      icon: '✨',
      visualTheme: `Indian celebration of ${holidayName}, traditional flowers, glowing diyas, elegant Indian motifs and warm festive lighting`,
      mood: 'joyful, prosperous, auspicious, celebratory',
      colorDirection: 'gold, saffron, warm orange, deep blue',
      greeting: `Happy ${holidayName}`,
    };
  }

  /**
   * Fetch upcoming festival holidays from DB and attach templates
   */
  async getUpcomingFestivalHolidays(reqUser: any, branchId?: string, year?: number) {
    const orgId = reqUser?.org_id || reqUser?.organization_id;
    const targetYear = year || new Date().getFullYear();

    const whereClause: any = {
      is_cancelled: false,
      year: targetYear,
      [Op.and]: [
        {
          [Op.or]: [
            { organization_id: null }, // universal government holidays
            ...(orgId ? [{ organization_id: orgId }] : []),
          ],
        },
      ],
    };

    if (branchId) {
      whereClause[Op.and].push({
        [Op.or]: [
          { branch_id: null },
          { branch_id: branchId },
        ],
      });
    }

    let holidays = await this.holidayModel.findAll({
      where: whereClause,
      order: [['date', 'ASC']],
      limit: 100,
    });

    // Fallback to FIVE_YEAR_INDIAN_HOLIDAYS if database returns none for this year
    if (!holidays || holidays.length === 0) {
      const filteredDefaults = FIVE_YEAR_INDIAN_HOLIDAYS.filter(h => h.year === targetYear);
      return filteredDefaults.map((h, idx) => {
        const template = this.matchTemplate(h.name);
        return {
          id: `default-${h.year}-${idx}`,
          name: h.name,
          date: h.date,
          type: h.type,
          icon: h.icon || template.icon,
          is_gazetted: h.is_gazetted,
          year: h.year,
          branch_id: null,
          organization_id: null,
          template: {
            visualTheme: template.visualTheme,
            mood: template.mood,
            colorDirection: template.colorDirection,
            greeting: template.greeting,
            icon: template.icon,
            category: template.category,
          },
        };
      });
    }

    return holidays.map(h => {
      const template = this.matchTemplate(h.name);
      return {
        id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
        icon: h.icon || template.icon,
        is_gazetted: h.is_gazetted,
        year: h.year,
        branch_id: h.branch_id,
        organization_id: h.organization_id,
        template: {
          visualTheme: template.visualTheme,
          mood: template.mood,
          colorDirection: template.colorDirection,
          greeting: template.greeting,
          icon: template.icon,
          category: template.category,
        },
      };
    });
  }

  /**
   * Fetch saved Festival Poster Studio configurations from DB
   */
  async getPosterSettings(reqUser: any, branchId?: string): Promise<FestivalPosterSetting | null> {
    const orgId = reqUser?.org_id || reqUser?.organization_id;
    if (!orgId) return null;

    let setting: FestivalPosterSetting | null = null;
    if (branchId) {
      setting = await this.posterSettingModel.findOne({
        where: { organization_id: orgId, branch_id: branchId },
      });
    }
    if (!setting) {
      setting = await this.posterSettingModel.findOne({
        where: { organization_id: orgId },
        order: [['updated_at', 'DESC']],
      });
    }
    return setting;
  }

  /**
   * Save or update Festival Poster Studio configurations in DB
   */
  async savePosterSettings(reqUser: any, dto: SavePosterSettingDto): Promise<FestivalPosterSetting> {
    const orgId = reqUser?.org_id || reqUser?.organization_id;
    if (!orgId) {
      throw new HttpException('Organization ID is required', StatusCode.BAD_REQUEST);
    }

    const whereClause: any = { organization_id: orgId };
    if (dto.branch_id) {
      whereClause.branch_id = dto.branch_id;
    }

    let existing = await this.posterSettingModel.findOne({ where: whereClause });
    if (!existing && !dto.branch_id) {
      existing = await this.posterSettingModel.findOne({ where: { organization_id: orgId } });
    }

    let doctorPhotoUrl = dto.doctor_photo_url !== undefined ? dto.doctor_photo_url : existing?.doctor_photo_url;
    let clinicLogoUrl = dto.clinic_logo_url !== undefined ? dto.clinic_logo_url : existing?.clinic_logo_url;

    // 1. Upload doctor photo to Cloudinary if it is a base64 DataURI
    if (doctorPhotoUrl && doctorPhotoUrl.startsWith('data:')) {
      try {
        this.logger.log('[savePosterSettings] Uploading doctor photo base64 to Cloudinary...');
        const uploadedUrl = await this.uploadService.uploadBase64(doctorPhotoUrl, 'dental-software/festival-posters');
        if (uploadedUrl) {
          doctorPhotoUrl = uploadedUrl;
          this.logger.log(`[savePosterSettings] Doctor photo uploaded to Cloudinary: ${uploadedUrl}`);
        }
      } catch (err) {
        this.logger.error('Failed to upload doctor photo base64 to Cloudinary:', err);
      }
    }

    // 2. Upload clinic logo to Cloudinary if it is a base64 DataURI
    if (clinicLogoUrl && clinicLogoUrl.startsWith('data:')) {
      try {
        this.logger.log('[savePosterSettings] Uploading clinic logo base64 to Cloudinary...');
        const uploadedUrl = await this.uploadService.uploadBase64(clinicLogoUrl, 'dental-software/festival-posters');
        if (uploadedUrl) {
          clinicLogoUrl = uploadedUrl;
          this.logger.log(`[savePosterSettings] Clinic logo uploaded to Cloudinary: ${uploadedUrl}`);
        }
      } catch (err) {
        this.logger.error('Failed to upload clinic logo base64 to Cloudinary:', err);
      }
    }

    // 3. Resolve doctor_name to guarantee it is specified and never NULL
    const doctorId = dto.doctor_id !== undefined ? dto.doctor_id : existing?.doctor_id;
    let doctorName = dto.doctor_name || dto.system_overrides?.doctorName || existing?.doctor_name;

    if (!doctorName && doctorId) {
      const docUser = await this.userModel.findByPk(doctorId);
      if (docUser) {
        const rawName = `${docUser.first_name || ''} ${docUser.last_name || ''}`.trim();
        if (rawName) {
          doctorName = rawName.toLowerCase().startsWith('dr') ? rawName : `Dr. ${rawName}`;
        }
      }
    }

    if (!doctorName && orgId) {
      const defaultDoc = await this.userModel.findOne({
        where: {
          organization_id: orgId,
          role: { [Op.in]: [UserRole.OWNER, UserRole.DOCTOR, UserRole.BRANCH_ADMIN] },
        },
      });
      if (defaultDoc) {
        const rawName = `${defaultDoc.first_name || ''} ${defaultDoc.last_name || ''}`.trim();
        if (rawName) {
          doctorName = rawName.toLowerCase().startsWith('dr') ? rawName : `Dr. ${rawName}`;
        }
      }
    }

    if (!doctorName) {
      doctorName = 'Dr. Dental Specialist';
    }

    const payload: any = {
      organization_id: orgId,
      branch_id: dto.branch_id || existing?.branch_id || null,
      doctor_id: doctorId || null,
      doctor_name: doctorName,
      doctor_photo_url: doctorPhotoUrl || null,
      clinic_logo_url: clinicLogoUrl || null,
      custom_greeting: dto.custom_greeting !== undefined ? dto.custom_greeting : existing?.custom_greeting,
      display_options: dto.display_options !== undefined ? dto.display_options : existing?.display_options,
      system_overrides: {
        ...(existing?.system_overrides || {}),
        ...(dto.system_overrides || {}),
        doctorName: doctorName,
      },
    };

    if (existing) {
      await existing.update(payload);
      return existing;
    } else {
      return await this.posterSettingModel.create(payload);
    }
  }

  /**
   * Resolve runtime poster context combining Festival + Organization + Branch + Doctor + Defaults
   */
  async resolvePosterContext(reqUser: any, query: PosterContextQueryDto, overrides?: GeneratePosterDto) {
    const orgId = reqUser?.org_id || reqUser?.organization_id;
    const config = this.getConfig();

    const branchId = overrides?.branch_id || query.branch_id;
    // Retrieve persistent studio settings from DB if available
    const savedSetting = await this.getPosterSettings(reqUser, branchId);

    // 1. Identify Holiday by date or holiday_id according to priority
    let holiday: Holiday | null = null;
    let selectedDate = overrides?.date || query.date || new Date().toISOString().split('T')[0];

    if (overrides?.holiday_id || query.holiday_id) {
      holiday = await this.holidayModel.findByPk(overrides?.holiday_id || query.holiday_id);
      if (holiday) {
        selectedDate = holiday.date;
      }
    }

    if (!holiday && selectedDate) {
      // Priority: branch_id -> organization_id -> global (organization_id is null)
      const candidates = await this.holidayModel.findAll({
        where: {
          date: selectedDate,
          is_cancelled: false,
          [Op.or]: [
            { organization_id: null },
            ...(orgId ? [{ organization_id: orgId }] : []),
          ],
        },
      });

      if (candidates.length > 0) {
        if (branchId) {
          holiday = candidates.find(c => c.branch_id === branchId) || null;
        }
        if (!holiday && orgId) {
          holiday = candidates.find(c => c.organization_id === orgId && !c.branch_id) || null;
        }
        if (!holiday) {
          holiday = candidates.find(c => !c.organization_id) || candidates[0];
        }
      }
    }

    let holidayName = holiday ? holiday.name : '';
    let holidayIcon = holiday?.icon;
    let holidayType = holiday?.type;

    if (!holidayName && selectedDate) {
      const defaultMatch = FIVE_YEAR_INDIAN_HOLIDAYS.find(h => h.date === selectedDate);
      if (defaultMatch) {
        holidayName = defaultMatch.name;
        holidayIcon = defaultMatch.icon;
        holidayType = defaultMatch.type;
      }
    }

    if (!holidayName) {
      holidayName = 'Indian Festival';
    }

    const template = this.matchTemplate(holidayName);

    // 2. Fetch Organization Information
    let org: Organization | null = null;
    let websiteConfig: WebsiteConfig | null = null;
    if (orgId) {
      org = await this.orgModel.findByPk(orgId);
      websiteConfig = await this.websiteConfigModel.findOne({ where: { organization_id: orgId } });
    }

    // 3. Fetch Clinic / Branch Information
    let branch: Branch | null = null;
    if (branchId) {
      branch = await this.branchModel.findOne({
        where: { id: branchId, ...(orgId ? { organization_id: orgId } : {}) },
      });
    }
    if (!branch && orgId) {
      branch = await this.branchModel.findOne({
        where: { organization_id: orgId, is_active: true },
        order: [['created_at', 'ASC']],
      });
    }

    // 4. Fetch Doctor Information
    let doctorUser: User | null = null;
    let doctorProfile: DoctorProfile | null = null;
    const doctorId = overrides?.doctor_id || query.doctor_id || savedSetting?.doctor_id;

    if (doctorId) {
      doctorUser = await this.userModel.findOne({
        where: { id: doctorId, ...(orgId ? { organization_id: orgId } : {}) },
      });
    }
    if (!doctorUser && branch?.id) {
      const userBranch = await this.userBranchModel.findOne({
        where: { branch_id: branch.id },
        include: [{ model: User }],
      });
      if (userBranch?.user) {
        doctorUser = userBranch.user;
      }
    }
    if (!doctorUser && orgId) {
      doctorUser = await this.userModel.findOne({
        where: {
          organization_id: orgId,
          role: { [Op.in]: [UserRole.OWNER, UserRole.DOCTOR, UserRole.BRANCH_ADMIN] },
        },
      });
    }

    if (doctorUser) {
      doctorProfile = await this.doctorProfileModel.findOne({
        where: { user_id: doctorUser.id },
      });
    }

    // 5. Fetch Services items from Catalog
    let serviceNames: string[] = [];
    if (orgId) {
      const procedures = await this.catalogModel.findAll({
        where: { organization_id: orgId, is_active: true },
        limit: 8,
        attributes: ['name'],
      });
      serviceNames = procedures.map(p => p.name);
    }
    if (serviceNames.length === 0) {
      serviceNames = [
        'Root Canal Treatment',
        'Dental Implants',
        'Teeth Whitening',
        'Braces & Aligners',
        'Cosmetic Dentistry',
        'Smile Makeover',
      ];
    }

    // 6. Merge display options & defaults
    const defaults = config?.posterDefaults || {};
    const mergedDisplay = {
      ...defaults,
      ...(savedSetting?.display_options || {}),
      ...(overrides?.display_options || {}),
    };

    // 7. Format Doctor title & name
    const docFirstName = doctorUser?.first_name || '';
    const docLastName = doctorUser?.last_name || '';
    let rawDocName = `${docFirstName} ${docLastName}`.trim();
    if (rawDocName && !rawDocName.toLowerCase().startsWith('dr')) {
      rawDocName = `Dr. ${rawDocName}`;
    }

    // 8. Build Context
    const tagline = websiteConfig?.branding?.tagline || org?.name ? `Specialized Multi-Speciality Dental Care` : '';
    const doctorPhoto = savedSetting?.doctor_photo_url || null;
    const clinicLogo = savedSetting?.clinic_logo_url || org?.logo_url || branch?.logo_url || null;

    const customGreeting =
      overrides?.custom_greeting ||
      savedSetting?.custom_greeting ||
      template.greeting;

    const context: any = {
      event: {
        id: holiday?.id || null,
        name: holidayName,
        date: selectedDate,
        category: holidayType || holiday?.type || template.category || 'FESTIVAL',
        icon: holidayIcon || holiday?.icon || template.icon || '✨',
        visualTheme: template.visualTheme,
        mood: template.mood,
        colorDirection: template.colorDirection,
        greeting: customGreeting,
      },
      organization: {
        id: org?.id || null,
        name: savedSetting?.system_overrides?.organizationName || org?.name || 'DentCare Dental Clinic',
        logo: clinicLogo,
        tagline: savedSetting?.system_overrides?.tagline || tagline || null,
      },
      clinic: {
        name: savedSetting?.system_overrides?.clinicName || org?.name || 'DentCare Dental Clinic',
        branchId: branch?.id || null,
        branchName: savedSetting?.system_overrides?.branchName || branch?.name || null,
        address: savedSetting?.system_overrides?.address || branch?.address || null,
        city: branch?.city || null,
        state: branch?.state || null,
        pincode: branch?.pincode || null,
      },
      doctor: {
        id: doctorUser?.id || null,
        name: savedSetting?.system_overrides?.doctorName || rawDocName || 'Dr. Dental Specialist',
        qualification: savedSetting?.system_overrides?.qualification || doctorProfile?.qualification || 'BDS, MDS',
        specialization: savedSetting?.system_overrides?.specialization || doctorProfile?.specialization || 'Dental Surgeon & Implantologist',
        registrationNumber: savedSetting?.system_overrides?.registrationNumber || doctorProfile?.registration_number || null,
        experience: savedSetting?.system_overrides?.experience || '10+ Years Exp',
        photo: doctorPhoto,
      },
      contact: {
        mobile: savedSetting?.system_overrides?.phone || branch?.phone || org?.phone || doctorUser?.phone || '+91 98765 43210',
        whatsapp: savedSetting?.system_overrides?.whatsapp || branch?.whatsapp_number || branch?.phone || org?.phone || '+91 98765 43210',
        email: savedSetting?.system_overrides?.email || doctorUser?.email || null,
        website: savedSetting?.system_overrides?.website || (org?.custom_domain
          ? `https://${org.custom_domain}`
          : org?.subdomain
          ? `https://${org.subdomain}.dentcare360.com`
          : null),
      },
      services: {
        items: serviceNames.slice(0, 5),
      },
      poster: {
        language: overrides?.language || defaults.language || 'English',
        aspectRatio: overrides?.aspect_ratio || defaults.aspectRatio || '4:5',
        ...mergedDisplay,
      },
      rules: config?.generationRules || {},
      savedSetting: savedSetting ? savedSetting.toJSON() : null,
      doctorPhotoUrl: doctorPhoto,
      clinicLogoUrl: clinicLogo,
    };

    return context;
  }

  /**
   * Builds the AI image generation prompt following event_post_gen.txt rules
   */
  buildArtworkPrompt(context: any, customAdditions?: string): string {
    const { event } = context;

    // Focused prompt for OpenAI DALL-E 3:
    // It creates the visual artwork for the festival, leaving the bottom 15-22% suitable for branding
    let prompt = `A breathtaking, ultra-premium commercial Indian festival poster background for "${event.name}". `;
    prompt += `Visual theme: ${event.visualTheme}. `;
    prompt += `Festival mood: ${event.mood}. `;
    prompt += `Color palette: ${event.colorDirection}. `;
    prompt += `Art direction: Masterful Indian devotional artwork, cinematic divine lighting, intricate traditional temple architectural motifs, rich fabric textures, photorealistic materials, vibrant Indian festive aesthetics, high-end commercial poster illustration. `;
    prompt += `Crucial composition requirements: 4:5 vertical portrait composition. Hero deity or festival subject centered majestically in the upper and middle sections. The bottom 18% of the image MUST be a clean, elegant, subtly shaded gradient floor with no clutter or busy elements, reserved as a tranquil base for clinic branding overlay. `;
    prompt += `Strict negative constraints: Do NOT include any distorted faces, extra limbs, artificial floating English letters, misspelled text, fake logos, or watermarks. Pure divine artistic visual masterpiece.`;

    if (customAdditions) {
      prompt += ` Additional styling: ${customAdditions}`;
    }

    return prompt;
  }

  /**
   * Generates artwork via OpenAI Image API (DALL-E 3) with fallback
   */
  async generateArtwork(reqUser: any, dto: GeneratePosterDto) {
    const context = await this.resolvePosterContext(reqUser, dto, dto);
    const prompt = this.buildArtworkPrompt(context, dto.custom_prompt_additions);

    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

    this.logger.log(`[generateArtwork] Starting poster generation for festival: "${context.event.name}"`);

    let artworkUrl: string | null = null;
    let provider = 'fallback';
    let revisedPrompt = '';

    if (openAiApiKey && openAiApiKey.trim().length > 10) {
      try {
        this.logger.log(`[generateArtwork] Calling OpenAI DALL-E 3 API...`);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1792', // Vertical format, ideal for 4:5 cropping
            quality: 'standard',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.data && data.data.length > 0) {
            artworkUrl = data.data[0].url;
            revisedPrompt = data.data[0].revised_prompt || prompt;
            provider = 'openai-dalle-3';
            this.logger.log(`[generateArtwork] OpenAI image generated successfully: ${artworkUrl}`);
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          this.logger.warn(`[generateArtwork] OpenAI API returned error: ${JSON.stringify(errData)}`);
        }
      } catch (e) {
        this.logger.error('[generateArtwork] OpenAI API call failed:', e);
      }
    } else {
      this.logger.log('[generateArtwork] OPENAI_API_KEY not configured. Using curated festival artwork engine.');
    }

    // Fallback if OpenAI did not return an image or is not configured
    if (!artworkUrl) {
      artworkUrl = this.getCuratedFestivalArtworkUrl(context.event.name, context.event.colorDirection);
      provider = 'curated-art-engine';
    }

    const result = {
      success: true,
      provider,
      artworkUrl,
      prompt,
      revisedPrompt,
      context,
      meta: {
        aspectRatio: context.poster.aspectRatio || '4:5',
        format: 'social-media',
        resolution: '1080x1350',
      },
    };

    // Automatically record generated poster into organization gallery
    try {
      await this.recordGeneratedPoster(reqUser, {
        id: `poster-${Date.now()}`,
        name: context.event.name,
        date: context.event.date,
        icon: context.event.icon || '✨',
        artworkUrl: artworkUrl,
        doctorName: context.doctor?.name || 'Dr. Dental Specialist',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        organizationId: reqUser?.organization_id || null,
        provider,
      });
    } catch (recordErr) {
      this.logger.warn(`Could not persist generated poster to gallery file: ${recordErr.message}`);
    }

    return result;
  }

  /**
   * Path for persistent gallery records
   */
  private getGalleryFilePath(): string {
    const dir = path.join(process.cwd(), 'uploads', 'festival-posters');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'generated_gallery.json');
  }

  private readGalleryFromFile(): any[] {
    try {
      const p = this.getGalleryFilePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      this.logger.error('Failed to read gallery file:', e);
    }
    return [];
  }

  private writeGalleryToFile(items: any[]) {
    try {
      const p = this.getGalleryFilePath();
      fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error('Failed to write gallery file:', e);
    }
  }

  async getGeneratedGallery(user: any): Promise<any[]> {
    const orgId = user?.org_id || user?.organization_id;
    try {
      if (orgId) {
        const dbPosters = await this.posterModel.findAll({
          where: { organization_id: orgId },
          order: [['created_at', 'DESC']],
          limit: 100,
        });
        if (dbPosters && dbPosters.length > 0) {
          return dbPosters.map((p) => ({
            id: p.id,
            name: p.holiday_name,
            date: p.holiday_date,
            icon: p.icon || '✨',
            artworkUrl: p.artwork_url,
            doctorName: p.doctor_name,
            createdAt: p.createdAt,
            organizationId: p.organization_id,
            branchId: p.branch_id,
          }));
        }
      }
    } catch (e) {
      this.logger.warn('Failed to fetch gallery from database, falling back to file:', e);
    }

    const all = this.readGalleryFromFile();
    if (!orgId) return all;
    return all.filter((item) => !item.organizationId || item.organizationId === orgId);
  }

  async recordGeneratedPoster(user: any, poster: any): Promise<any> {
    const orgId = user?.org_id || user?.organization_id || poster.organizationId || null;
    let savedDbRecord: any = null;

    let finalArtworkUrl = poster.artworkUrl;

    // If poster artwork is a base64 DataURI, upload to Cloudinary for permanent hosting
    if (finalArtworkUrl && finalArtworkUrl.startsWith('data:')) {
      try {
        this.logger.log('[recordGeneratedPoster] Uploading composited festival poster to Cloudinary...');
        const uploadedUrl = await this.uploadService.uploadBase64(
          finalArtworkUrl,
          'dental-software/generated-posters',
        );
        if (uploadedUrl) {
          finalArtworkUrl = uploadedUrl;
          this.logger.log(`[recordGeneratedPoster] Poster uploaded to Cloudinary: ${uploadedUrl}`);
        }
      } catch (err) {
        this.logger.error('Failed to upload poster to Cloudinary:', err);
      }
    }

    try {
      if (orgId && finalArtworkUrl) {
        savedDbRecord = await this.posterModel.create({
          organization_id: orgId,
          branch_id: poster.branchId || null,
          holiday_id: poster.holidayId || null,
          holiday_name: poster.name || 'Festival Poster',
          holiday_date: poster.date || new Date().toISOString().split('T')[0],
          icon: poster.icon || '✨',
          artwork_url: finalArtworkUrl,
          doctor_name: poster.doctorName || null,
        });
      }
    } catch (e) {
      this.logger.warn('Failed to save poster to database, falling back to file:', e);
    }

    const all = this.readGalleryFromFile();
    const item = {
      ...poster,
      id: savedDbRecord?.id || poster.id || Date.now(),
      artworkUrl: finalArtworkUrl,
      organizationId: orgId,
      createdAt: poster.createdAt || new Date().toISOString(),
    };
    const updated = [item, ...all.filter((p) => p.id !== item.id)].slice(0, 100);
    this.writeGalleryToFile(updated);
    return item;
  }

  /**
   * Curated high-fidelity festival aesthetic backgrounds as reliable fallback
   */
  private getCuratedFestivalArtworkUrl(festivalName: string, colorDirection: string): string {
    const clean = festivalName.toLowerCase();

    // High quality festival imagery placeholders from verified Unsplash & curated festival assets
    if (clean.includes('krishna') || clean.includes('janmashtami')) {
      return 'https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('diwali') || clean.includes('deepavali') || clean.includes('dhanteras') || clean.includes('kali')) {
      return 'https://images.unsplash.com/photo-1574895697207-e0708f51278b?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('holi') || clean.includes('dhuleti')) {
      return 'https://images.unsplash.com/photo-1616428236109-17d59858348d?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('ganesh')) {
      return 'https://images.unsplash.com/photo-1567591370504-20922880b91e?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('shivratri')) {
      return 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('eid') || clean.includes('bakrid') || clean.includes('muharram')) {
      return 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('independence') || clean.includes('republic')) {
      return 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('raksha') || clean.includes('rakhi')) {
      return 'https://images.unsplash.com/photo-1629853488805-4c07921a9c24?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('sankranti') || clean.includes('pongal')) {
      return 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1080&auto=format&fit=crop';
    }
    if (clean.includes('christmas')) {
      return 'https://images.unsplash.com/photo-1543258103-a62bdc069871?q=80&w=1080&auto=format&fit=crop';
    }

    // Majestic Indian Festive Golden Bokeh / Palace Night default
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop';
  }
}
