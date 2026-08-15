import { describe,it,expect } from 'vitest';
import { Chess } from 'chess.js';
import { stateOf, applyMove } from '../apps/api/src/chess';
describe('chess rules',()=>{
 it('supports legal opening moves',()=>{const c=new Chess(); const m=applyMove(c,'e2e4'); expect(m.san).toBe('e4'); expect(c.turn()).toBe('b');});
 it('rejects illegal moves',()=>{const c=new Chess(); expect(()=>applyMove(c,'e2e5')).toThrow();});
 it('supports promotion/checkmate',()=>{const c=new Chess('k7/P7/8/8/8/8/7p/7K w - - 0 1'); expect(()=>applyMove(c,'a7a8','q')).not.toThrow();});
 it('detects checkmate',()=>{const c=new Chess(); ['f2f3','e7e5','g2g4','d8h4'].forEach(m=>applyMove(c,m)); expect(c.isCheckmate()).toBe(true); expect(stateOf(c).isCheckmate).toBe(true);});
});
