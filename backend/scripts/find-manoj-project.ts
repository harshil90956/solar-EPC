import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
async function run() {
  const conn = await mongoose.connect(process.env.MONGO_URI || '');
  const db = conn.connection.db!;
  const projects = await db.collection('projects').find({ customerName: /manoj/i }).toArray();
  console.log('Manoj projects:', projects.map(p => `${p.projectId} - ${p.customerName}`));
  await mongoose.disconnect();
}
run().catch(console.error);
