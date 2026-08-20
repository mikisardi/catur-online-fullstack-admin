import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { initRuntime } from '../services/gameService.js';
export async function botRoutes(app:FastifyInstance){
  app.post('/api/v1/bot/games',{preHandler:auth},async(req)=>{
    const b = z.object({
      level: z.enum(['beginner', 'easy', 'medium', 'hard', 'expert']).default('medium'),
      timeControl: z.string().regex(/^\d+\+\d+$/).default('5+0'),
      color: z.enum(['WHITE', 'BLACK', 'RANDOM']).default('RANDOM'),
      }).parse(req.body || {});
    const [secs,inc]=b.timeControl.split('+').map(Number);
    const playerColor =
      b.color === 'RANDOM'
      ? (Math.random() < 0.5 ? 'WHITE' : 'BLACK')
      : b.color;
    const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const whitePlayerId = playerColor === 'WHITE' ? req.user!.id : null;
    const blackPlayerId = playerColor === 'BLACK' ? req.user!.id : null;
    const g=await prisma.game.create({
    data:{
      mode:'BOT',
      timeControl:b.timeControl,
      initialSeconds:secs,
      incrementSeconds:inc,
      whitePlayerId,
      blackPlayerId,
      status:'ACTIVE',
      initialFen:fen,
      startedAt:new Date()
      }
    }); 
    initRuntime(g.id,fen,secs*1000,secs*1000); 
    return {
    data: {
      ...g,
      level: b.level,
      playerColor,
      },
    };
  });
}
