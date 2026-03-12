import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto } from '../dto/lead.dto';
import { LeadStatus, LeadStatusDocument } from '../../settings/schemas/lead-status.schema';
import { buildVisibilityFilter, applyVisibilityFilter, buildCompleteFilter, canAccessRecord, UserWithVisibility } from '../../../common/utils/visibility-filter';
import { User, UserDocument } from '../../../core/auth/schemas/user.schema';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

import { SiteSurveysService } from '../../survey/services/site-surveys.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(LeadStatus.name) private leadStatusModel: Model<LeadStatusDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @Inject(forwardRef(() => SiteSurveysService))
    private readonly siteSurveysService: SiteSurveysService,
  ) {}

  private readonly dashboardCache = new Map<string, { ts: number; data: any }>();
  private readonly dashboardCacheTtlMs = 30_000;

  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, baseFilter: any = {}): any {
    const filter = { ...baseFilter };

    // Enforce tenant isolation strictly
    const tid = this.toObjectId(tenantId);
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      // Match nothing when tenant context is missing
      return { $and: [filter, { _id: { $in: [] as any[] } }] };
    }

    if (tid) {
      filter.tenantId = tid;
    }

    // Apply role visibility rules
    if (user && !(user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin')) {
      const visibilityFilter = buildVisibilityFilter(user);
      if (visibilityFilter && Object.keys(visibilityFilter).length > 0) {
        return applyVisibilityFilter(filter, user);
      }
    }

    return filter;
  }

  // Check if user can access a specific lead
  private canAccessLead(user: UserWithVisibility, lead: any): boolean {
    return canAccessRecord(user, {
      assignedTo: lead?.assignedTo,
      createdBy: lead?.createdBy,
      tenantId: lead?.tenantId,
    });
  }

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

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private tenantMatch(tenantId: string | Types.ObjectId) {
    const tid = typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;
    return { tenantId: tid };
  }

  private notDeletedMatch() {
    return { isDeleted: false };
  }

  private async assertValidStatusKey(statusKey: string | undefined, tenantId?: string): Promise<void> {
    if (!statusKey || statusKey === '') return;

    const normalizedStatusKey = statusKey.toString().trim().toLowerCase();
    if (!normalizedStatusKey) return;
    
    // Allow common lead status keys without DB validation
    const commonStatusKeys = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'estimate'];
    if (commonStatusKeys.includes(normalizedStatusKey)) {
      return;
    }
    
    const tid = await this.resolveTenantObjectId(tenantId || '');

    const status = await this.leadStatusModel
      .findOne({ tenantId: tid, entity: 'lead', key: normalizedStatusKey, isActive: true })
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

  private async withDashboardCache<T>(tenantId: string | undefined, key: string, fn: () => Promise<T>): Promise<T> {
    const cacheKey = `${tenantId || 'default'}:${key}`;
    const now = Date.now();
    const cached = this.dashboardCache.get(cacheKey);
    
    if (cached && now - cached.ts <= this.dashboardCacheTtlMs) {
      Logger.log(`[DEBUG] Cache hit for ${cacheKey}`, 'LeadsService');
      return cached.data as T;
    }
    Logger.log(`[DEBUG] Cache miss for ${cacheKey}, fetching fresh data`, 'LeadsService');
    const data = await fn();
    this.dashboardCache.set(cacheKey, { ts: now, data });
    return data;
  }

  async create(createLeadDto: CreateLeadDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const now = new Date();
    const leadId = `LEAD-${Date.now()}`;

    const tid = await this.resolveTenantObjectId(tenantId || '');
    await this.assertValidStatusKey(createLeadDto.statusKey, tid.toString());
    
    const activities = [{
      type: 'created',
      ts: this.formatTimestamp(now),
      note: 'Lead created',
      by: user?.id || 'System',
      timestamp: now,
    }];

    const leadData: any = {
      ...createLeadDto,
      leadId,
      statusKey: createLeadDto.statusKey || 'new',
      activities,
      created: now,
      lastContact: now,
      tenantId: tid,
    };

    // Calculate initial score and SLA
    leadData.score = createLeadDto.score ?? this.calculateScore(leadData);
    leadData.slaBreached = this.checkSlaBreached(leadData);
    leadData.activeAutomation = this.applyAutomation(leadData);

    if (user?._id) {
      leadData.createdBy = new Types.ObjectId(user._id.toString());
    }

    const createdLead = new this.leadModel(leadData);
    return createdLead.save();
  }

  async findAll(
    query: QueryLeadDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Lead[]; total: number }> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
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

    // Build complete filter with tenant and visibility
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });

    // Apply quick filters
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
      filter.score = filter.score || {};
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
        orConditions.push({ score: searchNum });
        orConditions.push({ value: { $gte: searchNum * 1000, $lt: (searchNum + 1) * 1000 } });
        orConditions.push({ value: { $gte: searchNum * 100000, $lt: (searchNum + 1) * 100000 } });
        orConditions.push({ value: { $gte: searchNum, $lt: searchNum + 1 } });
      }
      
      // Combine search $or with existing filter using $and
      if (filter.$and) {
        filter.$and.push({ $or: orConditions });
      } else {
        filter.$and = [{ $or: orConditions }];
      }
    }

    const sort: any = {};
    const sortField = sortBy || 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    Logger.log(`[findAll] Final filter: ${JSON.stringify(filter)}`, 'LeadsService');

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

  // ============================================
  // CUSTOMERS
  // ============================================
  async getCustomers(
    query: QueryLeadDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Lead[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      city,
      source,
      startDate,
      endDate,
    } = query;

    // Build complete filter with tenant and visibility
    // Filter for customers only (status = "customer")
    const filter = this.buildCompleteFilter(tenantId, user, {
      status: 'customer',
      isDeleted: { $ne: true }
    });

    // Apply additional filters
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (source) filter.source = source;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchNum = Number(search);
      const isNumeric = !isNaN(searchNum) && search.trim() !== '';
      
      const orConditions: any[] = [];
      
      orConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      );

      if (isNumeric) {
        orConditions.push({ value: searchNum });
      }

      filter.$and = filter.$and || [];
      filter.$and.push({ $or: orConditions });
    }

    const sort: any = {};
    sort[sortBy || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .populate('assignedTo', 'firstName lastName email name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const lead = await this.leadModel.findOne(filter).lean().exec();
    
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    
    // Check if user can access this specific lead
    if (user) {
      const canAccess = canAccessRecord(user, lead);
      if (!canAccess) {
        throw new ForbiddenException('You do not have permission to access this lead');
      }
    }
    
    return lead as Lead;
  }

  // Find lead by ID without tenant restrictions (for internal use)
  async findOneById(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead | null> {
    const base: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    };

    const filter: any = tenantId || user ? this.buildCompleteFilter(tenantId, user, base) : base;
    const lead = await this.leadModel.findOne(filter).lean().exec();
    return lead as Lead | null;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });
    
    // Check if lead exists first
    const existingLead = await this.leadModel.findOne(filter).exec();
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
    // Accept legacy/required alias: { stage: "..." } maps to statusKey
    if (dtoAny.stage !== undefined && dtoAny.statusKey === undefined) {
      dtoAny.statusKey = dtoAny.stage;
    }
    // Normalize statusKey/stage values so API can send e.g. "CONTACTED" while DB stores "contacted"
    if (typeof dtoAny.statusKey === 'string') {
      dtoAny.statusKey = dtoAny.statusKey.trim().toLowerCase();
    }
    
    // Auto-sync: If stage/statusKey is set to "customer", also update status field
    if (dtoAny.statusKey && dtoAny.statusKey.toLowerCase() === 'customer') {
      updateData.status = 'customer';
    }
    
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
        by: user?.id || 'System',
        timestamp: now,
      };
      
      // Push new activity to existing array
      updateData.$push = { activities: activity };

      // Auto-create site survey when stage changes to 'site_survey' or 'survey'
      if (updateData.statusKey === 'site_survey' || updateData.statusKey === 'survey') {
        try {
          await this.siteSurveysService.createFromLead({
            leadId: existingLead._id.toString(),
            clientName: existingLead.name,
            city: existingLead.city || 'Unknown',
            projectCapacity: existingLead.kw ? `${existingLead.kw} kW` : 'To be determined',
            engineer: existingLead.assignedTo?.toString() || 'Unassigned',
          });
          Logger.log(`Auto-created site survey for lead ${existingLead.leadId}`, 'LeadsService');
        } catch (error: any) {
          Logger.error(`Failed to auto-create site survey for lead ${existingLead.leadId}: ${error.message}`, 'LeadsService');
        }
      }
    }

    Object.assign(existingLead, updateLeadDto);
    existingLead.lastContact = new Date();
    // Only recalculate score if not manually provided
    if (updateLeadDto.score === undefined) {
      existingLead.score = this.calculateScore(existingLead);
    }
    existingLead.slaBreached = this.checkSlaBreached(existingLead);
    existingLead.activeAutomation = this.applyAutomation(existingLead);

    // Use atomic update - only validate modified fields
    const updatedLead = await this.leadModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true, validateModifiedOnly: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after update');
    }

    return updatedLead;
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  async remove(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter: any = this.buildCompleteFilter(tid.toString(), user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
    });

    const result = await this.leadModel.findOneAndUpdate(
      filter,
      { isDeleted: true },
      { new: true }
    ).exec();

    if (!result) {
      throw new NotFoundException('Lead not found');
    }
  }

  async duplicate(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const existing = await this.findOne(id, tenantId, user);
    const leadData = (existing as any).toObject ? (existing as any).toObject() : { ...existing };
    
    delete leadData._id;
    delete leadData.id;
    leadData.leadId = `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    leadData.created = new Date();
    leadData.activities = [{
      type: 'created',
      ts: this.formatTimestamp(new Date()),
      note: `Duplicated from ${existing.leadId || id}`,
      by: user?.id || 'System',
      timestamp: new Date(),
    }];

    const newLead = new this.leadModel(leadData);
    return newLead.save();
  }

  async addActivity(id: string, dto: AddActivityDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const now = new Date();
    const activity = {
      ...dto,
      ts: this.formatTimestamp(now),
      timestamp: now,
      by: user?.id || 'System',
    };

    const updated = await this.leadModel.findOneAndUpdate(
      filter,
      { 
        $push: { activities: activity },
        $set: { lastContact: now }
      },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    return updated;
  }

  async getTimeline(id: string, tenantId?: string, user?: UserWithVisibility): Promise<any[]> {
    const lead = await this.findOne(id, tenantId, user);
    return lead.activities || [];
  }

  async getTracker(id: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const lead = await this.findOne(id, tenantId, user);
    return {
      leadId: lead.leadId,
      status: lead.statusKey,
      lastContact: lead.lastContact,
      score: lead.score,
      slaBreached: lead.slaBreached,
    };
  }

  async updateStage(id: string, stage: string, userId: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    return this.update(id, { statusKey: stage } as any, tenantId, user);
  }

  async bulkArchive(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tid.toString(), user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true }
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { archived: true } }
    );

    return { modified: result.modifiedCount };
  }

  async bulkDelete(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tid.toString(), user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { isDeleted: true } }
    );

    return { modified: result.modifiedCount };
  }

  async bulkUpdateStage(ids: string[], stage: string, tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tid.toString(), user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true }
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { statusKey: stage.toLowerCase() } }
    );

    return { modified: result.modifiedCount };
  }

  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });

    const [total, monthly, highValue, won, lost] = await Promise.all([
      this.leadModel.countDocuments(filter),
      this.leadModel.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
      this.leadModel.countDocuments({ ...filter, value: { $gte: 500000 } }),
      this.leadModel.countDocuments({ ...filter, statusKey: 'won' }),
      this.leadModel.countDocuments({ ...filter, statusKey: 'lost' }),
    ]);

    return {
      total,
      monthly,
      highValue,
      won,
      lost,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  }

  async getDashboardOverview(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    return this.getStats(tenantId, user);
  }

  async getDashboardFunnel(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });
    
    const stages = await this.leadStatusModel.find({ tenantId: tid, entity: 'lead' }).sort({ order: 1 }).lean();
    const counts = await Promise.all(stages.map(async (s) => ({
      stage: s.label,
      count: await this.leadModel.countDocuments({ ...filter, statusKey: s.key })
    })));

    return counts;
  }

  async getDashboardSource(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });
    
    return this.leadModel.aggregate([
      { $match: filter },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { source: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async getDashboardTrend(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.leadModel.aggregate([
      { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
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
  }

  async getDashboardActivity(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });
    
    const leads = await this.leadModel.find(filter).sort({ lastContact: -1 }).limit(10).lean();
    return leads.map(l => ({
      leadName: l.name,
      lastActivity: l.activities?.[l.activities.length - 1],
      lastContact: l.lastContact
    }));
  }

  async getStatusOptions(tenantId?: string): Promise<any[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    return this.leadStatusModel
      .find({ tenantId: tid, entity: 'lead', isActive: true })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  async recalculateAllScores(tenantId?: string, user?: UserWithVisibility): Promise<{ processed: number }> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const filter = this.buildCompleteFilter(tid.toString(), user, { isDeleted: false });
    
    const leads = await this.leadModel.find(filter).exec();
    let processed = 0;

    for (const lead of leads) {
      const score = this.calculateScore(lead.toObject());
      const slaBreached = this.checkSlaBreached(lead.toObject());
      const activeAutomation = this.applyAutomation(lead.toObject());

      await this.leadModel.updateOne(
        { _id: lead._id },
        { $set: { score, slaBreached, activeAutomation } }
      );
      processed++;
    }

    return { processed };
  }

  async importLeads(filePath: string, fileExtension: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    try {
      const rows = await this.parseFile(filePath, fileExtension);
      const validRows = this.filterValidRows(rows);
      const result = {
        total: validRows.length,
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: [] as any[],
      };

      const tid = await this.resolveTenantObjectId(tenantId || '');
      const knownFields = Object.keys(this.leadModel.schema.paths);
      const batchSize = 100;
      const bulkOps: any[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const rowNumber = i + 2;

        try {
          const normalizedData = this.normalizeRowData(row, knownFields);
          
          // Check for existing lead by email or phone
          const existing = await this.findDuplicate(normalizedData.email, normalizedData.phone, tid.toString());

          if (existing) {
            const updateData = this.buildUpdateData(normalizedData);
            bulkOps.push({
              updateOne: {
                filter: { _id: existing._id },
                update: { $set: updateData },
              },
            });
            result.updated++;
          } else {
            const leadId = `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const now = new Date();
            const leadData: any = {
              ...normalizedData,
              leadId,
              tenantId: tid,
              createdBy: user?._id,
              created: now,
              lastContact: now,
              statusKey: normalizedData.statusKey || 'new',
              activities: [{
                type: 'created',
                ts: this.formatTimestamp(now),
                note: 'Lead imported',
                by: user?.id || 'System',
                timestamp: now,
              }],
            };

            leadData.score = this.calculateScore(leadData);
            leadData.slaBreached = this.checkSlaBreached(leadData);
            leadData.activeAutomation = this.applyAutomation(leadData);

            bulkOps.push({
              insertOne: { document: leadData },
            });
            result.inserted++;
          }

          if (bulkOps.length >= batchSize || i === validRows.length - 1) {
            if (bulkOps.length > 0) {
              await this.leadModel.bulkWrite(bulkOps);
              bulkOps.length = 0;
            }
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push({ row: rowNumber, reason: error.message });
        }
      }

      return result;
    } catch (error: any) {
      throw new BadRequestException(`Import failed: ${error.message}`);
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  private async parseFile(filePath: string, fileExtension: string): Promise<any[]> {
    const ext = fileExtension.toLowerCase();
    if (ext === '.csv' || ext === 'csv') return this.parseCSV(filePath);
    if (ext === '.xlsx' || ext === 'xlsx' || ext === '.xls' || ext === 'xls') return this.parseExcel(filePath);
    if (ext === '.json' || ext === 'json') return this.parseJSON(filePath);
    throw new BadRequestException('Unsupported file format');
  }

  private parseCSV(filePath: string): Promise<any[]> {
    const csvParser = require('csv-parser');
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

    // Define comprehensive field mapping for CSV headers
    const fieldMapping: Record<string, string> = {
      // Name variations
      'name': 'name',
      'fullname': 'name',
      'full_name': 'name',
      'customername': 'name',
      'customer_name': 'name',
      'contactname': 'name',
      'contact_name': 'name',
      'leadname': 'name',
      'lead_name': 'name',
      
      // First/Last name
      'firstname': 'firstName',
      'first_name': 'firstName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      
      // Email variations
      'email': 'email',
      'emailaddress': 'email',
      'email_address': 'email',
      'primaryemail': 'email',
      'primary_email': 'email',
      'e_mail': 'email',
      
      // Phone variations
      'phone': 'phone',
      'phonenumber': 'phone',
      'phone_number': 'phone',
      'mobile': 'phone',
      'mobilenumber': 'phone',
      'mobile_number': 'phone',
      'cellphone': 'phone',
      'cell_phone': 'phone',
      'contactnumber': 'phone',
      'contact_number': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      
      // Company variations
      'company': 'company',
      'companyname': 'company',
      'company_name': 'company',
      'businessname': 'company',
      'business_name': 'company',
      'organization': 'company',
      'organisation': 'company',
      
      // Stage/Status variations
      'stage': 'statusKey',
      'status': 'statusKey',
      'leadstage': 'statusKey',
      'lead_stage': 'statusKey',
      'dealstage': 'statusKey',
      'deal_stage': 'statusKey',
      'opportunitystage': 'statusKey',
      'opportunity_stage': 'statusKey',
      
      // Source variations
      'source': 'source',
      'leadsource': 'source',
      'lead_source': 'source',
      'origin': 'source',
      'channel': 'source',
      
      // Value variations
      'value': 'value',
      'dealvalue': 'value',
      'deal_value': 'value',
      'leadvalue': 'value',
      'lead_value': 'value',
      'opportunityvalue': 'value',
      'opportunity_value': 'value',
      'amount': 'value',
      'price': 'value',
      
      // Score variations
      'score': 'score',
      'leadscore': 'score',
      'lead_score': 'score',
      'priority': 'score',
      'rating': 'score',
      
      // City variations
      'city': 'city',
      'location': 'city',
      'area': 'city',
      'region': 'city',
      
      // State variations
      'state': 'state',
      'province': 'state',
      
      // Activity log variations
      'activitylog': 'activityLogs',
      'activity_log': 'activityLogs',
      'activitylogs': 'activityLogs',
      'activity_logs': 'activityLogs',
      'activities': 'activityLogs',
      'notes': 'activityLogs',
      'comments': 'activityLogs',
      'remarks': 'activityLogs',
    };

    // Normalize header names
    const normalizedRow: any = {};
    Object.keys(row).forEach((key) => {
      const normalizedKey = this.normalizeHeader(key);
      const mappedKey = fieldMapping[normalizedKey] || normalizedKey;
      normalizedRow[mappedKey] = row[key];
    });

    // Process each field
    Object.keys(normalizedRow).forEach((key) => {
      const value = normalizedRow[key];
      if (value === undefined || value === null || value === '') return;

      // Map known fields with special handling
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
      } else if (key === 'activityLogs') {
        // Handle activity logs - can be pipe-separated or single entry
        const logs = String(value).split('|').map((s) => s.trim()).filter((s) => s);
        normalized.activityLogs = logs;
      } else if (knownFields.includes(key)) {
        // Handle other known schema fields
        normalized[key] = this.normalizeField(key, value);
      } else {
        // Store unknown fields in customFields (dynamic custom field creation)
        // Normalize the key name for storage (e.g., "Building Type" -> "building_type")
        const customFieldKey = this.normalizeHeader(key);
        normalized.customFields[customFieldKey] = value;
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

    // Remove firstName/lastName from top level after combining
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

  // Generate CSV import documentation with supported columns
  getImportDocumentation(): { standardFields: Array<{column: string; field: string; description: string}>; activityLogSupport: boolean; customFieldSupport: boolean } {
    return {
      standardFields: [
        { column: 'Name / Full Name / Customer Name', field: 'name', description: 'Lead full name (required)' },
        { column: 'Email / Email Address', field: 'email', description: 'Customer email address' },
        { column: 'Phone / Phone Number / Mobile', field: 'phone', description: 'Contact phone number' },
        { column: 'Company / Company Name', field: 'company', description: 'Company or organization name' },
        { column: 'Stage / Status', field: 'statusKey', description: 'Lead stage (new, contacted, qualified, proposal, negotiation, won, lost)' },
        { column: 'Source / Lead Source', field: 'source', description: 'Lead source (website, referral, campaign, ads, etc.)' },
        { column: 'Value / Deal Value / Amount', field: 'value', description: 'Deal value in currency' },
        { column: 'Score / Lead Score', field: 'score', description: 'Lead score (0-100)' },
        { column: 'City / Location', field: 'city', description: 'Customer city' },
        { column: 'State / Province', field: 'state', description: 'Customer state' },
        { column: 'Activity Log / Notes / Comments', field: 'activityLogs', description: 'Activity notes (use | separator for multiple entries)' },
      ],
      activityLogSupport: true,
      customFieldSupport: true,
    };
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

  // ============================================
  // LEAD ASSIGNMENT
  // ============================================

  async assignLead(
    id: string,
    assignedTo: string,
    user: UserWithVisibility,
  ): Promise<Lead> {
    // STEP 1: Security - Never trust frontend role, validate from authenticated user
    const userRole = user?.role?.toLowerCase() || '';
    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException('Not authorized to assign leads. Only Admin or Manager can assign leads.');
    }

    // STEP 2: Validate assignedTo user ID
    if (!assignedTo || !Types.ObjectId.isValid(assignedTo)) {
      throw new BadRequestException('Invalid assignedTo user ID');
    }

    // Get tenantId from authenticated user (never from frontend)
    const tid = this.toObjectId(user.tenantId?.toString());
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new ForbiddenException('Tenant context missing');
    }
    const assignedToId = new Types.ObjectId(assignedTo);
    const assignedById = user._id;

    // STEP 3: Verify lead belongs to same tenant
    const leadFilter: any = this.buildCompleteFilter(tid?.toString(), user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const lead = await this.leadModel.findOne(leadFilter).lean().exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // STEP 4: Verify target user belongs to same tenant
    if (tid) {
      const targetUser = await this.userModel
        .findOne({ _id: assignedToId, tenantId: tid })
        .lean()
        .exec();

      if (!targetUser) {
        throw new BadRequestException('Target user does not belong to your tenant');
      }
    }

    // Check if already assigned to same user
    const currentAssignedTo = lead.assignedTo?.toString();
    if (currentAssignedTo === assignedTo) {
      throw new BadRequestException('Lead is already assigned to this user');
    }

    const now = new Date();

    // STEP 5: Update lead with assignedTo and assignedBy
    const updateData: any = {
      assignedTo: assignedToId,
      assignedBy: assignedById,
      lastContact: now,
    };

    // Add assignment activity
    const activity = {
      type: 'assignment',
      ts: this.formatTimestamp(now),
      note: `Lead assigned to user ${assignedTo}`,
      by: user?.id || 'System',
      timestamp: now,
    };
    updateData.$push = { activities: activity };

    const updatedLead = await this.leadModel.findOneAndUpdate(
      leadFilter,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after assignment');
    }

    return updatedLead;
  }

  // ============================================
  // EXPORT LEADS
  // ============================================

  async exportLeads(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ csv: string; filename: string }> {
    const safeIds = Array.isArray(ids) ? ids : [];
    const objectIds = safeIds.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const orConditions: any[] = [];
    if (safeIds.length > 0) {
      if (objectIds.length > 0) orConditions.push({ _id: { $in: objectIds } });
      orConditions.push({ leadId: { $in: safeIds } });
    }

    const base: any = { isDeleted: { $ne: true } };
    if (orConditions.length > 0) {
      base.$or = orConditions;
    }

    const filter: any = this.buildCompleteFilter(tenantId, user, base);
    const leads = await this.leadModel.find(filter).lean().exec();

    // Generate CSV
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Stage', 'Source', 'Value', 'Score', 'City', 'Assigned To', 'Created At'];
    const rows = leads.map(lead => [
      lead.name || '',
      lead.company || '',
      lead.email || '',
      lead.phone || '',
      lead.statusKey || 'new',
      lead.source || '',
      lead.value || 0,
      lead.score || 0,
      lead.city || '',
      lead.assignedTo?.toString() || '',
      lead.created ? new Date(lead.created).toISOString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return {
      csv: csvContent,
      filename: `leads_export_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // ============================================
  // BULK UPDATE SCORE
  // ============================================

  async bulkUpdateScore(ids: string[], scoreIncrease: number, tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    if (!ids || ids.length === 0) {
      return { modified: 0 };
    }

    if (typeof scoreIncrease !== 'number' || Number.isNaN(scoreIncrease)) {
      throw new BadRequestException('scoreIncrease must be a number');
    }

    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const orConditions: any[] = [];
    if (objectIds.length > 0) orConditions.push({ _id: { $in: objectIds } });
    orConditions.push({ leadId: { $in: ids } });

    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: orConditions,
      isDeleted: { $ne: true },
    });

    const matched = await this.leadModel.countDocuments(filter);
    if (matched === 0) {
      return { modified: 0 };
    }

    const now = new Date();
    const activity = {
      type: 'score_boost',
      ts: this.formatTimestamp(now),
      note: `Score boosted by ${scoreIncrease}`,
      by: user?.id || 'System',
      timestamp: now,
    };

    const result = await this.leadModel.updateMany(
      filter,
      {
        $inc: { score: scoreIncrease },
        $push: { activities: activity },
      }
    );

    if (result.modifiedCount !== matched) {
      throw new BadRequestException(`Bulk score update partially failed: matched ${matched}, modified ${result.modifiedCount}`);
    }

    return { modified: result.modifiedCount };
  }
}
