import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { auth, roles } from '../middleware/auth.js';

const adminOnly = { preHandler: [auth, roles('ADMIN', 'SUPER_ADMIN')] };

export async function adminRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/overview', adminOnly, async () => {
    const [activeGames, queue, users, finishedToday, suspended, banned, openReports] = await Promise.all([
      prisma.game.count({ where: { status: 'ACTIVE' } }),
      prisma.matchmakingTicket.count({ where: { status: 'WAITING' } }),
      prisma.user.count(),
      prisma.game.count({ where: { status: 'FINISHED', finishedAt: { gte: startOfToday() } } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
    ]);
    return {
      activeGames,
      matchmakingQueue: queue,
      userCount: users,
      finishedGamesToday: finishedToday,
      suspendedUsers: suspended,
      bannedUsers: banned,
      openReports,
      recentErrors: 0,
      errorRate: 0,
    };
  });

  app.get('/api/v1/admin/users', adminOnly, async (req) => {
    const q = (req.query as any).q || '';
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : undefined,
      include: { profile: true, rating: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return { users };
  });

  app.patch('/api/v1/admin/users/:id/status', adminOnly, async (req, reply) => {
    const body = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']), reason: z.string().optional() }).parse(req.body);
    const id = (req.params as any).id;
    const user = await prisma.user.update({ where: { id }, data: { status: body.status } });
    await prisma.adminAction.create({
      data: {
        adminId: req.user!.id,
        targetUserId: id,
        action: `SET_STATUS_${body.status}`,
        metadataJson: { reason: body.reason },
      },
    });
    return { user };
  });

  app.get('/api/v1/admin/games', adminOnly, async () => {
    const games = await prisma.game.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { whitePlayer: { select: { id: true, username: true } }, blackPlayer: { select: { id: true, username: true } } },
    });
    return { games };
  });

  app.get('/api/v1/admin/matchmaking', adminOnly, async () => {
    const tickets = await prisma.matchmakingTicket.findMany({
      where: { status: 'WAITING' },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { tickets };
  });

  app.get('/api/v1/admin/reports', adminOnly, async () => {
    const reports = await prisma.report.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
      },
    });
    return { reports };
  });

  app.get('/api/v1/admin/audit-logs', adminOnly, async () => {
    const logs = await prisma.adminAction.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, username: true } } },
    });
    return { logs };
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
