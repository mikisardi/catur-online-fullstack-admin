import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { auth, roles } from '../middleware/auth';
export async function publicRoutes(app:FastifyInstance){
 app.get('/api/v1/leaderboard',async()=>({data:await prisma.user.findMany({take:50,select:{id:true,username:true,rating:{select:{rating:true}},_count:{select:{whiteGames:true,blackGames:true}}},orderBy:{rating:{rating:'desc'}}})}));
 app.get('/api/v1/history',{preHandler:auth},async(req)=>{const g=await prisma.game.findMany({where:{OR:[{whitePlayerId:req.user!.id},{blackPlayerId:req.user!.id}]},orderBy:{createdAt:'desc'},take:50,include:{whitePlayer:{select:{username:true}},blackPlayer:{select:{username:true}}}}); return {data:g};});
 app.get('/api/v1/history/:id',{preHandler:auth},async(req,reply)=>{const g=await prisma.game.findUnique({where:{id:(req.params as any).id},include:{moves:{orderBy:{ply:'asc'}},whitePlayer:{select:{username:true}},blackPlayer:{select:{username:true}}}});if(!g)return reply.code(404).send({error:{code:'NOT_FOUND',message:'Tidak ditemukan'}});if(![g.whitePlayerId,g.blackPlayerId].includes(req.user!.id))return reply.code(403).send({error:{code:'FORBIDDEN',message:'Forbidden'}});return {data:g};});
 app.get('/api/v1/profile/:username',async(req,reply)=>{const u=await prisma.user.findUnique({where:{username:(req.params as any).username},include:{profile:true,rating:true}});if(!u)return reply.code(404).send({error:{code:'NOT_FOUND',message:'Tidak ditemukan'}});return {data:{username:u.username,profile:u.profile,rating:u.rating}}});
 app.get('/api/v1/admin/overview',{preHandler:[auth,roles('ADMIN','SUPER_ADMIN')]},async()=>({data:{activeGames:await prisma.game.count({where:{status:'ACTIVE'}}),queued:await prisma.matchmakingTicket.count({where:{status:'SEARCHING'}}),users:await prisma.user.count()}}));
}
