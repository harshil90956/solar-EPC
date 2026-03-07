import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto, UpdateSurveyDto, QuerySurveyDto } from '../dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
  ) {}

  // Generate unique survey ID
  private generateSurveyId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `S${timestamp}${random}`;
  }

  // Create new survey
  async create(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const surveyId = this.generateSurveyId();
    const newSurvey = new this.surveyModel({
      ...createSurveyDto,
      surveyId,
      status: createSurveyDto.status || 'Scheduled',
    });
    return newSurvey.save();
  }

  // Get all surveys with filters
  async findAll(query: QuerySurveyDto): Promise<{ data: Survey[]; total: number }> {
    const { status, engineer, search, page = 1, limit = 100 } = query;
    
    const filter: any = {};
    
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

  // Get survey stats
  async getStats(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    pending: number;
    totalKw: number;
  }> {
    const [
      total,
      scheduled,
      completed,
      pending,
      totalKwResult,
    ] = await Promise.all([
      this.surveyModel.countDocuments(),
      this.surveyModel.countDocuments({ status: 'Scheduled' }),
      this.surveyModel.countDocuments({ status: 'Completed' }),
      this.surveyModel.countDocuments({ status: 'Pending' }),
      this.surveyModel.aggregate([
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

  // Get single survey
  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveyModel.findOne({
      $or: [{ _id: id }, { surveyId: id }],
    });
    
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
    
    return survey;
  }

  // Update survey
  async update(id: string, updateSurveyDto: UpdateSurveyDto): Promise<Survey> {
    try {
      console.log('Updating survey:', id, 'with data:', updateSurveyDto);
      
      const survey = await this.surveyModel.findOneAndUpdate(
        { $or: [{ _id: id }, { surveyId: id }] },
        { $set: updateSurveyDto },
        { new: true },
      );
      
      if (!survey) {
        throw new NotFoundException(`Survey with ID ${id} not found`);
      }
      
      console.log('Survey updated successfully:', survey.surveyId);
      return survey;
    } catch (error) {
      console.error('Error updating survey:', error);
      throw error;
    }
  }

  // Delete survey
  async remove(id: string): Promise<void> {
    const result = await this.surveyModel.deleteOne({
      $or: [{ _id: id }, { surveyId: id }],
    });
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
  }
}
