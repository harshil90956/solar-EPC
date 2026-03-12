import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { UserOverride } from '../src/modules/settings/schemas/user-override.schema';
import { User } from '../src/core/auth/schemas/user.schema';

/**
 * Script to assign custom role to a user
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userOverrideModel = app.get<Model<UserOverride>>(getModelToken(UserOverride.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    
    // Find all users
    const allUsers = await userModel.find({}).exec();
    console.log('\n📋 All Users:');
    allUsers.forEach((user: any, index) => {
      console.log(`   ${index + 1}. ${user.email} - Role: ${user.role}`);
    });
    
    // Pick the first non-superadmin user (or change this to target a specific user)
    const targetEmail = ''; // Enter email here if you want to target specific user
    const targetUser = targetEmail 
      ? await userModel.findOne({ email: targetEmail }).exec()
      : await userModel.findOne({ role: { $ne: 'superadmin' } }).exec();
    
    if (!targetUser) {
      console.log('\n❌ No target user found!');
      return;
    }
    
    console.log(`\n🎯 Target User: ${targetUser.email} (Current Role: ${targetUser.role})`);
    
    // Assign the engineer custom role
    const customRoleId = 'custom_1773119661334'; // engineer role
    
    let override = await userOverrideModel.findOne({ userId: targetUser._id }).exec();
    
    if (override) {
      override.customRoleId = customRoleId;
      await override.save();
      console.log(`✅ Updated existing override - Assigned custom role: ${customRoleId}`);
    } else {
      override = new userOverrideModel({
        userId: targetUser._id,
        customRoleId,
        overrides: new Map(),
      });
      await override.save();
      console.log(`✅ Created new override - Assigned custom role: ${customRoleId}`);
    }
    
    console.log(`\n✨ User "${targetUser.email}" now has the "${customRoleId}" role!`);
    console.log('💡 Refresh the frontend to see the changes');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
