import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto } from '../dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

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
      stage,
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
      filter.tenantId = new Types.ObjectId(tenantId);
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
    if (stage) filter.stage = stage;
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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
      ];
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
      filter.tenantId = new Types.ObjectId(tenantId);
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
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const existingLead = await this.leadModel.findOne(filter).exec();
    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    if (updateLeadDto.stage && updateLeadDto.stage !== existingLead.stage) {
      const now = new Date();
      existingLead.activities.push({
        type: 'stage_change',
        ts: this.formatTimestamp(now),
        note: `Stage changed from ${existingLead.stage} to ${updateLeadDto.stage}`,
        by: 'System',
        timestamp: now,
      });
    }

    Object.assign(existingLead, updateLeadDto);
    existingLead.lastContact = new Date();
    existingLead.score = this.calculateScore(existingLead);
    existingLead.slaBreached = this.checkSlaBreached(existingLead);
    existingLead.activeAutomation = this.applyAutomation(existingLead);

    return existingLead.save();
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
      filter.tenantId = new Types.ObjectId(tenantId);
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
      stage: 'new',
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
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const lead = await this.leadModel.findOne(filter).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const now = new Date();
    lead.activities.push({
      type: activityDto.type,
      ts: this.formatTimestamp(now),
      note: activityDto.note,
      by: activityDto.by || 'System',
      timestamp: now,
    });

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
      filter.tenantId = new Types.ObjectId(tenantId);
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
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return { modified: result.modifiedCount };
  }

  async bulkUpdateStage(ids: string[], stage: string, tenantId?: string): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter: any = { 
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true } 
    };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { stage, lastContact: new Date() } },
    );
    return { modified: result.modifiedCount };
  }

  async getStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
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
        { $group: { _id: '$stage', count: { $sum: 1 } } },
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

  async recalculateAllScores(tenantId?: string): Promise<{ updated: number }> {
    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
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

  private formatTimestamp(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
  }
}
