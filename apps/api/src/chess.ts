import { Chess } from 'chess.js';
export type GameState = {
  fen: string; pgn: string; turn: 'w'|'b'; isCheck: boolean; isCheckmate: boolean; isStalemate: boolean; isDraw: boolean;
};
export function stateOf(chess: Chess): GameState {
  return { fen: chess.fen(), pgn: chess.pgn(), turn: chess.turn(), isCheck: chess.isCheck(), isCheckmate: chess.isCheckmate(), isStalemate: chess.isStalemate(), isDraw: chess.isDraw() };
}
export function applyMove(chess: Chess, uci: string, promotion?: string) {
  const from = uci.slice(0,2), to = uci.slice(2,4);
  return chess.move({ from, to, promotion: promotion as any });
}
