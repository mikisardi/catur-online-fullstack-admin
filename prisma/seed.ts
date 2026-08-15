import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const adminPass = await bcrypt.hash('Admin123!', 12);
  const demoPass = await bcrypt.hash('Demo123!', 12);
  for (const u of [
    { username: 'admin', email: 'admin@example.com', passwordHash: adminPass, role: Role.ADMIN },
    { username: 'demo', email: 'demo@example.com', passwordHash: demoPass, role: Role.USER }
  ]) {
    const user = await prisma.user.upsert({ where: { email: u.email }, update: {}, create: u });
    await prisma.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, displayName: u.username } });
    await prisma.rating.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  }
}
main().finally(() => prisma.$disconnect());
