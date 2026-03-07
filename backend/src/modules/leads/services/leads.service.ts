import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto } from '../dto/lead.dto';
import { LeadStatus, LeadStatusDocument } from '../../settings/schemas/lead-status.schema';
import * as fs from 'fs';
import csvParser from 'csv-parser';
import * as xlsx from 'xlsx';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(LeadStatus.name) private leadStatusModel: Model<LeadStatusDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  private async assertValidStatusKey(statusKey: string | undefined, tenantId?: string): Promise<void> {
    if (!statusKey || statusKey === '') return;
    const tid = this.toObjectId(tenantId);

    const status = await this.leadStatusModel
      .findOne({ tenantId: tid, entity: 'lead', key: statusKey, isActive: true })
      .lean()
      .exec();

    if (!status) {
      throw new BadRequestException(`Invalid lead statusKey '${statusKey}'`);
    }
  }

  // ============================================
  // LEAD SCORING ALGORITHM (matches frontend)
  // ============================================
  calculateScore(lead: Partial<Lead> & { [key: string]: any }): number {
    let score = 0;

    // Budget scoring based on value
    const value = (lead as any).value || 0;
    if (value >= 500000) score += 25;
    else if (value >= 200000) score += 15;
    else score += 5;

    // Timeline scoring based on created date
    const createdAt = lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now();
    const daysSinceCreated = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += 20;
    else if (daysSinceCreated <= 30) score += 10;
    else score += 5;

    // Source scoring
    if (lead.source === 'Referral') score += 15;
    else if (lead.source === 'Partner') score += 12;
    else if (lead.source === 'Website') score += 8;

    // Engagement scoring based on activities
    if (lead.activities && lead.activities.length > 0) {
      const recentActivities = lead.activities.filter((a: any) => {
        const activityDate = new Date(a.timestamp || Date.now()).getTime();
        const daysSince = Math.floor((Date.now() - activityDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      });
      score += Math.min(recentActivities.length * 5, 20);
    }

    return Math.min(score, 100);
  }

  // ============================================
  // SLA BREACH DETECTION
  // ============================================
  checkSlaBreached(lead: Partial<Lead> & { [key: string]: any }): boolean {
    const activities = (lead as any).activities || [];
    const createdAt = (lead as any).createdAt;
    
    if (activities.length === 0) {
      const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
      const daysSinceCreated = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      return daysSinceCreated > 3;
    }
    const lastActivity = activities[activities.length - 1];
    const activityTime = lastActivity?.timestamp ? new Date(lastActivity.timestamp).getTime() : Date.now();
    const daysSinceActivity = Math.floor((Date.now() - activityTime) / (1000 * 60 * 60 * 24));
    return daysSinceActivity > 3;
  }

  // ============================================
  // AUTOMATION RULES
  // ============================================
  applyAutomation(lead: Partial<Lead>): { ruleId: number; name: string; triggeredAt: Date }[] {
    const automationRules = [
      { id: 1, name: 'High Value Alert', condition: 'value > 500000' },
      { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3' },
      { id: 3, name: 'Score Boost', condition: 'source == referral' },
    ];

    const activeAutomation: { ruleId: number; name: string; triggeredAt: Date }[] = [];

    automationRules.forEach((rule: any) => {
      let conditionMet = false;

      if (rule.condition.includes('value >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = (lead.value || 0) > threshold;
      } else if (rule.condition.includes('days_inactive >')) {
        conditionMet = this.checkSlaBreached(lead);
      } else if (rule.condition.includes('source ==')) {
        const source = rule.condition.split(' == ')[1].replace(/'/g, '');
        conditionMet = lead.source === source;
      }

      if (conditionMet) {
        activeAutomation.push({
          ruleId: rule.id,
          name: rule.name,
          triggeredAt: new Date(),
        });
      }
    });

    return activeAutomation;
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(createLeadDto: CreateLeadDto, tenantId?: string): Promise<Lead> {
    const now = new Date();
    const leadId = `LEAD-${Date.now()}`;

    await this.assertValidStatusKey(createLeadDto.statusKey, tenantId);
    
    const activities = [{
      type: 'created',
      ts: this.formatTimestamp(now),
      note: 'Lead created',
      by: 'System',
      timestamp: now,
    }];

    const leadData: any = {
      ...createLeadDto,
      leadId,
      statusKey: createLeadDto.statusKey || 'new',
      activities,
      created: now,
      lastContact: now,
    };

    // Calculate initial score and SLA
    leadData.score = this.calculateScore(leadData);
    leadData.slaBreached = this.checkSlaBreached(leadData);
    leadData.activeAutomation = this.applyAutomation(leadData);

    if (tenantId) {
      leadData.tenantId = new Types.ObjectId(tenantId);
    }

    const createdLead = new this.leadModel(leadData);
    return createdLead.save();
  }

  async findAll(query: QueryLeadDto, tenantId?: string): Promise<{ data: Lead[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy,
      sortOrder = 'desc',
      search,
      source,
      statusKey,
      city,
      minScore,
      maxScore,
      minValue,
      maxValue,
      quickFilter,
      startDate,
      endDate,
    } = query;

    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    // Quick filters
    if (quickFilter) {
      switch (quickFilter) {
        case 'highScore':
          filter.score = { $gt: 75 };
          break;
        case 'slaBreached':
          filter.slaBreached = true;
          break;
        case 'highValue':
          filter.value = { $gt: 500000 };
          break;
        case 'referral':
          filter.source = 'Referral';
          break;
        case 'automation':
          filter['activeAutomation.0'] = { $exists: true };
          break;
        case 'recent':
          filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
      }
    }

    if (source) filter.source = source;
    if (statusKey) filter.statusKey = statusKey;
    if (city) filter.city = { $regex: city, $options: 'i' };

    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = {};
      if (minScore !== undefined) filter.score.$gte = minScore;
      if (maxScore !== undefined) filter.score.$lte = maxScore;
    }

    if (minValue !== undefined || maxValue !== undefined) {
      filter.value = {};
      if (minValue !== undefined) filter.value.$gte = minValue;
      if (maxValue !== undefined) filter.value.$lte = maxValue;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchNum = Number(search);
      const isNumeric = !isNaN(searchNum) && search.trim() !== '';
      
      // Build search conditions
      const orConditions: any[] = [];
      
      // Text fields - always search with regex
      orConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { statusKey: { $regex: search, $options: 'i' } }
      );
      
      // For numeric search, also match score and value
      if (isNumeric) {
        // Exact score match
        orConditions.push({ score: searchNum });
        // Value search - match if value divided by 1000/100000 contains the number
        // This handles both 50K (50000) and 1.5L (150000) formats
        orConditions.push({ value: { $gte: searchNum * 1000, $lt: (searchNum + 1) * 1000 } }); // For thousands (K)
        orConditions.push({ value: { $gte: searchNum * 100000, $lt: (searchNum + 1) * 100000 } }); // For lakhs (L)
        orConditions.push({ value: { $gte: searchNum, $lt: searchNum + 1 } }); // For exact match
      }
      
      filter.$or = orConditions;
    }

    const sort: any = {};
    const sortField = sortBy || 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId?: string): Promise<Lead> {
    const filter: any = { 
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const lead = await this.leadModel.findOne(filter).lean().exec();
    
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    
    return lead as Lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId?: string): Promise<Lead> {
    const filter: any = { 
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    // Check if lead exists first
    const existingLead = await this.leadModel.findOne(filter).lean().exec();
    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    // Build update data - exclude undefined values
    const updateData: any = {};
    const allowedFields = [
      'name', 'company', 'email', 'phone', 'source', 'statusKey', 'city', 'state',
      'value', 'kw', 'roofArea', 'monthlyBill', 'roofType', 'budget', 'category',
      'tags', 'notes', 'assignedTo', 'score', 'archived', 'nextFollowUp', 'slaHours'
    ];
    
    const dtoAny = updateLeadDto as any;
    for (const field of allowedFields) {
      if (dtoAny[field] !== undefined) {
        updateData[field] = dtoAny[field];
      }
    }

    // Only validate statusKey if it's being updated
    if (updateData.statusKey !== undefined) {
      await this.assertValidStatusKey(updateData.statusKey, tenantId);
    }

    // Handle stage change activity
    if (updateData.statusKey && updateData.statusKey !== existingLead.statusKey) {
      const now = new Date();
      const activity = {
        type: 'stage_change',
        ts: this.formatTimestamp(now),
        note: `Stage changed from ${existingLead.statusKey} to ${updateData.statusKey}`,
        by: 'System',
        timestamp: now,
      };
      
      // Push new activity to existing array
      updateData.$push = { activities: activity };
    }

    Object.assign(existingLead, updateLeadDto);
    existingLead.lastContact = new Date();
    // Only recalculate score if not manually provided
    if (updateLeadDto.score === undefined) {
      existingLead.score = this.calculateScore(existingLead);
    }
    existingLead.slaBreached = this.checkSlaBreached(existingLead);
    existingLead.activeAutomation = this.applyAutomation(existingLead);

    // Use atomic update
    const updatedLead = await this.leadModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after update');
    }

    return updatedLead;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const filter: any = { 
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException('Lead not found');
    }
  }

  async duplicate(id: string, tenantId?: string): Promise<Lead> {
    const originalLead = await this.findOne(id, tenantId);

    const duplicatedData: CreateLeadDto = {
      name: `${originalLead.name} (Copy)`,
      company: originalLead.company,
      email: originalLead.email ? `${originalLead.email}.copy${Date.now()}` : undefined,
      phone: originalLead.phone,
      city: originalLead.city,
      state: originalLead.state,
      source: originalLead.source,
      statusKey: 'new',
      value: originalLead.value,
      kw: originalLead.kw ? parseFloat(originalLead.kw as any) : 0,
      roofArea: originalLead.roofArea,
      monthlyBill: originalLead.monthlyBill,
      tags: originalLead.tags ? [...originalLead.tags] : [],
      notes: `Duplicated from ${originalLead.name}. ${originalLead.notes || ''}`,
    };

    return this.create(duplicatedData, tenantId);
  }

  async addActivity(id: string, activityDto: AddActivityDto, tenantId?: string): Promise<Lead> {
    const filter: any = { 
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const lead = await this.leadModel.findOne(filter).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const now = new Date();
    const activity = {
      type: activityDto.type,
      ts: this.formatTimestamp(now),
      note: activityDto.note,
      by: activityDto.by || 'System',
      timestamp: now,
    };
    
    // Ensure activities array exists
    if (!lead.activities) {
      lead.activities = [];
    }
    lead.activities.push(activity as any);

    lead.lastContact = now;
    lead.slaBreached = this.checkSlaBreached(lead);
    lead.score = this.calculateScore(lead);

    return lead.save();
  }

  async getTimeline(id: string, tenantId?: string): Promise<any[]> {
    const lead = await this.findOne(id, tenantId);
    return lead.activities.sort((a: any, b: any) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  async bulkArchive(ids: string[], tenantId?: string): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter: any = { 
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { archived: true, archivedAt: new Date() } },
    );
    return { modified: result.modifiedCount };
  }

  async bulkDelete(ids: string[], tenantId?: string): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter: any = { 
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ]
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return { modified: result.modifiedCount };
  }

  async bulkUpdateStage(ids: string[], stage: string, tenantId?: string): Promise<{ modified: number }> {
    await this.assertValidStatusKey(stage, tenantId);
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter: any = { 
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { statusKey: stage, lastContact: new Date() } },
    );
    return { modified: result.modifiedCount };
  }

  async getStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const [
      totalLeads,
      archivedLeads,
      slaBreachedCount,
      highScoreCount,
      totalPipelineValue,
      stageCounts,
      sourceCounts,
    ] = await Promise.all([
      this.leadModel.countDocuments(filter),
      this.leadModel.countDocuments({ ...filter, archived: true }),
      this.leadModel.countDocuments({ ...filter, slaBreached: true }),
      this.leadModel.countDocuments({ ...filter, score: { $gt: 75 } }),
      this.leadModel.aggregate([
        { $match: { ...filter, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalLeads,
      archivedLeads,
      slaBreachedCount,
      highScoreCount,
      totalPipelineValue: totalPipelineValue[0]?.total || 0,
      stageDistribution: stageCounts.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
      sourceDistribution: sourceCounts.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }

  async getStatusOptions(tenantId?: string): Promise<{ data: Array<{ key: string; label: string; color: string; order: number; type: string }> }> {
    const tid = this.toObjectId(tenantId);

    const statuses = await this.leadStatusModel
      .find({ tenantId: tid, entity: 'lead', isActive: true })
      .sort({ order: 1 })
      .lean()
      .exec();

    return {
      data: statuses.map(s => ({
        key: (s as any).key,
        label: (s as any).label,
        color: (s as any).color,
        order: (s as any).order,
        type: (s as any).type,
      })),
    };
  }

  async recalculateAllScores(tenantId?: string): Promise<{ updated: number }> {
    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const leads = await this.leadModel.find(filter).exec();
    let updated = 0;

    for (const lead of leads) {
      const newScore = this.calculateScore(lead);
      const newSla = this.checkSlaBreached(lead);
      const newAutomation = this.applyAutomation(lead);

      if (lead.score !== newScore || lead.slaBreached !== newSla) {
        lead.score = newScore;
        lead.slaBreached = newSla;
        lead.activeAutomation = newAutomation;
        await lead.save();
        updated++;
      }
    }

    return { updated };
  }

  // ============================================
  // LEAD TRACKER / STATUS PROGRESS
  // ============================================

  async getTracker(id: string, tenantId?: string): Promise<{ stages: any[]; currentStage: string; progress: number }> {
    const lead = await this.findOne(id, tenantId);
    
    // Get all available status options ordered
    const tid = this.toObjectId(tenantId);
    const statusOptions = await this.leadStatusModel
      .find({ tenantId: tid, entity: 'lead', isActive: true })
      .sort({ order: 1 })
      .lean()
      .exec();

    // If no status options configured, use default pipeline
    const defaultStages = [
      { key: 'new', label: 'New', color: '#64748b', order: 0, type: 'start' },
      { key: 'contacted', label: 'Contacted', color: '#3b82f6', order: 1, type: 'normal' },
      { key: 'qualified', label: 'Qualified', color: '#8b5cf6', order: 2, type: 'normal' },
      { key: 'site_survey', label: 'Site Survey', color: '#f59e0b', order: 3, type: 'normal' },
      { key: 'proposal_sent', label: 'Proposal Sent', color: '#06b6d4', order: 4, type: 'normal' },
      { key: 'negotiation', label: 'Negotiation', color: '#ec4899', order: 5, type: 'normal' },
      { key: 'won', label: 'Won', color: '#22c55e', order: 6, type: 'success' },
      { key: 'lost', label: 'Lost', color: '#ef4444', order: 7, type: 'failure' },
    ];

    const allStages = statusOptions.length > 0 ? statusOptions.map(s => ({
      key: (s as any).key,
      label: (s as any).label,
      color: (s as any).color,
      order: (s as any).order,
      type: (s as any).type || 'normal',
    })) : defaultStages;

    // Get lead's progress from leadStages array
    const leadStages = lead.leadStages || [];
    
    // Build tracker stages with completion status
    const trackerStages = allStages.map((stage, index) => {
      const leadStage = leadStages.find(ls => ls.stage === stage.key);
      const isCompleted = leadStage?.completed || false;
      const isCurrent = lead.statusKey === stage.key;
      
      // Determine if this stage should be marked as completed
      // All stages before current stage are considered completed
      const currentStageIndex = allStages.findIndex(s => s.key === lead.statusKey);
      const shouldBeCompleted = index < currentStageIndex || isCompleted || isCurrent;
      
      return {
        stage: stage.key,
        label: stage.label,
        color: stage.color,
        order: stage.order,
        type: stage.type,
        completed: shouldBeCompleted,
        completedAt: leadStage?.completedAt || (shouldBeCompleted && !isCurrent ? new Date() : null),
        isCurrent,
      };
    });

    // Calculate progress
    const completedCount = trackerStages.filter(s => s.completed).length;
    const currentStageIndex = trackerStages.findIndex(s => s.isCurrent);
    const progress = allStages.length > 0 
      ? Math.round(((currentStageIndex + 1) / allStages.length) * 100)
      : 0;

    return {
      stages: trackerStages,
      currentStage: lead.statusKey,
      progress: Math.min(progress, 100),
    };
  }

  async updateStage(id: string, stage: string, user: string = 'System', tenantId?: string): Promise<{ lead: Lead; tracker: any }> {
    // Validate stage
    await this.assertValidStatusKey(stage, tenantId);
    
    const lead = await this.findOne(id, tenantId);
    const oldStage = lead.statusKey;
    
    if (oldStage === stage) {
      throw new BadRequestException(`Lead is already in stage '${stage}'`);
    }

    const now = new Date();
    
    // Build update data
    const updateData: any = {
      statusKey: stage,
      lastContact: now,
    };

    // Add stage change activity
    const activity = {
      type: 'stage_change',
      ts: this.formatTimestamp(now),
      note: `Stage changed from ${oldStage} to ${stage}`,
      by: user,
      timestamp: now,
    };
    updateData.$push = { activities: activity };

    // Update leadStages - mark new stage as completed
    const existingStageIndex = lead.leadStages?.findIndex(ls => ls.stage === stage);
    if (existingStageIndex >= 0) {
      // Update existing stage
      updateData.$set = {
        [`leadStages.${existingStageIndex}.completed`]: true,
        [`leadStages.${existingStageIndex}.completedAt`]: now,
      };
    } else {
      // Add new stage entry
      updateData.$push.leadStages = {
        stage,
        completed: true,
        completedAt: now,
        createdAt: now,
      };
    }

    // Also mark old stage as completed if not already
    const oldStageIndex = lead.leadStages?.findIndex(ls => ls.stage === oldStage);
    if (oldStageIndex >= 0 && !lead.leadStages[oldStageIndex].completed) {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set[`leadStages.${oldStageIndex}.completed`] = true;
      updateData.$set[`leadStages.${oldStageIndex}.completedAt`] = now;
    }

    // Recalculate score and SLA
    const mergedData = { ...lead, ...updateData, statusKey: stage };
    updateData.score = this.calculateScore(mergedData);
    updateData.slaBreached = this.checkSlaBreached(mergedData);
    updateData.activeAutomation = this.applyAutomation(mergedData);

    // Update lead
    const filter: any = { 
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const updatedLead = await this.leadModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after update');
    }

    // Get updated tracker
    const tracker = await this.getTracker(id, tenantId);

    return { lead: updatedLead, tracker };
  }

  private formatTimestamp(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  }

  // ============================================
  // LEAD IMPORT SYSTEM
  // ============================================

  async importLeads(
    filePath: string,
    fileExtension: string,
    tenantId?: string
  ): Promise<{ success: boolean; inserted: number; updated: number; failed: number; errors: Array<{ row: number; reason: string }> }> {
    const result = {
      success: true,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ row: number; reason: string }>,
    };

    try {
      // Parse file based on extension
      let rows = await this.parseFile(filePath, fileExtension);
      
      // Debug logging: Log initial row count
      Logger.log(`[IMPORT] Initial rows parsed: ${rows.length}`, 'LeadsService');
      
      // Filter out empty rows and rows with only formatting artifacts
      rows = this.filterValidRows(rows);
      
      // Debug logging: Log filtered row count
      Logger.log(`[IMPORT] Valid rows after filtering: ${rows.length}`, 'LeadsService');

      // Known schema fields
      const knownFields = [
        'name', 'company', 'email', 'phone', 'source', 'statusKey', 'city', 'state',
        'value', 'kw', 'roofArea', 'monthlyBill', 'roofType', 'budget', 'category',
        'tags', 'notes', 'assignedTo', 'score', 'archived', 'nextFollowUp', 'slaHours',
        'firstName', 'lastName', 'stage', 'status'
      ];

      // Process rows in batches of 500
      const batchSize = 500;
      const bulkOps: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;

        try {
          // Validate required field
          if (!row.name && !row.firstName && !row.lastName) {
            result.errors.push({ row: rowNumber, reason: 'Missing name' });
            result.failed++;
            continue;
          }

          // Normalize row data
          const normalizedData = this.normalizeRowData(row, knownFields);

          // Check for duplicate by email or phone
          const duplicate = await this.findDuplicate(
            normalizedData.email,
            normalizedData.phone,
            tenantId
          );

          if (duplicate) {
            // Update existing lead
            const updateData = this.buildUpdateData(normalizedData);
            updateData.lastContact = new Date();
            
            // Handle activity logs if present
            if (normalizedData.activityLogs && normalizedData.activityLogs.length > 0) {
              const activities = normalizedData.activityLogs.map((log: string) => ({
                type: 'import',
                ts: this.formatTimestamp(new Date()),
                note: log,
                by: 'System',
                timestamp: new Date(),
              }));
              updateData.$push = { activities: { $each: activities } };
            }

            bulkOps.push({
              updateOne: {
                filter: { _id: duplicate._id },
                update: { $set: updateData },
              },
            });
            result.updated++;
          } else {
            // Create new lead
            const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date();

            const leadData: any = {
              leadId,
              ...normalizedData,
              created: now,
              lastContact: now,
              statusKey: normalizedData.statusKey || 'new',
              activities: [],
            };

            // Add import activity
            leadData.activities.push({
              type: 'created',
              ts: this.formatTimestamp(now),
              note: 'Lead imported',
              by: 'System',
              timestamp: now,
            });

            // Add activity logs if present
            if (normalizedData.activityLogs && normalizedData.activityLogs.length > 0) {
              normalizedData.activityLogs.forEach((log: string) => {
                leadData.activities.push({
                  type: 'import',
                  ts: this.formatTimestamp(now),
                  note: log,
                  by: 'System',
                  timestamp: now,
                });
              });
            }

            // Calculate score and SLA
            leadData.score = this.calculateScore(leadData);
            leadData.slaBreached = this.checkSlaBreached(leadData);
            leadData.activeAutomation = this.applyAutomation(leadData);

            if (tenantId) {
              leadData.tenantId = new Types.ObjectId(tenantId);
            }

            bulkOps.push({
              insertOne: { document: leadData },
            });
            result.inserted++;
          }

          // Execute batch when size reached
          if (bulkOps.length >= batchSize || i === rows.length - 1) {
            if (bulkOps.length > 0) {
              await this.leadModel.bulkWrite(bulkOps);
              bulkOps.length = 0; // Clear array
            }
          }
        } catch (error: any) {
          result.errors.push({ row: rowNumber, reason: error.message || 'Unknown error' });
          result.failed++;
        }
      }

      return result;
    } catch (error: any) {
      throw new BadRequestException(`Import failed: ${error.message}`);
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private async parseFile(filePath: string, fileExtension: string): Promise<any[]> {
    const ext = fileExtension.toLowerCase();

    if (ext === '.csv') {
      return this.parseCSV(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parseExcel(filePath);
    } else if (ext === '.json') {
      return this.parseJSON(filePath);
    } else {
      throw new BadRequestException('Unsupported file format. Use CSV, XLSX, or JSON.');
    }
  }

  private parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data: any) => rows.push(data))
        .on('end', () => resolve(rows))
        .on('error', (error: any) => reject(error));
    });
  }

  private parseExcel(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  }

  private parseJSON(filePath: string): any[] {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  private normalizeRowData(row: any, knownFields: string[]): any {
    const normalized: any = {
      customFields: {},
    };

    // Normalize header names
    const normalizedRow: any = {};
    Object.keys(row).forEach((key) => {
      const normalizedKey = this.normalizeHeader(key);
      normalizedRow[normalizedKey] = row[key];
    });

    // Process each field
    Object.keys(normalizedRow).forEach((key) => {
      const value = normalizedRow[key];
      if (value === undefined || value === null || value === '') return;

      // Map known fields
      if (key === 'firstname' || key === 'first_name') {
        normalized.firstName = String(value).trim();
      } else if (key === 'lastname' || key === 'last_name') {
        normalized.lastName = String(value).trim();
      } else if (key === 'stage' || key === 'status') {
        normalized.statusKey = String(value).toLowerCase().trim();
      } else if (key === 'score') {
        const numScore = Number(value);
        normalized.score = isNaN(numScore) ? 0 : Math.min(Math.max(numScore, 0), 100);
      } else if (key === 'value') {
        normalized.value = this.normalizeValue(value);
      } else if (key === 'activity_logs' || key === 'activities' || key === 'activitylogs') {
        const logs = String(value).split('|').map((s) => s.trim()).filter((s) => s);
        normalized.activityLogs = logs;
      } else if (knownFields.includes(key)) {
        normalized[key] = this.normalizeField(key, value);
      } else {
        // Store unknown fields in customFields
        normalized.customFields[key] = value;
      }
    });

    // Build full name from firstName + lastName
    if (normalized.firstName || normalized.lastName) {
      const first = normalized.firstName || '';
      const last = normalized.lastName || '';
      normalized.name = `${first} ${last}`.trim();
    } else if (normalizedRow.name) {
      normalized.name = String(normalizedRow.name).trim();
    }

    // Remove firstName/lastName from top level
    delete normalized.firstName;
    delete normalized.lastName;

    return normalized;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private normalizeValue(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const str = String(value).trim();

    // Remove ₹ symbol and commas
    let cleanStr = str.replace(/[₹,]/g, '');

    // Handle L (Lakhs)
    if (cleanStr.toLowerCase().includes('l')) {
      const num = parseFloat(cleanStr.replace(/l/i, ''));
      return isNaN(num) ? 0 : num * 100000;
    }

    // Handle Cr (Crores)
    if (cleanStr.toLowerCase().includes('cr')) {
      const num = parseFloat(cleanStr.replace(/cr/i, ''));
      return isNaN(num) ? 0 : num * 10000000;
    }

    // Handle K (Thousands)
    if (cleanStr.toLowerCase().includes('k')) {
      const num = parseFloat(cleanStr.replace(/k/i, ''));
      return isNaN(num) ? 0 : num * 1000;
    }

    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  private normalizeField(field: string, value: any): any {
    if (field === 'email') {
      return String(value).toLowerCase().trim();
    }
    if (field === 'score') {
      const num = Number(value);
      return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 100);
    }
    if (field === 'value' || field === 'kw' || field === 'roofArea' || field === 'monthlyBill' || field === 'budget') {
      return this.normalizeValue(value);
    }
    return value;
  }

  private async findDuplicate(email?: string, phone?: string, tenantId?: string): Promise<any> {
    if (!email && !phone) return null;

    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const orConditions: any[] = [];
    if (email) orConditions.push({ email: email.toLowerCase() });
    if (phone) orConditions.push({ phone });
    
    filter.$or = orConditions;

    return this.leadModel.findOne(filter).lean().exec();
  }

  private buildUpdateData(normalizedData: any): any {
    const updateFields: any = {};
    
    const allowedFields = [
      'name', 'company', 'email', 'phone', 'source', 'statusKey', 'city', 'state',
      'value', 'kw', 'roofArea', 'monthlyBill', 'roofType', 'budget', 'category',
      'tags', 'notes', 'assignedTo', 'score', 'archived', 'nextFollowUp', 'slaHours'
    ];

    allowedFields.forEach((field) => {
      if (normalizedData[field] !== undefined) {
        updateFields[field] = normalizedData[field];
      }
    });

    // Merge customFields if any
    if (Object.keys(normalizedData.customFields).length > 0) {
      updateFields.customFields = normalizedData.customFields;
    }

    return updateFields;
  }

  // ============================================
  // DASHBOARD ANALYTICS
  // ============================================

  async getDashboardOverview(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      newLeadsThisMonth,
      pipelineValue,
      wonLeads,
      totalValue
    ] = await Promise.all([
      this.leadModel.countDocuments(filter),
      this.leadModel.countDocuments({
        ...filter,
        createdAt: { $gte: startOfMonth }
      }),
      this.leadModel.aggregate([
        { $match: { ...filter, statusKey: { $nin: ['won', 'lost'] } } },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ]),
      this.leadModel.countDocuments({ ...filter, statusKey: 'won' }),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ])
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      newLeadsThisMonth,
      pipelineValue: pipelineValue[0]?.total || 0,
      conversionRate,
      totalValue: totalValue[0]?.total || 0
    };
  }

  async getFunnelData(tenantId?: string): Promise<any[]> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const funnelStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    
    const result = await this.leadModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$statusKey',
          count: { $sum: 1 },
          value: { $sum: '$value' }
        }
      }
    ]);

    const stageMap = new Map(result.map(r => [r._id, { count: r.count, value: r.value }]));

    return funnelStages.map(stage => ({
      stage,
      count: stageMap.get(stage)?.count || 0,
      value: stageMap.get(stage)?.value || 0
    }));
  }

  async getSourcePerformance(tenantId?: string): Promise<any[]> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$source',
          leads: { $sum: 1 },
          value: { $sum: '$value' }
        }
      },
      { $sort: { leads: -1 } }
    ]);

    return result.map(r => ({
      source: r._id || 'Unknown',
      leads: r.leads,
      value: r.value
    }));
  }

  async getLeadTrend(tenantId?: string, months: number = 6): Promise<any[]> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const result = await this.leadModel.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Fill in missing months
    const monthsData = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      
      const found = result.find(r => r._id.year === year && r._id.month === month);
      monthsData.push({
        month: monthName,
        year,
        count: found?.count || 0
      });
    }

    return monthsData;
  }

  async getValueTrend(tenantId?: string, months: number = 6): Promise<any[]> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const result = await this.leadModel.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          value: { $sum: '$value' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Fill in missing months
    const monthsData = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      
      const found = result.find(r => r._id.year === year && r._id.month === month);
      monthsData.push({
        month: monthName,
        year,
        value: found?.value || 0
      });
    }

    return monthsData;
  }

  async getScoreDistribution(tenantId?: string): Promise<any[]> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const result = await this.leadModel.aggregate([
      { $match: filter },
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 21, 41, 61, 81, 101],
          default: '0-20',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];

    return ranges.map(r => {
      const found = result.find(x => x._id === r.min);
      return {
        range: r.range,
        count: found?.count || 0
      };
    });
  }

  async getActivityStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalActivities,
      activitiesLast7Days,
      activitiesLast30Days
    ] = await Promise.all([
      this.leadModel.aggregate([
        { $match: filter },
        { $unwind: '$activities' },
        { $count: 'total' }
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $unwind: '$activities' },
        { $match: { 'activities.timestamp': { $gte: last7Days } } },
        { $count: 'total' }
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $unwind: '$activities' },
        { $match: { 'activities.timestamp': { $gte: last30Days } } },
        { $count: 'total' }
      ])
    ]);

    const activityTypes = await this.leadModel.aggregate([
      { $match: filter },
      { $unwind: '$activities' },
      {
        $group: {
          _id: '$activities.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return {
      totalActivities: totalActivities[0]?.total || 0,
      activitiesLast7Days: activitiesLast7Days[0]?.total || 0,
      activitiesLast30Days: activitiesLast30Days[0]?.total || 0,
      activityTypes: activityTypes.map(a => ({ type: a._id, count: a.count }))
    };
  }

  // ============================================
  // CSV/Excel ROW FILTERING
  // ============================================

  private filterValidRows(rows: any[]): any[] {
    return rows.filter(row => {
      // Check if row has any valid data
      const hasValidData = Object.values(row).some(value => {
        // Skip null, undefined, empty strings
        if (value === null || value === undefined || value === '') {
          return false;
        }
        
        // Trim and check for formatting artifacts
        const trimmedValue = String(value).trim();
        
        // Skip formatting artifacts
        if (trimmedValue === '' || 
            trimmedValue === '######' || 
            trimmedValue === 'NaN' ||
            trimmedValue === 'undefined' ||
            trimmedValue === 'null') {
          return false;
        }
        
        return true;
      });
      
      return hasValidData;
    });
  }
}
