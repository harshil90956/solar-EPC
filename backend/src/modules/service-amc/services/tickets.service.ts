import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument } from '../schemas/ticket.schema';
import { User, UserDocument } from '../../../core/auth/schemas/user.schema';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto } from '../dto/ticket.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createTicketDto: CreateTicketDto, tenantId?: string, user?: UserWithVisibility): Promise<Ticket> {
    const now = new Date();
    const ticketId = `T${Date.now().toString().slice(-5)}`;

    const ticketData: any = {
      ...createTicketDto,
      ticketId,
      created: now,
      resolved: null,
      createdBy: user?._id || user?.id,
    };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        ticketData.tenantId = new Types.ObjectId(tenantId);
      } else {
        ticketData.tenantId = tenantId;
      }
    }

    console.log('Creating ticket with data:', ticketData);
    const createdTicket = new this.ticketModel(ticketData);
    console.log('POST /tickets received:', createTicketDto);
    const saved = await createdTicket.save();
    console.log('Ticket created, returning:', saved);
    console.log('Ticket saved to MongoDB:', saved);
    return saved;
  }

  async findAll(query: QueryTicketDto, tenantId?: string, user?: UserWithVisibility): Promise<{ data: Ticket[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy,
      sortOrder = 'desc',
      search,
      status,
      priority,
      customerId,
      assignedTo,
    } = query;

    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    // Apply visibility filter based on user's dataScope FIRST
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show tickets explicitly assigned to this user
        filter.assignedTo = objectId;
        console.log(`[TICKETS VISIBILITY] Applied STRICT assignedTo filter:`, objectId);
      }
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (customerId) filter.customerId = customerId;
    // Note: assignedTo query param is IGNORED for ASSIGNED scope users
    // The visibility filter above takes precedence for dataScope enforcement

    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    const sortField = sortBy || 'created';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.ticketModel.countDocuments(filter),
    ]);

    // Format dates for frontend
    const formattedData = data.map((ticket: any) => ({
      ...ticket,
      id: ticket.ticketId,
      created: ticket.created ? new Date(ticket.created).toISOString().split('T')[0] : '',
      resolved: ticket.resolved ? new Date(ticket.resolved).toISOString().split('T')[0] : null,
    }));

    return { data: formattedData as unknown as Ticket[], total };
  }

  async findOne(id: string, tenantId?: string): Promise<Ticket> {
    const filter: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { ticketId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    const ticket = await this.ticketModel.findOne(filter).lean().exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      ...ticket,
      id: ticket.ticketId,
      created: ticket.created ? new Date(ticket.created).toISOString().split('T')[0] : '',
      resolved: ticket.resolved ? new Date(ticket.resolved).toISOString().split('T')[0] : null,
    } as unknown as Ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, tenantId?: string): Promise<Ticket> {
    try {
      console.log('Service.update called with id:', id, 'dto:', updateTicketDto);
      
      const filter: any = {
        $or: [
          { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
          { ticketId: id }
        ].filter(Boolean),
        isDeleted: { $ne: true }
      };

      if (tenantId) {
        if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
          filter.tenantId = new Types.ObjectId(tenantId);
        } else {
          filter.tenantId = tenantId;
        }
      }

      console.log('Finding ticket with filter:', filter);
      const existingTicket = await this.ticketModel.findOne(filter).exec();
      
      if (!existingTicket) {
        console.log('Ticket not found for id:', id);
        throw new NotFoundException('Ticket not found');
      }
      
      console.log('Found ticket:', existingTicket.ticketId);

      // Filter out undefined values and only apply defined updates
      const updates = Object.entries(updateTicketDto as any).reduce((acc, [key, value]) => {
        if (value !== undefined && key !== 'resolved') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      console.log('Applying filtered updates:', updates);
      
      // Only apply if there are actual updates
      if (Object.keys(updates).length > 0) {
        Object.assign(existingTicket, updates);
      }

      // Handle resolved date based on status
      if (updateTicketDto.status === 'Resolved' && !existingTicket.resolved) {
        existingTicket.resolved = new Date();
      }
      if (updateTicketDto.status && updateTicketDto.status !== 'Resolved' && updateTicketDto.status !== 'Closed') {
        existingTicket.resolved = null;
      }

      console.log('Saving ticket with status:', existingTicket.status);
      const saved = await existingTicket.save();
      console.log('Ticket saved successfully');
      
      return {
        ...saved.toObject(),
        id: saved.ticketId,
        created: saved.created ? new Date(saved.created).toISOString().split('T')[0] : '',
        resolved: saved.resolved ? new Date(saved.resolved).toISOString().split('T')[0] : null,
      } as unknown as Ticket;
    } catch (error: any) {
      console.error('Service.update error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const filter: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { ticketId: id }
      ].filter(Boolean),
    };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    // Hard delete - permanently remove from database
    const result = await this.ticketModel.deleteOne(filter).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Ticket not found');
    }
  }

  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show tickets explicitly assigned to this user
        filter.assignedTo = objectId;
        console.log(`[TICKETS STATS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    }

    console.log(`[TICKETS STATS VISIBILITY] Final filter:`, JSON.stringify(filter));

    const [
      totalTickets,
      openTickets,
      inProgress,
      resolved,
      scheduled,
      closed,
      statusCounts,
    ] = await Promise.all([
      this.ticketModel.countDocuments(filter),
      this.ticketModel.countDocuments({ ...filter, status: 'Open' }),
      this.ticketModel.countDocuments({ ...filter, status: 'In Progress' }),
      this.ticketModel.countDocuments({ ...filter, status: 'Resolved' }),
      this.ticketModel.countDocuments({ ...filter, status: 'Scheduled' }),
      this.ticketModel.countDocuments({ ...filter, status: 'Closed' }),
      this.ticketModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalTickets,
      openTickets,
      inProgress,
      resolved,
      scheduled,
      closed,
      statusDistribution: statusCounts.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }

  async getEngineers(tenantId?: string): Promise<{ id: string; name: string; email: string }[]> {
    const filter: any = {
      isActive: true,
      $or: [
        { role: 'Admin' },
        { role: 'Service Manager' },
      ],
    };

    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }

    const users = await this.userModel
      .find(filter)
      .select('_id email role')
      .lean()
      .exec();

    return users.map((user: any) => ({
      id: user._id.toString(),
      name: user.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      email: user.email,
    }));
  }
}
