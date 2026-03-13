import { BadRequestException, Injectable, NotFoundException, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey, SurveyDocument, SurveyStatus } from '../schemas/site-survey.schema';
import {
  CreateSiteSurveyDto,
  UpdateSiteSurveyDto,
  QuerySiteSurveyDto,
  MoveToActiveDto,
  MoveToCompleteDto,
  AssignSurveyDto
} from '../dto/site-survey.dto';
import { LeadsService } from '../../leads/services/leads.service';
import { UserWithVisibility, buildVisibilityFilter, applyVisibilityFilter, canAccessRecord } from '../../../common/utils/visibility-filter';

@Injectable()
export class SiteSurveysService {
  private readonly logger = new Logger(SiteSurveysService.name);

  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
    @Inject(forwardRef(() => LeadsService))
    private leadsService: LeadsService
  ) {}

  // Build complete filter with tenant isolation AND visibility rules
  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, baseFilter: any = {}): any {
    // Start with base filter including soft delete protection
    let filter: any = { isDeleted: { $ne: true }, ...baseFilter };

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

    // Apply role-based visibility filtering (for AGENT/MANAGER with ASSIGNED scope)
    if (user && !(user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'admin')) {
      const visibilityFilter = buildVisibilityFilter(user);
      if (Object.keys(visibilityFilter).length > 0 && visibilityFilter.tenantId !== null) {
        filter = applyVisibilityFilter(filter, user);
      }
    }

    return filter;
  }

  // Check if user can access a specific survey
  private canAccessSurvey(user: UserWithVisibility, survey: any): boolean {
    return canAccessRecord(user, {
      assignedTo: survey?.assignedTo,
      createdBy: survey?.createdBy,
      tenantId: survey?.tenantId,
    });
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }

  // Generate unique survey ID
  private generateSurveyId(): string {
    const prefix = 'SVY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Create new site survey (from lead stage change)
  async create(createDto: CreateSiteSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating surveys');
    }

    // Get current user ID for createdBy
    const createdById = user?._id || (user?.id ? new Types.ObjectId(user.id) : undefined);

    const surveyData = {
      ...createDto,
      surveyId: this.generateSurveyId(),
      status: SurveyStatus.PENDING,
      tenantId: tid,
      createdBy: createdById,
      assignedTo: createDto.assignedTo || undefined, // Can be set during creation
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdSurvey = new this.surveyModel(surveyData);
    return createdSurvey.save();
  }

  // Find all surveys with filters - populates fresh lead data
  async findAll(
    query: QuerySiteSurveyDto,
    tenantId?: string,
    user?: UserWithVisibility,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      status,
      city,
      engineer,
      search,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build complete filter with tenant isolation
    const filter = this.buildCompleteFilter(tenantId, user, {});

    if (status) {
      filter.status = status;
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (engineer) {
      filter.engineer = { $regex: engineer, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { surveyId: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [surveys, total] = await Promise.all([
      this.surveyModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.surveyModel.countDocuments(filter).exec()
    ]);

    // Enrich with fresh lead data
    const enrichedData = await Promise.all(
      surveys.map(async (survey) => {
        const surveyObj = survey.toObject();
        try {
          console.log(`[DEBUG] Processing survey ${survey.surveyId}, leadId: ${survey.leadId}`);
          
          if (!survey.leadId) {
            console.log(`[DEBUG] Survey ${survey.surveyId} has no leadId!`);
            return surveyObj;
          }
          
          const lead = await this.leadsService.findOneById(survey.leadId, tenantId, user);
          
          console.log(`[DEBUG] Lead lookup result for ${survey.leadId}:`, lead ? 'FOUND' : 'NOT FOUND');
          
          if (lead) {
            console.log(`[DEBUG] Lead data: kw=${lead.kw}, city=${lead.city}, assignedTo=${lead.assignedTo}`);
            
            // Override with fresh lead data if available
            if (lead.kw && lead.kw > 0) {
              surveyObj.projectCapacity = `${lead.kw} kW`;
              console.log(`[DEBUG] Updated capacity to: ${surveyObj.projectCapacity}`);
            }
            if (lead.city) {
              surveyObj.city = lead.city;
            }
            if (lead.assignedTo) {
              const engineerName = typeof lead.assignedTo === 'object' && lead.assignedTo !== null
                ? (lead.assignedTo as any).name || String(lead.assignedTo)
                : String(lead.assignedTo);
              surveyObj.engineer = engineerName;
              surveyObj.solarConsultant = engineerName;
            }
            // Add lead source data dynamically
            (surveyObj as any).leadSource = lead.source;
            (surveyObj as any).leadPhone = lead.phone;
            (surveyObj as any).leadEmail = lead.email;
          } else {
            console.log(`[DEBUG] Lead NOT found for survey ${survey.surveyId}, leadId: ${survey.leadId}`);
          }
        } catch (error) {
          console.log(`[DEBUG] Error fetching lead for survey ${survey.surveyId}:`, error);
        }
        return surveyObj;
      })
    );

    return {
      data: enrichedData,
      total,
      page,
      limit
    };
  }

  // Find one survey by ID
  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const survey = await this.surveyModel.findOne(filter).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  // Find survey by lead ID
  async findByLeadId(leadId: string, tenantId?: string, user?: UserWithVisibility): Promise<Survey | null> {
    const filter = this.buildCompleteFilter(tenantId, user, { leadId });
    return this.surveyModel.findOne(filter).exec();
  }

  // Update survey
  async update(id: string, updateDto: UpdateSiteSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const survey = await this.surveyModel.findOneAndUpdate(
      filter,
      { ...updateDto, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  // Move survey from Pending to Active
  async moveToActive(id: string, moveDto: MoveToActiveDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    if (survey.status !== SurveyStatus.PENDING) {
      throw new Error(`Cannot move to Active: Survey is currently ${survey.status}`);
    }

    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      {
        status: SurveyStatus.ACTIVE,
        engineer: moveDto.engineer || survey.engineer,
        solarConsultant: moveDto.solarConsultant || survey.solarConsultant,
        activeData: {
          ...moveDto.activeData,
          startedAt: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return updatedSurvey;
  }

  // Move survey from Active to Complete
  async moveToComplete(id: string, moveDto: MoveToCompleteDto, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    if (survey.status !== SurveyStatus.ACTIVE) {
      throw new Error(`Cannot move to Complete: Survey is currently ${survey.status}`);
    }

    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      {
        status: SurveyStatus.COMPLETE,
        completeData: {
          ...moveDto.completeData,
          completionDate: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return updatedSurvey;
  }

  // Delete survey
  async remove(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const result = await this.surveyModel.deleteOne(filter).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
  }

  // Get statistics
  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<{
    total: number;
    pending: number;
    active: number;
    complete: number;
    byCity: { city: string; count: number }[];
    byMonth: { month: string; count: number }[];
  }> {
    // Build tenant filter
    const tenantFilter = this.buildCompleteFilter(tenantId, user, {});

    const [total, pending, active, complete, byCity, byMonth] = await Promise.all([
      this.surveyModel.countDocuments(tenantFilter).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.PENDING }).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.ACTIVE }).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.COMPLETE }).exec(),
      this.surveyModel.aggregate([
        { $match: tenantFilter },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $project: { city: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]).exec(),
      this.surveyModel.aggregate([
        { $match: tenantFilter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $toString: '$_id.month' }
              ]
            },
            count: 1,
            _id: 0
          }
        },
        { $sort: { month: -1 } }
      ]).exec()
    ]);

    return {
      total,
      pending,
      active,
      complete,
      byCity,
      byMonth
    };
  }

  // Auto-create survey when lead stage changes to 'Site Survey'
  async createFromLead(
    leadData: {
      leadId: string;
      clientName: string;
      city: string;
      projectCapacity?: string;
      engineer?: string;
      sourceLeadId?: string;
    },
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<Survey> {
    // Check if survey already exists for this lead (respect tenant isolation)
    const existingSurvey = await this.findByLeadId(leadData.leadId, tenantId, user);
    if (existingSurvey) {
      return existingSurvey;
    }

    return this.create({
      leadId: leadData.leadId,
      clientName: leadData.clientName,
      city: leadData.city || 'Unknown',
      projectCapacity: leadData.projectCapacity || 'To be determined',
      roofType: 'To be surveyed',
      structureType: 'To be surveyed',
      structureHeight: 'To be measured',
      moduleType: 'To be selected',
      solarConsultant: leadData.engineer || 'Unassigned',
      engineer: leadData.engineer || 'Unassigned',
      floors: 1
    }, tenantId, user);
  }

  // Assign survey to a user
  async assign(
    id: string,
    assignDto: AssignSurveyDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<Survey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    // Check if user can assign this survey (must be admin, manager, or creator)
    if (!this.canAssignSurvey(user, survey)) {
      throw new BadRequestException('You do not have permission to assign this survey');
    }

    // Validate the assignedTo user ID
    const assignedToId = assignDto.assignedTo && Types.ObjectId.isValid(assignDto.assignedTo)
      ? new Types.ObjectId(assignDto.assignedTo)
      : undefined;

    if (!assignedToId) {
      throw new BadRequestException('Invalid assignedTo user ID');
    }

    // Get current user ID for assignedBy
    const assignedById = user?._id || (user?.id ? new Types.ObjectId(user.id) : undefined);

    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      {
        assignedTo: assignedToId,
        assignedBy: assignedById,
        // Also update the engineer field to match assignment
        engineer: assignDto.assignedTo,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    this.logger.log(`Survey ${id} assigned to user ${assignDto.assignedTo} by ${assignedById}`);

    return updatedSurvey;
  }

  // Check if user can assign a survey
  private canAssignSurvey(user: UserWithVisibility | undefined, survey: any): boolean {
    if (!user) return false;

    // SuperAdmin and Admin can assign any survey
    if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'admin') {
      return true;
    }

    // Manager can assign surveys in their team scope
    if (user.role?.toLowerCase() === 'manager' && user.dataScope === 'ALL') {
      return true;
    }

    // Creator can assign their own surveys
    const userId = user._id?.toString() || user.id;
    const surveyCreatedBy = survey.createdBy?.toString();
    if (userId && surveyCreatedBy === userId) {
      return true;
    }

    return false;
  }
}
