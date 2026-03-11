import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Survey, SurveyDocument, SurveyStatus } from '../schemas/site-survey.schema';
import {
  CreateSiteSurveyDto,
  UpdateSiteSurveyDto,
  QuerySiteSurveyDto,
  MoveToActiveDto,
  MoveToCompleteDto
} from '../dto/site-survey.dto';
import { LeadsService } from '../../leads/services/leads.service';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class SiteSurveysService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
    @Inject(forwardRef(() => LeadsService))
    private leadsService: LeadsService
  ) {}

  // Generate unique survey ID
  private generateSurveyId(): string {
    const prefix = 'SVY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Create new site survey (from lead stage change)
  async create(createDto: CreateSiteSurveyDto): Promise<Survey> {
    const surveyData = {
      ...createDto,
      surveyId: this.generateSurveyId(),
      status: SurveyStatus.PENDING,
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

    // Build filter
    const filter: any = {};

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
  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveyModel.findOne({
      $or: [{ _id: id }, { surveyId: id }]
    }).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  // Find survey by lead ID
  async findByLeadId(leadId: string): Promise<Survey | null> {
    return this.surveyModel.findOne({ leadId }).exec();
  }

  // Update survey
  async update(id: string, updateDto: UpdateSiteSurveyDto): Promise<Survey> {
    const survey = await this.surveyModel.findOneAndUpdate(
      { $or: [{ _id: id }, { surveyId: id }] },
      { ...updateDto, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  // Move survey from Pending to Active
  async moveToActive(id: string, moveDto: MoveToActiveDto): Promise<Survey> {
    const survey = await this.findOne(id);

    if (survey.status !== SurveyStatus.PENDING) {
      throw new Error(`Cannot move to Active: Survey is currently ${survey.status}`);
    }

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      { $or: [{ _id: id }, { surveyId: id }] },
      {
        status: SurveyStatus.ACTIVE,
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
  async moveToComplete(id: string, moveDto: MoveToCompleteDto): Promise<Survey> {
    const survey = await this.findOne(id);

    if (survey.status !== SurveyStatus.ACTIVE) {
      throw new Error(`Cannot move to Complete: Survey is currently ${survey.status}`);
    }

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      { $or: [{ _id: id }, { surveyId: id }] },
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
  async remove(id: string): Promise<void> {
    const result = await this.surveyModel.deleteOne({
      $or: [{ _id: id }, { surveyId: id }]
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
  }

  // Get statistics
  async getStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    complete: number;
    byCity: { city: string; count: number }[];
    byMonth: { month: string; count: number }[];
  }> {
    const [total, pending, active, complete, byCity, byMonth] = await Promise.all([
      this.surveyModel.countDocuments().exec(),
      this.surveyModel.countDocuments({ status: SurveyStatus.PENDING }).exec(),
      this.surveyModel.countDocuments({ status: SurveyStatus.ACTIVE }).exec(),
      this.surveyModel.countDocuments({ status: SurveyStatus.COMPLETE }).exec(),
      this.surveyModel.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $project: { city: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]).exec(),
      this.surveyModel.aggregate([
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
  async createFromLead(leadData: {
    leadId: string;
    clientName: string;
    city: string;
    projectCapacity?: string;
    engineer?: string;
    sourceLeadId?: string;
  }): Promise<Survey> {
    // Check if survey already exists for this lead
    const existingSurvey = await this.findByLeadId(leadData.leadId);
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
    });
  }
}
