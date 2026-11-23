export type PieceColor = "w" | "b"; // 'w' = User (Cyan/White), 'b' = Zoya (Pink/Black)
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type ChessBoard = (ChessPiece | null)[][]; // 8x8 [row 0..7][col 0..7], row 0 is Black (Zoya) home rank, row 7 is White (User) home rank

export interface ChessMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured?: ChessPiece | null;
  promotion?: PieceType;
  notation: string;
}

export const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
  },
  b: {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  },
};

export const PIECE_NAMES_HI: Record<PieceType, string> = {
  p: "Pawn (Pyada)",
  n: "Knight (Ghoda)",
  b: "Bishop (Oont)",
  r: "Rook (Haathi)",
  q: "Queen (Rani)",
  k: "King (Raja)",
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional Piece-Square Tables (from White's perspective, row 0 = rank 8, row 7 = rank 1)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 20, 25, 25, 20, 5, -30],
  [-30, 0, 20, 25, 25, 20, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 15, 15, 10, 0, -10],
  [-10, 10, 10, 15, 15, 10, 10, -10],
  [-10, 0, 15, 15, 15, 15, 0, -10],
  [-10, 15, 15, 15, 15, 15, 15, -10],
  [-10, 10, 0, 0, 0, 0, 10, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 5, 5, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 10, 10, 5, 0, -5],
  [0, 0, 5, 10, 10, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function getPiecePositionalBonus(
  type: PieceType,
  color: PieceColor,
  r: number,
  c: number
): number {
  const tableRow = color === "w" ? r : 7 - r;
  switch (type) {
    case "p":
      return PAWN_PST[tableRow][c];
    case "n":
      return KNIGHT_PST[tableRow][c];
    case "b":
      return BISHOP_PST[tableRow][c];
    case "r":
      return ROOK_PST[tableRow][c];
    case "q":
      return QUEEN_PST[tableRow][c];
    case "k":
      return KING_PST[tableRow][c];
  }
}

export function createInitialChessBoard(): ChessBoard {
  const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: ChessBoard = Array.from({ length: 8 }, () =>
    Array(8).fill(null)
  );

  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: backRank[c], color: "w" };
  }

  return board;
}

export function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function squareToCoord(row: number, col: number): string {
  const file = String.fromCharCode(97 + col); // a..h
  const rank = 8 - row; // 8..1
  return `${file}${rank}`;
}

export function coordToSquare(coord: string): { row: number; col: number } | null {
  const clean = coord.trim().toLowerCase();
  if (clean.length !== 2) return null;
  const col = clean.charCodeAt(0) - 97;
  const rank = Number(clean[1]);
  if (col < 0 || col > 7 || isNaN(rank) || rank < 1 || rank > 8) return null;
  return { row: 8 - rank, col };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/**
 * Generates pseudo-legal moves for a piece at (r, c)
 */
function getPseudoMovesForPiece(
  board: ChessBoard,
  r: number,
  c: number
): ChessMove[] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: ChessMove[] = [];
  const { type, color } = piece;
  const enemy: PieceColor = color === "w" ? "b" : "w";

  const addMove = (toR: number, toC: number) => {
    const target = board[toR][toC];
    const isPromotion =
      type === "p" && (toR === 0 || toR === 7);
    moves.push({
      fromRow: r,
      fromCol: c,
      toRow: toR,
      toCol: toC,
      captured: target,
      promotion: isPromotion ? "q" : undefined,
      notation: `${squareToCoord(r, c)}→${squareToCoord(toR, toC)}`,
    });
  };

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    // 1 step forward
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      addMove(r + dir, c);
      // 2 steps forward from start
      if (r === startRow && inBounds(r + dir * 2, c) && !board[r + dir * 2][c]) {
        addMove(r + dir * 2, c);
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc]!.color === enemy) {
        addMove(nr, nc);
      }
    }
  } else if (type === "n") {
    const jumps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of jumps) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color === enemy)) {
        addMove(nr, nc);
      }
    }
  } else if (type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color === enemy)) {
          addMove(nr, nc);
        }
      }
    }
  } else {
    // Sliding pieces: b, r, q
    const dirs: [number, number][] = [];
    if (type === "b" || type === "q") {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === "r" || type === "q") {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          addMove(nr, nc);
        } else {
          if (target.color === enemy) {
            addMove(nr, nc);
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  return moves;
}

export function applyChessMove(board: ChessBoard, move: ChessMove): ChessBoard {
  const next = cloneBoard(board);
  const moving = next[move.fromRow][move.fromCol];
  next[move.fromRow][move.fromCol] = null;
  if (moving) {
    next[move.toRow][move.toCol] = {
      type: move.promotion || moving.type,
      color: moving.color,
    };
  }
  return next;
}

export function isKingInCheck(board: ChessBoard, color: PieceColor): boolean {
  let kingR = -1;
  let kingC = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === "k") {
        kingR = r;
        kingC = c;
        break;
      }
    }
  }
  if (kingR === -1) return true;

  const enemy: PieceColor = color === "w" ? "b" : "w";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === enemy) {
        const moves = getPseudoMovesForPiece(board, r, c);
        if (moves.some((m) => m.toRow === kingR && m.toCol === kingC)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getLegalMovesForSquare(
  board: ChessBoard,
  r: number,
  c: number
): ChessMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudo = getPseudoMovesForPiece(board, r, c);
  return pseudo.filter((m) => {
    const next = applyChessMove(board, m);
    return !isKingInCheck(next, piece.color);
  });
}

export function getAllLegalMoves(
  board: ChessBoard,
  color: PieceColor
): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        all.push(...getLegalMovesForSquare(board, r, c));
      }
    }
  }
  return all;
}

function evaluateBoard(board: ChessBoard): number {
  // Positive score favors Zoya ('b'), negative favors User ('w')
  let score = 0;
  let blackBishops = 0;
  let whiteBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === "b") {
        if (p.color === "b") blackBishops++;
        else whiteBishops++;
      }
      const val =
        PIECE_VALUES[p.type] + getPiecePositionalBonus(p.type, p.color, r, c);
      score += p.color === "b" ? val : -val;
    }
  }

  // Bishop pair tactical bonus
  if (blackBishops >= 2) score += 35;
  if (whiteBishops >= 2) score -= 35;

  // Check pressure bonus
  if (isKingInCheck(board, "w")) score += 45;
  if (isKingInCheck(board, "b")) score -= 45;

  return score;
}

function orderMoves(board: ChessBoard, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.captured) {
      const attackerA = board[a.fromRow][a.fromCol];
      scoreA +=
        10 * PIECE_VALUES[a.captured.type] -
        (attackerA ? PIECE_VALUES[attackerA.type] / 10 : 0);
    }
    if (b.captured) {
      const attackerB = board[b.fromRow][b.fromCol];
      scoreB +=
        10 * PIECE_VALUES[b.captured.type] -
        (attackerB ? PIECE_VALUES[attackerB.type] / 10 : 0);
    }

    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;

    // Center control preference
    if (a.toRow >= 2 && a.toRow <= 5 && a.toCol >= 2 && a.toCol <= 5) {
      scoreA += 15;
    }
    if (b.toRow >= 2 && b.toRow <= 5 && b.toCol >= 2 && b.toCol <= 5) {
      scoreB += 15;
    }

    return scoreB - scoreA;
  });
}

function minimaxAlphaBeta(
  board: ChessBoard,
  depth: number,
  alpha: number,
  beta: number,
  maximizingZoya: boolean
): number {
  const currentColor: PieceColor = maximizingZoya ? "b" : "w";
  const legalMoves = getAllLegalMoves(board, currentColor);

  if (legalMoves.length === 0) {
    if (isKingInCheck(board, currentColor)) {
      return maximizingZoya ? -99999 - depth * 100 : 99999 + depth * 100;
    }
    return 0; // Stalemate
  }

  if (depth === 0) {
    return evaluateBoard(board);
  }

  const ordered = orderMoves(board, legalMoves);

  if (maximizingZoya) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const nextBoard = applyChessMove(board, move);
      const ev = minimaxAlphaBeta(nextBoard, depth - 1, alpha, beta, false);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      const nextBoard = applyChessMove(board, move);
      const ev = minimaxAlphaBeta(nextBoard, depth - 1, alpha, beta, true);
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function pickZoyaChessMove(
  board: ChessBoard,
  difficulty: "playful" | "pro"
): ChessMove | null {
  const legalMoves = getAllLegalMoves(board, "b");
  if (legalMoves.length === 0) return null;

  // Even in playful mode, always take immediate checkmate if available; otherwise 2-ply tactical search
  const searchDepth = difficulty === "pro" ? 3 : 2;
  const ordered = orderMoves(board, legalMoves);

  let bestMove = ordered[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of ordered) {
    const nextBoard = applyChessMove(board, move);
    const userReplies = getAllLegalMoves(nextBoard, "w");
    if (userReplies.length === 0 && isKingInCheck(nextBoard, "w")) {
      return move; // Instant checkmate!
    }

    const score =
      minimaxAlphaBeta(nextBoard, searchDepth - 1, alpha, beta, false) +
      (Math.random() * 6 - 3); // tiny tie-breaker so openings vary naturally

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) {
      alpha = score;
    }
  }

  return bestMove;
}
