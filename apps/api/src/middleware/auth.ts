import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

declare module 'fastify' { interface FastifyRequest { user?: { id: string; role: string; username: string } } }
export async function auth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.session;
    if (!token) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Login diperlukan' } });
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Session tidak valid' } });
    request.user = { id: user.id, role: user.role, username: user.username };
  } catch { return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Session tidak valid' } }); }
}
export function roles(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
  };
}
