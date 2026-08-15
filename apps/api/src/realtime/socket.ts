import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';
import { loadRuntime } from '../services/gameService';
export function attachRealtime(io: Server) {
  io.use(async (socket, next) => { try { const token = socket.handshake.auth?.token || socket.handshake.headers.cookie?.match(/session=([^;]+)/)?.[1]; if (!token) return next(new Error('AUTH_REQUIRED')); const p:any = jwt.verify(token, config.jwtSecret); const u = await prisma.user.findUnique({where:{id:p.sub}}); if(!u) return next(new Error('AUTH_REQUIRED')); socket.data.userId=u.id; next(); } catch { next(new Error('AUTH_REQUIRED')); } });
  io.on('connection', socket => {
    socket.on('room:join', async ({gameId}) => { const game=await prisma.game.findUnique({where:{id:gameId}}); if(!game || ![game.whitePlayerId,game.blackPlayerId].includes(socket.data.userId)) return socket.emit('system:error',{code:'FORBIDDEN',message:'Bukan pemain game'}); socket.join(`game:${gameId}`); const r=await loadRuntime(gameId); socket.emit('game:snapshot',{gameId,fen:r.chess.fen(),pgn:r.chess.pgn(),turn:r.chess.turn(),whiteMs:r.whiteMs,blackMs:r.blackMs,status:game.status,result:game.result,resultReason:game.resultReason}); io.to(`game:${gameId}`).emit('presence:update',{userId:socket.data.userId,connected:true}); });
    socket.on('game:resync', async ({gameId}) => { const r=await loadRuntime(gameId); socket.emit('game:snapshot',{gameId,fen:r.chess.fen(),pgn:r.chess.pgn(),turn:r.chess.turn(),whiteMs:r.whiteMs,blackMs:r.blackMs}); });
  });
}
