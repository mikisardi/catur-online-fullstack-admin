import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { auth } from '../middleware/auth.js';
import { Chess } from 'chess.js';
import { initRuntime, submitMove, finalizeGame, loadRuntime, submitBotMove } from '../services/gameService.js';
export async function gameRoutes(app:FastifyInstance){
 app.get('/api/v1/games/:id',{preHandler:auth},async(req,reply)=>{const {id}=req.params as any; const g=await prisma.game.findUnique({where:{id},include:{moves:{orderBy:{ply:'asc'}}}}); if(!g)return reply.code(404).send({error:{code:'NOT_FOUND',message:'Game tidak ditemukan'}}); if(![g.whitePlayerId,g.blackPlayerId].includes(req.user!.id))return reply.code(403).send({error:{code:'FORBIDDEN',message:'Forbidden'}}); return {data:g};});
 app.post('/api/v1/games/:id/move',{preHandler:auth},async(req,reply)=>{const {id}=req.params as any; const b=z.object({move:z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),promotion:z.string().optional()}).parse(req.body); try{
  const playerMove=await submitMove(id,req.user!.id,b.move,b.promotion); 
  const game=await prisma.game.findUnique({where:{id}}); let botMove=null; 
  if (game?.mode === 'BOT' && game.status === 'ACTIVE') {
  const botColor = game.whitePlayerId === req.user!.id ? 'BLACK' : 'WHITE';
  botMove = await submitBotMove(id, 'medium', botColor);
  }
  const payload={playerMove,botMove}; (app as any).io?.to(`game:${id}`).emit('game:move_applied',payload); 
  if (botMove?.finished) {
  const result = game?.whitePlayerId === req.user!.id ? 'BLACK' : 'WHITE';
  (app as any).io?.to(`game:${id}`).emit('game:finish', {
    result,
    reason: 'checkmate'
  });
  } 
  return {data:payload};}catch(e:any){const code=e.message; const map:any={FORBIDDEN:403,CONFLICT:409,INVALID_MOVE:422,TIMEOUT:409}; return reply.code(map[code]||422).send({error:{code:code==='Error'?'INVALID_MOVE':code,message:'Move ditolak'}})}});
 app.post('/api/v1/games/:id/resign',{preHandler:auth},async(req,reply)=>{const {id}=req.params as any; const g=await prisma.game.findUnique({where:{id}}); if(!g||![g.whitePlayerId,g.blackPlayerId].includes(req.user!.id))return reply.code(403).send({error:{code:'FORBIDDEN',message:'Forbidden'}}); const r=await loadRuntime(id); const result=g.whitePlayerId===req.user!.id?'BLACK':'WHITE'; await finalizeGame(id,result,'resign',r); (app as any).io?.to(`game:${id}`).emit('game:finish',{result,reason:'resign'}); return {data:true};});
 app.post('/api/v1/games/:id/draw-offer',{preHandler:auth},async(req)=>{const {id}=req.params as any; await prisma.drawOffer.create({data:{gameId:id,offeredBy:req.user!.id}}); (app as any).io?.to(`game:${id}`).emit('game:draw_offer',{offeredBy:req.user!.id}); return {data:true};});
 app.post('/api/v1/games/:id/rematch',{preHandler:auth},async(req,reply)=>{const {id}=req.params as any; const g=await prisma.game.findUnique({where:{id}});if(!g||g.status!=='FINISHED')return reply.code(409).send({error:{code:'CONFLICT',message:'Game belum selesai'}}); const ng=await prisma.game.create({data:{mode:g.mode,timeControl:g.timeControl,initialSeconds:g.initialSeconds,incrementSeconds:g.incrementSeconds,whitePlayerId:g.blackPlayerId,blackPlayerId:g.whitePlayerId,status:'ACTIVE',initialFen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',startedAt:new Date()}}); initRuntime(ng.id,ng.initialFen,ng.initialSeconds*1000,ng.initialSeconds*1000); return {data:ng};});
}
