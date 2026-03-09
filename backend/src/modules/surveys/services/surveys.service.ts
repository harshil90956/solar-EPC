import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto, UpdateSurveyDto, QuerySurveyDto } from '../dto/survey.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
  ) {}

  // Generate unique survey ID
  private generateSurveyId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `S${timestamp}${random}`;
  }

  // Helper to convert string to ObjectId
  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }

  // Create new survey
  async create(createSurveyDto: CreateSurveyDto, tenantId?: string, userId?: string): Promise<Survey> {
    const surveyId = this.generateSurveyId();
    
    const surveyData: any = {
      ...createSurveyDto,
      surveyId,
      status: createSurveyDto.status || 'Scheduled',
    };

    // Add tenant isolation fields
    if (tenantId) {
      surveyData.tenantId = this.toObjectId(tenantId);
    }
    
    // Set createdBy if userId provided
    if (userId) {
      surveyData.createdBy = this.toObjectId(userId);
    }

    const newSurvey = new this.surveyModel(surveyData);
    return newSurvey.save();
  }

  // Get all surveys with filters and tenant/visibility isolation
  async findAll(
    query: QuerySurveyDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Survey[]; total: number }> {
    const { status, engineer, search, page = 1, limit = 100 } = query;
    
    const filter: any = { isDeleted: { $ne: true } };
    
    // Apply tenant filter (SUPER_ADMIN bypasses)
    if (tenantId && !user?.isSuperAdmin && user?.role?.toLowerCase() !== 'superadmin') {
      const tid = this.toObjectId(tenantId);
      if (tid) {
        filter.tenantId = tid;
      }
    }
    
    this.logger.debug(`[SURVEYS VISIBILITY] user: ${JSON.stringify(user)}`);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show surveys explicitly assigned to this user
        filter.assignedTo = objectId;
        this.logger.debug(`[SURVEYS VISIBILITY] Applied assignedTo filter: ${objectId}`);
      }
    } else {
      this.logger.debug(`[SURVEYS VISIBILITY] No filter applied - ALL scope or no user`);
    }
    
    // Apply query filters
    if (status) {
      filter.status = status;
    }
    
    if (engineer) {
      filter.engineer = engineer;
    }
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { surveyId: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    this.logger.debug(`[SURVEYS VISIBILITY] Final filter: ${JSON.stringify(filter)}`);
    
    const [data, total] = await Promise.all([
      this.surveyModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.surveyModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  // Get survey stats with tenant/visibility isolation
  async getStats(
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    pending: number;
    totalKw: number;
  }> {
    const filter: any = { isDeleted: { $ne: true } };
    
    // Apply tenant filter (SUPER_ADMIN bypasses)
    if (tenantId && !user?.isSuperAdmin && user?.role?.toLowerCase() !== 'superadmin') {
      const tid = this.toObjectId(tenantId);
      if (tid) {
        filter.tenantId = tid;
      }
    }

    this.logger.debug(`[SURVEYS STATS VISIBILITY] user param: ${JSON.stringify(user)}`);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only include surveys explicitly assigned to this user
        filter.assignedTo = objectId;
        this.logger.debug(`[SURVEYS STATS VISIBILITY] Applied assignedTo filter: ${objectId}`);
      }
    } else {
      this.logger.debug(`[SURVEYS STATS VISIBILITY] SKIPPING filter - dataScope is not ASSIGNED`);
    }
    
    this.logger.debug(`[SURVEYS STATS VISIBILITY] Match filter: ${JSON.stringify(filter)}`);

    const [
      total,
      scheduled,
      completed,
      pending,
      totalKwResult,
    ] = await Promise.all([
      this.surveyModel.countDocuments(filter),
      this.surveyModel.countDocuments({ ...filter, status: 'Scheduled' }),
      this.surveyModel.countDocuments({ ...filter, status: 'Completed' }),
      this.surveyModel.countDocuments({ ...filter, status: 'Pending' }),
      this.surveyModel.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$estimatedKw' } } },
      ]),
    ]);

    return {
      total,
      scheduled,
      completed,
      pending,
      totalKw: totalKwResult[0]?.total || 0,
    };
  }

  // Get single survey with tenant check
  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Survey> {
    const filter: any = {
      $or: [{ _id: id }, { surveyId: id }],
      isDeleted: { $ne: true },
    };
    
    // Apply tenant filter (SUPER_ADMIN bypasses)
    if (tenantId && !user?.isSuperAdmin && user?.role?.toLowerCase() !== 'superadmin') {
      const tid = this.toObjectId(tenantId);
      if (tid) {
        filter.tenantId = tid;
      }
    }
    
    const survey = await this.surveyModel.findOne(filter);
    
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
    
    // Visibility check for ASSIGNED scope
    if (user?.dataScope === 'ASSIGNED' && survey.assignedTo) {
      const userId = user._id?.toString() || user.id;
      const assignedToId = survey.assignedTo.toString();
      if (userId !== assignedToId) {
        throw new NotFoundException(`Survey with ID ${id} not found`);
      }
    }
    
    return survey;
  }

  // Update survey with tenant check
  async update(
    id: string, 
    updateSurveyDto: UpdateSurveyDto,
    tenantId?: string,
    userId?: string
  ): Promise<Survey> {
    try {
      this.logger.debug(`Updating survey: ${id} with data: ${JSON.stringify(updateSurveyDto)}`);
      
      const filter: any = {
        $or: [{ _id: id }, { surveyId: id }],
        isDeleted: { $ne: true },
      };
      
      // Apply tenant filter
      if (tenantId) {
        const tid = this.toObjectId(tenantId);
        if (tid) {
          filter.tenantId = tid;
        }
      }
      
      const updateData: any = { ...updateSurveyDto };
      
      const survey = await this.surveyModel.findOneAndUpdate(
        filter,
        { $set: updateData },
        { new: true },
      );
      
      if (!survey) {
        throw new NotFoundException(`Survey with ID ${id} not found`);
      }
      
      this.logger.debug(`Survey updated successfully: ${survey.surveyId}`);
      return survey;
    } catch (error) {
      this.logger.error('Error updating survey:', error);
      throw error;
    }
  }

  // Soft delete survey (mark as deleted)
  async remove(id: string, tenantId?: string, userId?: string): Promise<void> {
    const filter: any = {
      $or: [{ _id: id }, { surveyId: id }],
      isDeleted: { $ne: true },
    };
    
    // Apply tenant filter
    if (tenantId) {
      const tid = this.toObjectId(tenantId);
      if (tid) {
        filter.tenantId = tid;
      }
    }
    
    const result = await this.surveyModel.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    
    if (!result) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
  }

  // Assign survey to user
  async assignSurvey(
    id: string,
    assignedTo: string,
    tenantId?: string,
    userId?: string
  ): Promise<Survey> {
    const filter: any = {
      $or: [{ _id: id }, { surveyId: id }],
      isDeleted: { $ne: true },
    };
    
    // Apply tenant filter
    if (tenantId) {
      const tid = this.toObjectId(tenantId);
      if (tid) {
        filter.tenantId = tid;
      }
    }

    const assignedToId = this.toObjectId(assignedTo);
    if (!assignedToId) {
      throw new NotFoundException(`Invalid user ID: ${assignedTo}`);
    }

    const survey = await this.surveyModel.findOneAndUpdate(
      filter,
      { $set: { assignedTo: assignedToId } },
      { new: true }
    );

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    this.logger.log(`Survey ${id} assigned to user ${assignedTo} by ${userId}`);
    return survey;
  }
}
