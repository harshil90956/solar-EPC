import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AmcContract, AmcContractDocument } from '../schemas/amc-contract.schema';
import { Project } from '../../projects/schemas/project.schema';
import { CreateAmcContractDto, UpdateAmcContractDto, QueryAmcContractDto } from '../dto/amc-contract.dto';

@Injectable()
export class AmcContractsService {
  constructor(
    @InjectModel(AmcContract.name) private amcContractModel: Model<AmcContractDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async create(createDto: CreateAmcContractDto, tenantId?: string): Promise<AmcContract> {
    const contractId = `AMC${Date.now().toString().slice(-5)}`;

    const contractData: any = {
      ...createDto,
      contractId,
    };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        contractData.tenantId = new Types.ObjectId(tenantId);
      } else {
        contractData.tenantId = tenantId;
      }
    }

    const createdContract = new this.amcContractModel(contractData);
    return createdContract.save();
  }

  async findAll(query: QueryAmcContractDto, tenantId?: string): Promise<{ data: AmcContract[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy,
      sortOrder = 'desc',
      search,
      status,
    } = query;

    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { contractId: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    const sortField = sortBy || 'startDate';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.amcContractModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.amcContractModel.countDocuments(filter),
    ]);

    // Add id field for frontend compatibility
    const formattedData = data.map((contract: any) => ({
      ...contract,
      id: contract.contractId,
    }));

    return { data: formattedData as AmcContract[], total };
  }

  async findOne(id: string, tenantId?: string): Promise<AmcContract> {
    const filter: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { contractId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    };

    // First find without tenant filter
    let contract = await this.amcContractModel.findOne(filter).lean().exec();
    
    // If not found and tenantId provided, try with tenant filter
    if (!contract && tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
      contract = await this.amcContractModel.findOne(filter).lean().exec();
    }

    if (!contract) {
      throw new NotFoundException('AMC Contract not found');
    }

    return {
      ...contract,
      id: contract.contractId,
    } as AmcContract;
  }

  async update(id: string, updateDto: UpdateAmcContractDto, tenantId?: string): Promise<AmcContract> {
    const filter: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { contractId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    };

    // First find without tenant filter to check if contract exists
    let existingContract = await this.amcContractModel.findOne(filter).exec();
    
    // If not found and tenantId provided, try with tenant filter
    if (!existingContract && tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
      existingContract = await this.amcContractModel.findOne(filter).exec();
    }
    
    if (!existingContract) {
      throw new NotFoundException('AMC Contract not found');
    }

    // Filter out tenant_id and undefined values from update as schema uses tenantId
    const { tenant_id, ...rest } = updateDto as any;
    const updateData = Object.entries(rest).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    Object.assign(existingContract, updateData);

    const saved = await existingContract.save();
    return {
      ...saved.toObject(),
      id: saved.contractId,
    } as AmcContract;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const filter: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { contractId: id }
      ].filter(Boolean),
    };

    // First find without tenant filter
    let contract = await this.amcContractModel.findOne(filter).exec();
    
    // If not found and tenantId provided, try with tenant filter
    if (!contract && tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
      contract = await this.amcContractModel.findOne(filter).exec();
    }

    // Hard delete - permanently remove from database
    const result = await this.amcContractModel.deleteOne({ _id: contract?._id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('AMC Contract not found');
    }
  }

  async getStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    const [
      totalContracts,
      activeContracts,
      expiredContracts,
      expiringContracts,
      totalValue,
      statusCounts,
    ] = await Promise.all([
      this.amcContractModel.countDocuments(filter),
      this.amcContractModel.countDocuments({ ...filter, status: 'Active' }),
      this.amcContractModel.countDocuments({ ...filter, status: 'Expired' }),
      this.amcContractModel.countDocuments({ ...filter, status: 'Expiring' }),
      this.amcContractModel.aggregate([
        { $match: { ...filter, status: 'Active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.amcContractModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalContracts,
      activeContracts,
      expiredContracts,
      expiringContracts,
      totalValue: totalValue[0]?.total || 0,
      statusDistribution: statusCounts.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }

  /**
   * Get unique customer names from all projects
   */
  async getCustomersFromProjects(tenantId?: string): Promise<string[]> {
    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    // Get all unique customer names from projects
    const customers = await this.projectModel
      .distinct('customerName', filter)
      .exec();

    return customers.filter(Boolean).sort();
  }

  /**
   * Auto-sync AMC contracts with commissioned projects
   * - Creates AMC contracts for new commissioned projects
   * - Removes AMC contracts when project is deleted or no longer commissioned
   */
  async autoGenerateFromProjects(tenantId?: string): Promise<{ created: number; removed: number; contracts: AmcContract[] }> {
    const projectFilter: any = { progress: 100, isDeleted: false };
    const amcFilter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      projectFilter.tenantId = new Types.ObjectId(tenantId);
      amcFilter.tenantId = new Types.ObjectId(tenantId);
    }

    // Find all commissioned projects
    const commissionedProjects = await this.projectModel
      .find(projectFilter)
      .select('_id projectId customerName site systemSize startDate value tenantId')
      .lean()
      .exec();

    // Create a map of project identifiers for quick lookup (case-insensitive)
    const projectKeys = new Set(
      commissionedProjects.map(p => `${p.customerName?.toLowerCase()?.trim()}-${p.site?.toLowerCase()?.trim()}`)
    );

    // Find all existing AMC contracts
    const existingContracts = await this.amcContractModel
      .find(amcFilter)
      .select('customer site contractId')
      .lean()
      .exec();

    // Find orphaned AMC contracts (AMC exists but project is gone or not commissioned)
    const contractsToRemove = existingContracts.filter(c => {
      const key = `${c.customer?.toLowerCase()?.trim()}-${c.site?.toLowerCase()?.trim()}`;
      return !projectKeys.has(key);
    });

    // Remove orphaned contracts
    let removedCount = 0;
    for (const contract of contractsToRemove) {
      try {
        await this.amcContractModel.deleteOne({ contractId: contract.contractId }).exec();
        removedCount++;
      } catch (err) {
        // Silent fail for individual deletions
      }
    }

    const existingKeys = new Set(
      existingContracts.map(c => `${c.customer?.toLowerCase()?.trim()}-${c.site?.toLowerCase()?.trim()}`)
    );

    const createdContracts: AmcContract[] = [];

    for (const project of commissionedProjects) {
      const key = `${project.customerName?.toLowerCase()?.trim()}-${project.site?.toLowerCase()?.trim()}`;
      
      // Skip if AMC already exists for this customer+site
      if (existingKeys.has(key)) {
        continue;
      }

      // Calculate AMC dates (1 year contract, first visit after 3 months)
      const startDate = project.startDate || new Date().toISOString().split('T')[0];
      const start = new Date(startDate);
      const endDate = new Date(start);
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      const nextVisit = new Date(start);
      nextVisit.setMonth(nextVisit.getMonth() + 3);

      // Calculate AMC amount (2% of project value or minimum 5000)
      const amount = project.value ? Math.max(project.value * 0.02, 5000) : 5000;

      const contractData: any = {
        customer: project.customerName,
        site: project.site,
        systemSize: project.systemSize || 0,
        startDate: startDate,
        endDate: endDate.toISOString().split('T')[0],
        status: 'Active',
        nextVisit: nextVisit.toISOString().split('T')[0],
        amount: Math.round(amount),
      };

      if (project.tenantId) {
        contractData.tenantId = new Types.ObjectId(project.tenantId);
      }

      // Generate unique contract ID
      const contractId = `AMC${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 1000)}`;
      contractData.contractId = contractId;

      const createdContract = new this.amcContractModel(contractData);
      const saved = await createdContract.save();
      
      // Add to existingKeys to prevent duplicates in same batch
      existingKeys.add(key);
      
      createdContracts.push({
        ...saved.toObject(),
        id: saved.contractId,
      } as AmcContract);
    }

    return {
      created: createdContracts.length,
      removed: removedCount,
      contracts: createdContracts,
    };
  }

  /**
   * Force remove all duplicate AMC contracts
   * Keeps only one contract per customer-site combination (oldest one)
   */
  async forceRemoveDuplicates(): Promise<{ deleted: number; remaining: number }> {
    try {
      const contracts = await this.amcContractModel
        .find({ isDeleted: { $ne: true } })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      const grouped = new Map<string, any[]>();
      
      for (const contract of contracts) {
        const key = `${contract.customer?.toLowerCase()?.trim()}-${contract.site?.toLowerCase()?.trim()}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)?.push(contract);
      }

      const toDelete: string[] = [];
      
      for (const [key, group] of grouped) {
        if (group.length > 1) {
          // Keep first (oldest), delete rest
          for (let i = 1; i < group.length; i++) {
            const id = group[i]._id?.toString();
            if (id && Types.ObjectId.isValid(id)) {
              toDelete.push(id);
            }
          }
        }
      }

      let deletedCount = 0;
      if (toDelete.length > 0) {
        const result = await this.amcContractModel.deleteMany({
          _id: { $in: toDelete.map(id => new Types.ObjectId(id)) }
        }).exec();
        deletedCount = result.deletedCount || 0;
      }

      const remaining = await this.amcContractModel.countDocuments({ isDeleted: { $ne: true } });

      return { deleted: deletedCount, remaining };
    } catch (error) {
      console.error('Error in forceRemoveDuplicates:', error);
      throw error;
    }
  }
}
