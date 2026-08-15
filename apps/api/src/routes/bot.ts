import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auth } from '../middleware/auth';
import { prisma } from '../prisma';
import { initRuntime } from '../services/gameService';
export async function botRoutes(app:FastifyInstance){
  app.post('/api/v1/bot/games',{preHandler:auth},async(req)=>{const b=z.object({level:z.enum(['beginner','easy','medium','hard','expert']).default('medium'),timeControl:z.string().regex(/^\d+\+\d+$/).default('5+0')}).parse(req.body||{}); const [secs,inc]=b.timeControl.split('+').map(Number); const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; const g=await prisma.game.create({data:{mode:'BOT',timeControl:b.timeControl,initialSeconds:secs,incrementSeconds:inc,whitePlayerId:req.user!.id,status:'ACTIVE',initialFen:fen,startedAt:new Date()}}); initRuntime(g.id,fen,secs*1000,secs*1000); return {data:{...g,level:b.level}};});
}
