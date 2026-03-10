/**
 * Migration script to fix installation records with incorrect projectId references.
 * 
 * Problem: Old installations stored projectId as a converted ObjectId from string "PRJxxx",
 *          instead of the actual MongoDB ObjectId of the project.
 * 
 * Solution: Look up each installation's project by matching the installation's customerName/site
 *           with the project's customerName/site, then update with correct project ObjectId.
 */

import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Installation, InstallationSchema } from '../src/modules/installation/schemas/installation.schema';
import { Project, ProjectSchema } from '../src/modules/projects/schemas/project.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/solar-erp',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Installation.name, schema: InstallationSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MigrationModule);
  
  const installationModel = app.get<Model<Installation>>(getModelToken(Installation.name));
  const projectModel = app.get<Model<Project>>(getModelToken(Project.name));

  console.log('[MIGRATION] Starting installation projectId fix...\n');

  // Find all installations that need fixing
  const installations = await installationModel.find({ isDeleted: false }).exec();
  console.log(`[MIGRATION] Found ${installations.length} total installations\n`);

  let fixed = 0;
  let errors = 0;
  let alreadyCorrect = 0;
  let notFound = 0;

  for (const inst of installations) {
    try {
      // Try to find the project by matching customer and site
      const project = await projectModel.findOne({
        customerName: inst.customerName,
        site: inst.site,
        isDeleted: false,
      });

      if (!project) {
        console.log(`[MIGRATION] ⚠️  No project found for installation ${inst.installationId} (customer: ${inst.customerName}, site: ${inst.site})`);
        notFound++;
        continue;
      }

      // Check if projectId is already correct
      if (inst.projectId?.toString() === project._id.toString()) {
        alreadyCorrect++;
        continue;
      }

      // Update the installation with correct projectId
      await installationModel.updateOne(
        { _id: inst._id },
        { $set: { projectId: project._id } }
      );

      console.log(`[MIGRATION] ✓ Fixed installation ${inst.installationId}: projectId ${inst.projectId} → ${project._id}`);
      fixed++;

    } catch (err: any) {
      console.error(`[MIGRATION] ✗ Error fixing installation ${inst.installationId}:`, err.message);
      errors++;
    }
  }

  console.log(`\n[MIGRATION] Summary:`);
  console.log(`  - Fixed: ${fixed}`);
  console.log(`  - Already correct: ${alreadyCorrect}`);
  console.log(`  - Project not found: ${notFound}`);
  console.log(`  - Errors: ${errors}`);
  console.log(`  - Total processed: ${installations.length}`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err: any) => {
  console.error('[MIGRATION] Fatal error:', err);
  process.exit(1);
});
