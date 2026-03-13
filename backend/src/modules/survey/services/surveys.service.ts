import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto, UpdateSurveyDto, QuerySurveyDto } from '../dto/survey.dto';
import { Lead, LeadDocument } from '../../leads/schemas/lead.schema';
import { buildCompleteFilter, UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  // Build complete filter with tenant isolation
  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, baseFilter: any = {}): any {
    const filter = { ...baseFilter };

    // Enforce tenant isolation strictly
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;

    // SuperAdmin bypass or specific tenant context
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tid) {
        filter.tenantId = tid;
      }
      // If no tid and SuperAdmin, don't add tenantId filter (Global View)
    } else {
      // Regular user MUST have a valid tenant context
      if (tid) {
        filter.tenantId = tid;
      } else {
        // Match nothing when tenant context is missing for regular users
        return { _id: { $in: [] as any[] } };
      }
    }

    return filter;
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }

  private generateSurveyId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `S${timestamp}${random}`;
  }

  async create(createSurveyDto: CreateSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating surveys');
    }

    // Check if survey already exists for this lead
    if (createSurveyDto.sourceLeadId) {
      const filter = this.buildCompleteFilter(tenantId, user, {
        sourceLeadId: createSurveyDto.sourceLeadId,
        status: 'Scheduled'
      });
      const existingSurvey = await this.surveyModel.findOne(filter);
      if (existingSurvey) {
        throw new Error(`Survey already scheduled for this lead`);
      }
    }
    
    const surveyId = this.generateSurveyId();
    const newSurvey = new this.surveyModel({
      ...createSurveyDto,
      surveyId,
      status: createSurveyDto.status || 'Scheduled',
      tenantId: tid,
    });
    return newSurvey.save();
  }

  async findAll(
    query: QuerySurveyDto,
    tenantId?: string,
    user?: UserWithVisibility,
  ): Promise<{ data: any[]; total: number; surveys: any[] }> {
    const { page = 1, limit = 100 } = query;

    const tid = this.toObjectId(tenantId);
    if (!tid) {
      return { data: [], total: 0, surveys: [] };
    }

    // Build base filter for site survey leads
    const baseFilter: any = {
      isDeleted: { $ne: true },
      // Leads store the stage in `statusKey` and are normalized to lowercase with underscores.
      // Accept both the normalized form and the raw "SITE_SURVEY" string to match expectations.
      statusKey: { $in: ['site_survey', 'SITE_SURVEY'] },
    };

    // Apply tenant and visibility filtering
    // Admin sees all site survey leads in tenant
    // Agents see only leads assigned to them or created by them
    const filter = buildCompleteFilter(tid, user, baseFilter);

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    const surveys = (leads || []).map((lead: any) => {
      const leadId = lead._id?.toString?.() || lead.id;
      const capacityKw = typeof lead.kw === 'number' ? lead.kw : Number(lead.kw);
      const capacity = Number.isFinite(capacityKw) ? capacityKw : undefined;
      const engineer = typeof lead.assignedTo === 'string' ? lead.assignedTo : (lead.assignedTo?.toString?.() || '');
      const createdAt = lead.updatedAt || lead.updated_at || lead.updatedAt;

      return {
        // Required contract
        id: leadId,
        leadId,
        clientName: lead.name,
        city: lead.city,
        capacity,
        engineer,
        status: 'pending',
        statusCode: 'PENDING',
        createdAt,

        // Backward-compatible aliases for existing survey pages
        _id: leadId,
        surveyId: leadId,
        customerName: lead.name,
        estimatedKw: capacity || 0,
        projectCapacity: capacity ? `${capacity} kW` : 'To be determined',
        site: lead.company || '',
        scheduledDate: lead.nextFollowUp || '',
        sourceLeadId: leadId,
        shadowPct: 0,
        roofArea: typeof lead.roofArea === 'number' ? lead.roofArea : 0,
        notes: lead.notes || '',
      };
    });

    return {
      data: surveys,
      total,
      surveys,
    };
  }

  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<{ total: number; scheduled: number; completed: number; pending: number; totalKw: number }> {
    const tenantFilter = this.buildCompleteFilter(tenantId, user, {});
    const [total, scheduled, completed, pending, totalKwResult] = await Promise.all([
      this.surveyModel.countDocuments(tenantFilter),
      this.surveyModel.countDocuments({ ...tenantFilter, status: 'Scheduled' }),
      this.surveyModel.countDocuments({ ...tenantFilter, status: 'Completed' }),
      this.surveyModel.countDocuments({ ...tenantFilter, status: 'Pending' }),
      this.surveyModel.aggregate([{ $match: tenantFilter }, { $group: { _id: null, total: { $sum: '$estimatedKw' } } }]),
    ]);

    return { total, scheduled, completed, pending, totalKw: totalKwResult[0]?.total || 0 };
  }

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const filter = this.buildCompleteFilter(tenantId, user, { $or: [{ _id: id }, { surveyId: id }] });
    const survey = await this.surveyModel.findOne(filter);
    if (!survey) throw new NotFoundException(`Survey with ID ${id} not found`);
    return survey;
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const filter = this.buildCompleteFilter(tenantId, user, { $or: [{ _id: id }, { surveyId: id }] });
    const survey = await this.surveyModel.findOneAndUpdate(
      filter,
      { $set: updateSurveyDto },
      { new: true },
    );
    if (!survey) throw new NotFoundException(`Survey with ID ${id} not found`);
    return survey;
  }

  async remove(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const filter = this.buildCompleteFilter(tenantId, user, { $or: [{ _id: id }, { surveyId: id }] });
    const result = await this.surveyModel.deleteOne(filter);
    if (result.deletedCount === 0) throw new NotFoundException(`Survey with ID ${id} not found`);
  }
}
