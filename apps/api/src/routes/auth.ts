import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { auth } from '../middleware/auth.js';
export async function authRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/register', async (req, reply) => { const b=z.object({username:z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),email:z.string().email(),password:z.string().min(8),consent:z.boolean().refine(Boolean)}).parse(req.body); const hash=await bcrypt.hash(b.password,12); const u=await prisma.user.create({data:{username:b.username,email:b.email,passwordHash:hash,profile:{create:{displayName:b.username}},rating:{create:{}}},include:{profile:true}}); return reply.code(201).send({data:{id:u.id,username:u.username,email:u.email}}); });
  app.post('/api/v1/auth/login', async (req, reply) => { const b=z.object({identifier:z.string(),password:z.string()}).parse(req.body); const u=await prisma.user.findFirst({where:{OR:[{email:b.identifier},{username:b.identifier}]}}); if(!u || !(await bcrypt.compare(b.password,u.passwordHash))) return reply.code(401).send({error:{code:'AUTH_REQUIRED',message:'Credential salah'}}); const token=jwt.sign({sub:u.id,role:u.role},config.jwtSecret,{expiresIn:'7d'}); reply.setCookie('session',token,{httpOnly:true,secure:true,sameSite:'none',path:'/',maxAge:60*60*24*7}); return {data:{id:u.id,username:u.username,role:u.role}}; });
  app.post('/api/v1/auth/logout',{preHandler:auth},async(req,reply)=>{reply.clearCookie('session',{path:'/'}); return {data:true};});
  app.get('/api/v1/me',{preHandler:auth},async(req)=>{const u=await prisma.user.findUnique({where:{id:req.user!.id},include:{profile:true,rating:true}}); return {data:u};});
}
