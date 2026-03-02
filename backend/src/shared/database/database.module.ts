import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const logger = new Logger('MongoDB');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    this.connection.on('connected', () => {
      logger.log('MongoDB connected');
    });

    this.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    this.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
    });

    if (this.connection.readyState === 1) {
      logger.log('MongoDB connected');
    }
  }
}
