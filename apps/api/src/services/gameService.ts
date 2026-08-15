import { Chess } from 'chess.js';
import { prisma } from '../prisma.js';
import { applyMove } from '../chess.js';

export type RuntimeGame = { chess: Chess; whiteMs: number; blackMs: number; lastAt: number; pendingDrawBy?: string };
const runtime = new Map<string, RuntimeGame>();
const locks = new Map<string, Promise<void>>();
export function getRuntime(id: string) { return runtime.get(id); }
export function initRuntime(id: string, fen: string, whiteMs: number, blackMs: number) { const r = { chess: new Chess(fen), whiteMs, blackMs, lastAt: Date.now() }; runtime.set(id, r); return r; }
function withLock(id: string, fn: () => Promise<void>) { const prev = locks.get(id) || Promise.resolve(); const next = prev.then(fn).finally(() => { if (locks.get(id) === next) locks.delete(id); }); locks.set(id, next); return next; }
export async function loadRuntime(gameId: string) {
  if (runtime.has(gameId)) return runtime.get(gameId)!;
  const g = await prisma.game.findUnique({ where: { id: gameId }, include: { moves: { orderBy: { ply: 'asc' } } } });
  if (!g) throw new Error('NOT_FOUND');
  const r = initRuntime(gameId, g.initialFen, g.initialSeconds * 1000, g.initialSeconds * 1000);
  for (const m of g.moves) r.chess.move({ from: m.moveUci.slice(0,2), to: m.moveUci.slice(2,4), promotion: m.moveUci.slice(4) || undefined });
  const last = g.moves.at(-1); if (last) { r.whiteMs = last.clockWhiteMs; r.blackMs = last.clockBlackMs; }
  return r;
}
export async function submitMove(gameId: string, userId: string, uci: string, promotion?: string) {
  let result: any;
  await withLock(gameId, async () => {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'ACTIVE') throw new Error('CONFLICT');
    const r = await loadRuntime(gameId);
    const side = r.chess.turn();
    const expectedPlayer = side === 'w' ? game.whitePlayerId : game.blackPlayerId;
    if (expectedPlayer !== userId) throw new Error('FORBIDDEN');
    const now = Date.now();
    const elapsed = now - r.lastAt;
    if (side === 'w') r.whiteMs -= elapsed; else r.blackMs -= elapsed;
    if ((side === 'w' ? r.whiteMs : r.blackMs) <= 0) {
      const res = side === 'w' ? 'BLACK' : 'WHITE';
      await finalizeGame(gameId, res as any, 'timeout', r);
      throw new Error('TIMEOUT');
    }
    const move = applyMove(r.chess, uci, promotion);
    r.lastAt = now;
    const ply = r.chess.history().length;
    if (side === 'w') r.whiteMs += game.incrementSeconds * 1000; else r.blackMs += game.incrementSeconds * 1000;
    await prisma.gameMove.create({ data: { gameId, ply, moveUci: uci + (promotion || ''), moveSan: move.san, fenAfter: r.chess.fen(), clockWhiteMs: Math.max(0,r.whiteMs), clockBlackMs: Math.max(0,r.blackMs) } });
    if (r.chess.isCheckmate()) await finalizeGame(gameId, side === 'w' ? 'WHITE' : 'BLACK', 'checkmate', r);
    else if (r.chess.isDraw() || r.chess.isStalemate()) await finalizeGame(gameId, 'DRAW', 'draw', r);
    result = { moveSan: move.san, fen: r.chess.fen(), pgn: r.chess.pgn(), turn: r.chess.turn(), whiteMs: r.whiteMs, blackMs: r.blackMs, finished: r.chess.isGameOver() };
  });
  return result;
}

export function chooseBotMove(r: RuntimeGame, level: string) {
  const moves = r.chess.moves({ verbose: true });
  if (!moves.length) return null;
  const ordered = moves.filter((m:any)=>m.captured || m.promotion);
  const pool = level === 'expert' && ordered.length ? ordered : moves;
  const m:any = pool[Math.floor(Math.random()*pool.length)];
  return { uci: m.from + m.to + (m.promotion || ''), promotion: m.promotion };
}
export async function submitBotMove(gameId: string, level='medium') {
  const r = await loadRuntime(gameId);
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.mode !== 'BOT' || game.status !== 'ACTIVE') return null;
  const selected = chooseBotMove(r, level); if (!selected) return null;
  const move = applyMove(r.chess, selected.uci, selected.promotion);
  const ply = r.chess.history().length; const now=Date.now();
  r.lastAt = now;
  await prisma.gameMove.create({ data: { gameId, ply, moveUci:selected.uci, moveSan:move.san, fenAfter:r.chess.fen(), clockWhiteMs:Math.max(0,r.whiteMs), clockBlackMs:Math.max(0,r.blackMs) } });
  if (r.chess.isCheckmate()) await finalizeGame(gameId,'BLACK','checkmate',r);
  else if (r.chess.isDraw() || r.chess.isStalemate()) await finalizeGame(gameId,'DRAW','draw',r);
  return { moveSan:move.san, uci:selected.uci, fen:r.chess.fen(), pgn:r.chess.pgn(), turn:r.chess.turn(), whiteMs:r.whiteMs, blackMs:r.blackMs, finished:r.chess.isGameOver() };
}
export async function finalizeGame(gameId: string, result: 'WHITE'|'BLACK'|'DRAW', reason: string, r: RuntimeGame) {
  const game = await prisma.game.findUnique({ where: { id: gameId } }); if (!game || game.status === 'FINISHED') return;
  const winnerId = result === 'WHITE' ? game.whitePlayerId : result === 'BLACK' ? game.blackPlayerId : null;
  await prisma.$transaction(async tx => {
    await tx.game.update({ where: { id: gameId }, data: { status: 'FINISHED', result, resultReason: reason, finalFen: r.chess.fen(), pgn: r.chess.pgn(), endedAt: new Date() } });
    if (game.mode === 'ONLINE' && game.whitePlayerId && game.blackPlayerId) {
      const [rw, rb] = await Promise.all([tx.rating.findUnique({where:{userId:game.whitePlayerId}}), tx.rating.findUnique({where:{userId:game.blackPlayerId}})]);
      const w = rw?.rating ?? 1200, b = rb?.rating ?? 1200; const ew = 1/(1+10**((b-w)/400)); const score = result==='DRAW'?0.5:result==='WHITE'?1:0;
      const nw = Math.round(w + 32*(score-ew)), nb = Math.round(b + 32*((1-score)-(1-ew)));
      await tx.rating.upsert({where:{userId:game.whitePlayerId},update:{rating:nw,peakRating:Math.max(w,nw)},create:{userId:game.whitePlayerId,rating:nw,peakRating:nw}});
      await tx.rating.upsert({where:{userId:game.blackPlayerId},update:{rating:nb,peakRating:Math.max(b,nb)},create:{userId:game.blackPlayerId,rating:nb,peakRating:nb}});
    }
  });
  runtime.delete(gameId);
}
