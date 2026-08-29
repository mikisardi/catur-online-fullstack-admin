import { Chess, Square } from 'chess.js';
import { useMemo, useState } from 'react';

type BoardProps = {
  fen: string;
  onMove: (uci: string) => Promise<void> | void;
  playerColor: 'WHITE' | 'BLACK';
};

const pieceMap: Record<string, string> = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function Board({ fen, onMove, playerColor }: BoardProps) {
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const squares = useMemo(() => {
  const result: string[] = [];

  const ranks =
    playerColor === 'WHITE'
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8];

  const boardFiles =
    playerColor === 'WHITE'
      ? files
      : [...files].reverse();

  for (const rank of ranks) {
    for (const file of boardFiles) {
      result.push(`${file}${rank}`);
    }
  }

  return result;
  }, [playerColor]);

  const handleSquareClick = async (square: string) => {
    if (submitting) return;

    const piece = chess.get(square as Square);

    // Pilih bidak sendiri
    if (!selected) {
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
      }
      return;
    }

    // Klik kotak yang sama → batal pilih
    if (selected === square) {
      setSelected(null);
      return;
    }

    // Jika klik bidak sendiri yang lain → pindah pilihan
    if (piece && piece.color === chess.turn()) {
      setSelected(square);
      return;
    }

    const from = selected as Square;
    const to = square as Square;

    // Validasi lokal hanya untuk mendapatkan move yang benar.
    // Jangan mengubah state server/local secara permanen.
    const testGame = new Chess(chess.fen());

    try {
      const move = testGame.move({
        from,
        to,
        promotion: 'q',
      });

      const uci = `${move.from}${move.to}${move.promotion ?? ''}`;

      setSubmitting(true);
      setSelected(null);

      await onMove(uci);
    } catch {
      setSelected(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="board" aria-label="Papan catur">
      {squares.map((square) => {
        const piece = chess.get(square as Square);

        const fileIndex = square.charCodeAt(0) - 97;
        const rank = Number(square[1]);

        const isDark = (fileIndex + rank) % 2 === 1;
        const isSelected = selected === square;

        return (
          <button
            key={square}
            type="button"
            className={`sq ${isDark ? 'dark' : 'light'} ${
              isSelected ? 'selected' : ''
            }`}
            onClick={() => handleSquareClick(square)}
            aria-label={square}
          >
            {piece && (
              <span className={`piece ${piece.color === 'w' ? 'whitepiece' : 'blackpiece'}`}>
                {pieceMap[piece.type]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
