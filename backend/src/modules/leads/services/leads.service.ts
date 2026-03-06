import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto } from '../dto/lead.dto';
import { LeadStatus, LeadStatusDocument } from '../../settings/schemas/lead-status.schema';

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
    return `${month} ${day}, ${hours}:${minutes}`;
  }
}
