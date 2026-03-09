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

    };



    // Convert createdBy to ObjectId if provided

    const userId = user?._id || user?.id;

    if (userId) {

      ticketData.createdBy = typeof userId === 'string' && Types.ObjectId.isValid(userId)

        ? new Types.ObjectId(userId)

        : userId;

    }



    // Convert assignedTo to ObjectId if provided

    if (createTicketDto.assignedTo) {

      ticketData.assignedTo = Types.ObjectId.isValid(createTicketDto.assignedTo)

        ? new Types.ObjectId(createTicketDto.assignedTo)

        : createTicketDto.assignedTo;

    }



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

      // Use raw collection to bypass Mongoose validation on find
      const collection = this.ticketModel.collection;
      let rawTicket = await collection.findOne(filter);
      
      if (!rawTicket && tenantId) {
        const fallbackFilter: any = {
          $or: [
            { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
            { ticketId: id }
          ].filter(Boolean),
          isDeleted: { $ne: true },
          tenantId: { $exists: false }
        };
        console.log('Trying fallback filter:', fallbackFilter);
        const fallbackTicket = await collection.findOne(fallbackFilter);
        if (fallbackTicket) {
          console.log('Found ticket without tenantId, will update it with tenantId');
          rawTicket = fallbackTicket;
          // Add tenantId to update
          updateTicketDto = { ...updateTicketDto, tenantId: new Types.ObjectId(tenantId) } as any;
        }
      }

      if (!rawTicket) {
        console.log('Ticket not found for id:', id);
        throw new NotFoundException('Ticket not found');
      }

      console.log('Found ticket:', rawTicket.ticketId);

      // Clean invalid ObjectId fields from raw data
      const objectIdFields = ['assignedTo', 'createdBy'];
      const cleanedUpdate: any = { ...updateTicketDto };
      for (const field of objectIdFields) {
        const value = rawTicket[field];
        if (value && typeof value === 'string' && !Types.ObjectId.isValid(value)) {
          console.log(`Removing invalid ${field} value:`, value);
          cleanedUpdate[field] = null; // Set to null to remove from document
        }
      }

      // Filter out undefined values
      const updates: any = {};
      Object.entries(cleanedUpdate).forEach(([key, value]) => {
        if (value !== undefined && key !== 'resolved' && key !== '_id' && key !== 'ticketId') {
          updates[key] = value;
        }
      });

      // Handle resolved date based on status
      if (updateTicketDto.status === 'Resolved') {
        updates.resolved = new Date();
      } else if (updateTicketDto.status && updateTicketDto.status !== 'Resolved' && updateTicketDto.status !== 'Closed') {
        updates.resolved = null;
      }

      console.log('Applying updates:', updates);

      // Use findOneAndUpdate with raw collection
      const updateFilter: any = { _id: rawTicket._id };
      const result = await collection.findOneAndUpdate(
        updateFilter,
        { $set: updates },
        { returnDocument: 'after' }
      );

      console.log('Ticket updated successfully');

      return {
        ...result,
        id: result?.ticketId,
        created: result?.created ? new Date(result.created).toISOString().split('T')[0] : '',
        resolved: result?.resolved ? new Date(result.resolved).toISOString().split('T')[0] : null,
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

