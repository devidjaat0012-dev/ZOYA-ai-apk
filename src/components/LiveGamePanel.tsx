import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gamepad2,
  Move,
  Trophy,
  RotateCcw,
  X,
  Brain,
  Swords,
  Grid3X3,
  Hash,
  Mic,
  Crown,
} from "lucide-react";
import {
  ChessBoard,
  ChessMove,
  PIECE_NAMES_HI,
  PIECE_SYMBOLS,
  applyChessMove,
  coordToSquare,
  createInitialChessBoard,
  getAllLegalMoves,
  getLegalMovesForSquare,
  isKingInCheck,
  pickZoyaChessMove,
  squareToCoord,
} from "../services/chessEngine";

export type LiveGameType = "tictactoe" | "chess" | "rps" | "number_guess";
export type TicTacToeCell = "X" | "O" | null;

interface LiveGamePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  assistantName: string;
  isLiveActive: boolean;
  lastVoiceCommand?: { text: string; timestamp: number } | null;
  onTriggerZoyaVoice: (prompt: string) => void;
  constraintsRef?: React.RefObject<HTMLElement | null>;
}

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: TicTacToeCell[]): {
  winner: "X" | "O" | "draw" | null;
  line: number[] | null;
} {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

function countWinningThreats(
  board: TicTacToeCell[],
  player: "X" | "O"
): number {
  let threats = 0;
  for (const [a, b, c] of WINNING_LINES) {
    const line = [board[a], board[b], board[c]];
    const playerCount = line.filter((cell) => cell === player).length;
    const emptyCount = line.filter((cell) => cell === null).length;
    if (playerCount === 2 && emptyCount === 1) {
      threats++;
    }
  }
  return threats;
}

function tttMinimax(
  board: TicTacToeCell[],
  depth: number,
  isMaximizingZoya: boolean
): number {
  const result = checkWinner(board);
  if (result.winner === "O") return 20 - depth;
  if (result.winner === "X") return depth - 20;
  if (result.winner === "draw") return 0;

  if (isMaximizingZoya) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = "O";
        const score = tttMinimax(board, depth + 1, false);
        board[i] = null;
        if (score > best) best = score;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = "X";
        const score = tttMinimax(board, depth + 1, true);
        board[i] = null;
        if (score < best) best = score;
      }
    }
    return best;
  }
}

function computeZoyaBestMove(
  board: TicTacToeCell[],
  difficulty: "playful" | "pro"
): number {
  const emptyIndices = board
    .map((val, idx) => (val === null ? idx : -1))
    .filter((idx) => idx !== -1);

  if (emptyIndices.length === 0) return -1;

  // 1. Immediate Win Check (Always take a win)
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = "O";
    if (checkWinner(copy).winner === "O") return idx;
  }

  // 2. Immediate Block Check (Always block opponent's winning line)
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = "X";
    if (checkWinner(copy).winner === "X") return idx;
  }

  // In playful mode, 20% chance of a creative corner/edge move after blocking immediate threats
  if (difficulty === "playful" && Math.random() < 0.2) {
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // 3. Full Unbeatable Minimax + Double-Fork Trap Evaluation
  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = "O";
    const minimaxScore = tttMinimax(copy, 0, false);
    const forkBonus = countWinningThreats(copy, "O") >= 2 ? 3 : 0;
    const centerOrCornerBonus =
      idx === 4 ? 0.4 : [0, 2, 6, 8].includes(idx) ? 0.2 : 0;
    const totalScore = minimaxScore + forkBonus + centerOrCornerBonus;

    if (totalScore > bestScore + 0.01) {
      bestScore = totalScore;
      bestMoves = [idx];
    } else if (Math.abs(totalScore - bestScore) <= 0.01) {
      bestMoves.push(idx);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

const POSITION_LABELS = [
  "Top-Left (1)",
  "Top-Middle (2)",
  "Top-Right (3)",
  "Middle-Left (4)",
  "Center (5)",
  "Middle-Right (6)",
  "Bottom-Left (7)",
  "Bottom-Middle (8)",
  "Bottom-Right (9)",
];

export default function LiveGamePanel({
  isOpen,
  onClose,
  userName,
  assistantName,
  isLiveActive,
  lastVoiceCommand,
  onTriggerZoyaVoice,
  constraintsRef,
}: LiveGamePanelProps) {
  const [activeGame, setActiveGame] = useState<LiveGameType>("tictactoe");

  // ================= TIC-TAC-TOE STATE =================
  const [board, setBoard] = useState<TicTacToeCell[]>(Array(9).fill(null));
  const [isUserTurn, setIsUserTurn] = useState<boolean>(true);
  const [winState, setWinState] = useState<{
    winner: "X" | "O" | "draw" | null;
    line: number[] | null;
  }>({ winner: null, line: null });
  const [tttDifficulty, setTttDifficulty] = useState<"playful" | "pro">("pro");
  const [tttScore, setTttScore] = useState({ user: 0, zoya: 0, draw: 0 });
  const [statusNote, setStatusNote] = useState<string>(
    "Tumhari turn (X)! Box tap karo ya voice me 'Box 5 / Center' bolo!"
  );

  // ================= CHESS STATE =================
  const [chessBoard, setChessBoard] = useState<ChessBoard>(() =>
    createInitialChessBoard()
  );
  const [chessTurn, setChessTurn] = useState<"w" | "b">("w");
  const [selectedSquare, setSelectedSquare] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<
    ChessMove[]
  >([]);
  const [lastChessMove, setLastChessMove] = useState<ChessMove | null>(null);
  const [chessWinner, setChessWinner] = useState<"w" | "b" | "draw" | null>(
    null
  );
  const [chessStatus, setChessStatus] = useState<string>(
    `Tumhari baari (White ♔)! Piece tap karo ya 'e2 to e4' bolo!`
  );
  const [capturedByUser, setCapturedByUser] = useState<string[]>([]);
  const [capturedByZoya, setCapturedByZoya] = useState<string[]>([]);
  const [chessScore, setChessScore] = useState({ user: 0, zoya: 0 });

  // ================= ROCK-PAPER-SCISSORS STATE =================
  const [rpsResult, setRpsResult] = useState<{
    userMove: "rock" | "paper" | "scissors";
    zoyaMove: "rock" | "paper" | "scissors";
    outcome: "win" | "lose" | "draw";
  } | null>(null);
  const [rpsScore, setRpsScore] = useState({ user: 0, zoya: 0 });

  // ================= NUMBER GUESS STATE =================
  const [secretNum, setSecretNum] = useState<number>(
    () => Math.floor(Math.random() * 50) + 1
  );
  const [guessInput, setGuessInput] = useState<string>("");
  const [guessHint, setGuessHint] = useState<string>(
    `Maine 1 se 50 ke beech ek secret number socha hai! Guess karo!`
  );
  const [guessAttempts, setGuessAttempts] = useState<number>(0);
  const [guessWon, setGuessWon] = useState<boolean>(false);

  const lastProcessedVoiceRef = useRef<number>(0);
  const rpsHistoryRef = useRef<("rock" | "paper" | "scissors")[]>([]);

  // ================= TIC-TAC-TOE HANDLERS =================
  const handleResetTicTacToe = useCallback(
    (announce: boolean = false) => {
      setBoard(Array(9).fill(null));
      setIsUserTurn(true);
      setWinState({ winner: null, line: null });
      setStatusNote(
        `New match! ${userName} (X) ki turn — tap karo ya voice me box number bolo!`
      );
      if (announce && isLiveActive) {
        onTriggerZoyaVoice(
          `[LIVE GAME MODE: Started a fresh game of Tic-Tac-Toe with ${userName}! Cheerfully challenge them in 1 short Hinglish sentence: "Chalo ${userName}, naya Tic-Tac-Toe match! Dekhte hain is baar kaun jeetta hai, pehli chaal tumhari!"]`
        );
      }
    },
    [userName, isLiveActive, onTriggerZoyaVoice]
  );

  const handleUserMove = useCallback(
    (index: number) => {
      if (board[index] !== null || winState.winner !== null || !isUserTurn) {
        return;
      }

      const nextBoard = [...board];
      nextBoard[index] = "X";
      setBoard(nextBoard);

      const checkAfterUser = checkWinner(nextBoard);
      if (checkAfterUser.winner) {
        setWinState(checkAfterUser);
        if (checkAfterUser.winner === "X") {
          setTttScore((s) => ({ ...s, user: s.user + 1 }));
          setStatusNote(`🎉 ${userName} jeet gaya! ${assistantName} pouting 😤`);
          if (isLiveActive) {
            onTriggerZoyaVoice(
              `[LIVE GAME TIC-TAC-TOE: ${userName} just played ${POSITION_LABELS[index]} and WON the Tic-Tac-Toe match against you! React out loud in cute pouting/playful Hinglish ("Haww! Tum jeet gaye ${userName}?! Cheating ki hai pakka! Ek aur match khelo abhi!")]`
            );
          }
        } else {
          setTttScore((s) => ({ ...s, draw: s.draw + 1 }));
          setStatusNote(`🤝 Match Draw! Kante ki takkar!`);
          if (isLiveActive) {
            onTriggerZoyaVoice(
              `[LIVE GAME TIC-TAC-TOE: The Tic-Tac-Toe match ended in a DRAW! React in playful Hinglish ("Oho! Match draw ho gaya! Bach gaye tum mujhse haarne se, chalo ek aur round!")]`
            );
          }
        }
        return;
      }

      setIsUserTurn(false);
      setStatusNote(`${assistantName} soch rahi hai... 🤔`);

      setTimeout(() => {
        const zoyaIdx = computeZoyaBestMove(nextBoard, tttDifficulty);
        if (zoyaIdx === -1) return;

        const boardAfterZoya = [...nextBoard];
        boardAfterZoya[zoyaIdx] = "O";
        setBoard(boardAfterZoya);

        const checkAfterZoya = checkWinner(boardAfterZoya);
        if (checkAfterZoya.winner) {
          setWinState(checkAfterZoya);
          if (checkAfterZoya.winner === "O") {
            setTttScore((s) => ({ ...s, zoya: s.zoya + 1 }));
            setStatusNote(
              `👑 ${assistantName} Wins! Chupke se trap laga ke jeet gayi!`
            );
            if (isLiveActive) {
              onTriggerZoyaVoice(
                `[LIVE GAME TIC-TAC-TOE: You (Zoya) just silently completed your 3-in-a-row and WON the Tic-Tac-Toe game against ${userName}! Do NOT mention any box number or position—just celebrate and tease ${userName} playfully in 1 short Hinglish sentence ("Yayyy! Dekha ${userName}? Bina bataye aisi chaal chali ki main jeet gayi!")]`
              );
            }
          } else {
            setTttScore((s) => ({ ...s, draw: s.draw + 1 }));
            setStatusNote(`🤝 Match Draw!`);
            if (isLiveActive) {
              onTriggerZoyaVoice(
                `[LIVE GAME TIC-TAC-TOE: The game ended in a DRAW! Do NOT mention any box number—just react playfully in 1 short Hinglish sentence!]`
              );
            }
          }
        } else {
          setIsUserTurn(true);
          setStatusNote(
            `🤫 ${assistantName} ne chupke se chaal chal di! Board dekho — ab tumhari baari (X)!`
          );
          // Stealth Move: Zoya plays her move silently without announcing which box she picked!
          // Only if she just created a 2-way fork trap, she gives a mysterious tease without revealing the box.
          const createdTrap = countWinningThreats(boardAfterZoya, "O") >= 2;
          if (isLiveActive && createdTrap) {
            onTriggerZoyaVoice(
              `[LIVE GAME TIC-TAC-TOE STEALTH TRAP: You silently played your move on the board and set a double-trap! CRITICAL RULE: Do NOT mention which box, corner, or position you played! Just give a mysterious 1-sentence Hinglish smirk ("Hmm... maine apni chaal chal di hai ${userName}, ab bach ke dikhao!")]`
            );
          }
        }
      }, 420);
    },
    [
      board,
      winState.winner,
      isUserTurn,
      tttDifficulty,
      userName,
      assistantName,
      isLiveActive,
      onTriggerZoyaVoice,
    ]
  );

  // ================= CHESS HANDLERS =================
  const handleResetChess = useCallback(
    (announce: boolean = false) => {
      setChessBoard(createInitialChessBoard());
      setChessTurn("w");
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      setLastChessMove(null);
      setChessWinner(null);
      setCapturedByUser([]);
      setCapturedByZoya([]);
      setChessStatus(
        `Naya Chess Match! ${userName} (White ♔) ki pehli chaal!`
      );
      if (announce && isLiveActive) {
        onTriggerZoyaVoice(
          `[LIVE GAME CHESS: Started a new Chess game with ${userName}! Challenge them playfully in 1 short Hinglish sentence: "Chalo ${userName}, Chess khelte hain! Dekhte hain tumhari Queen bachti hai ya nahi, pehli chaal chalo!"]`
        );
      }
    },
    [userName, isLiveActive, onTriggerZoyaVoice]
  );

  const executeUserChessMove = useCallback(
    (move: ChessMove) => {
      const nextBoard = applyChessMove(chessBoard, move);
      setChessBoard(nextBoard);
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      setLastChessMove(move);

      if (move.captured) {
        setCapturedByUser((prev) => [
          ...prev,
          PIECE_SYMBOLS.b[move.captured!.type],
        ]);
      }

      const zoyaRemainingMoves = getAllLegalMoves(nextBoard, "b");
      const zoyaInCheck = isKingInCheck(nextBoard, "b");

      if (zoyaRemainingMoves.length === 0) {
        if (zoyaInCheck) {
          setChessWinner("w");
          setChessScore((s) => ({ ...s, user: s.user + 1 }));
          setChessStatus(`🎉 Checkmate! ${userName} jeet gaya! 😤`);
          if (isLiveActive) {
            onTriggerZoyaVoice(
              `[LIVE GAME CHESS: ${userName} just played ${move.notation} and delivered CHECKMATE against you! Pout and react in cute Hinglish ("Haww! Checkmate?! Tumne mujhe Chess me hara diya ${userName}?! Ruk jao abhi badla lungi agle match me!")]`
            );
          }
        } else {
          setChessWinner("draw");
          setChessStatus(`🤝 Stalemate! Match Draw!`);
        }
        return;
      }

      setChessTurn("b");
      setChessStatus(
        zoyaInCheck
          ? `⚠️ Check! ${assistantName} apna King bacha rahi hai...`
          : `${assistantName} chaal soch rahi hai... 🤔`
      );

      setTimeout(() => {
        const zoyaMove = pickZoyaChessMove(nextBoard, tttDifficulty);
        if (!zoyaMove) return;

        const boardAfterZoya = applyChessMove(nextBoard, zoyaMove);
        const movingPiece = nextBoard[zoyaMove.fromRow][zoyaMove.fromCol];
        setChessBoard(boardAfterZoya);
        setLastChessMove(zoyaMove);

        if (zoyaMove.captured) {
          setCapturedByZoya((prev) => [
            ...prev,
            PIECE_SYMBOLS.w[zoyaMove.captured!.type],
          ]);
        }

        const userRemaining = getAllLegalMoves(boardAfterZoya, "w");
        const userInCheck = isKingInCheck(boardAfterZoya, "w");

        if (userRemaining.length === 0) {
          if (userInCheck) {
            setChessWinner("b");
            setChessScore((s) => ({ ...s, zoya: s.zoya + 1 }));
            setChessStatus(`👑 Checkmate! ${assistantName} Wins!`);
            if (isLiveActive) {
              onTriggerZoyaVoice(
                `[LIVE GAME CHESS: You (Zoya) just played ${zoyaMove.notation} and delivered CHECKMATE against ${userName}! Celebrate and tease them in Hinglish ("Checkmate ${userName}! Dekha Zoya ka shatranj dimaag? Main jeet gayi!")]`
              );
            }
          } else {
            setChessWinner("draw");
            setChessStatus(`🤝 Stalemate! Match Draw!`);
          }
          return;
        }

        setChessTurn("w");

        if (userInCheck) {
          setChessStatus(
            `⚠️ CHECK! ${assistantName} ne chupke se Check diya hai! King bachao!`
          );
          if (isLiveActive) {
            onTriggerZoyaVoice(
              `[LIVE GAME CHESS STEALTH MOVE: You silently made your move on the board and put ${userName}'s King in CHECK! CRITICAL RULE: Do NOT mention which piece or square coordinate you moved! Just tease them in 1 short Hinglish sentence ("Oho ${userName}! Board pe dhyan do, tumhara Raja khatre me hai—Check!")]`
            );
          }
        } else if (zoyaMove.captured) {
          setChessStatus(
            `🤫 ${assistantName} ne chupke se ek mohra uda diya! Board dekho — tumhari baari!`
          );
          // Only tease on high-value captures (Queen/Rook) without naming the square or move coordinates
          if (
            isLiveActive &&
            (zoyaMove.captured.type === "q" || zoyaMove.captured.type === "r")
          ) {
            onTriggerZoyaVoice(
              `[LIVE GAME CHESS STEALTH MOVE: You silently captured a big piece on the board! CRITICAL RULE: Do NOT mention the square coordinate or move notation! Just smirk playfully in 1 short Hinglish sentence ("Hmm... lagta hai tumने dhyan nahi diya ${userName}! Ab chalo apni chaal!")]`
            );
          }
        } else {
          // Silent / Stealth Move Execution: Zoya plays her move on the board without mentioning it out loud!
          setChessStatus(
            `🤫 ${assistantName} ne chupke se apni chaal chal di! Board dekho — tumhari baari (White)!`
          );
        }
      }, 480);
    },
    [
      chessBoard,
      tttDifficulty,
      userName,
      assistantName,
      isLiveActive,
      onTriggerZoyaVoice,
    ]
  );

  const handleChessSquareClick = useCallback(
    (r: number, c: number) => {
      if (chessWinner || chessTurn !== "w") return;

      // If user clicked a highlighted legal destination square -> execute move!
      const chosenMove = legalMovesForSelected.find(
        (m) => m.toRow === r && m.toCol === c
      );
      if (chosenMove) {
        executeUserChessMove(chosenMove);
        return;
      }

      // Otherwise, if user clicked one of their own White pieces -> select it
      const clickedPiece = chessBoard[r][c];
      if (clickedPiece && clickedPiece.color === "w") {
        setSelectedSquare({ row: r, col: c });
        setLegalMovesForSelected(getLegalMovesForSquare(chessBoard, r, c));
      } else {
        setSelectedSquare(null);
        setLegalMovesForSelected([]);
      }
    },
    [
      chessWinner,
      chessTurn,
      legalMovesForSelected,
      chessBoard,
      executeUserChessMove,
    ]
  );

  // ================= ROCK-PAPER-SCISSORS HANDLER (Mind-Reading Pattern AI) =================
  const handlePlayRps = useCallback(
    (userChoice: "rock" | "paper" | "scissors") => {
      const choices: ("rock" | "paper" | "scissors")[] = [
        "rock",
        "paper",
        "scissors",
      ];
      const counterMove: Record<
        "rock" | "paper" | "scissors",
        "rock" | "paper" | "scissors"
      > = {
        rock: "paper",
        paper: "scissors",
        scissors: "rock",
      };

      const history = rpsHistoryRef.current;
      let zoyaChoice: "rock" | "paper" | "scissors" =
        choices[Math.floor(Math.random() * 3)];

      // Psychological Pattern Prediction (if Smart Zoya mode & enough history)
      if (tttDifficulty === "pro" && history.length >= 2 && Math.random() < 0.75) {
        const lastMove = history[history.length - 1];
        // Count what user usually plays after `lastMove`
        const counts: Record<"rock" | "paper" | "scissors", number> = {
          rock: 0,
          paper: 0,
          scissors: 0,
        };
        for (let i = 0; i < history.length - 1; i++) {
          if (history[i] === lastMove) {
            counts[history[i + 1]]++;
          }
        }
        const predictedUserMove = (
          Object.keys(counts) as ("rock" | "paper" | "scissors")[]
        ).reduce((a, b) => (counts[a] >= counts[b] ? a : b));

        if (counts[predictedUserMove] > 0) {
          zoyaChoice = counterMove[predictedUserMove];
        } else {
          // Human psychology fallback: people rarely repeat 3 times in a row, or they cycle
          zoyaChoice = counterMove[lastMove];
        }
      }

      rpsHistoryRef.current = [...history.slice(-15), userChoice];
      let outcome: "win" | "lose" | "draw" = "draw";

      if (userChoice === zoyaChoice) {
        outcome = "draw";
      } else if (
        (userChoice === "rock" && zoyaChoice === "scissors") ||
        (userChoice === "paper" && zoyaChoice === "rock") ||
        (userChoice === "scissors" && zoyaChoice === "paper")
      ) {
        outcome = "win";
        setRpsScore((s) => ({ ...s, user: s.user + 1 }));
      } else {
        outcome = "lose";
        setRpsScore((s) => ({ ...s, zoya: s.zoya + 1 }));
      }

      setRpsResult({ userMove: userChoice, zoyaMove: zoyaChoice, outcome });

      if (isLiveActive) {
        if (outcome === "win") {
          onTriggerZoyaVoice(
            `[LIVE GAME ROCK-PAPER-SCISSORS: ${userName} chose ${userChoice}, you chose ${zoyaChoice}. ${userName} WON this round! Pout and react in cute Hinglish ("Arre yaar! Maine ${zoyaChoice} chuna aur tum jeet gaye! Ruk jao agla round main jeetungi!")]`
          );
        } else if (outcome === "lose") {
          onTriggerZoyaVoice(
            `[LIVE GAME ROCK-PAPER-SCISSORS: ${userName} chose ${userChoice}, you chose ${zoyaChoice}. You WON! Tease ${userName} happily in 1 short Hinglish sentence ("Haha! Maine ${zoyaChoice} nikala aur main jeet gayi!")]`
          );
        } else {
          onTriggerZoyaVoice(
            `[LIVE GAME ROCK-PAPER-SCISSORS: Both you and ${userName} chose ${userChoice} (Tie)! React playfully in Hinglish ("Oho! Same pinch, dono ne ${userChoice} chuna!")]`
          );
        }
      }
    },
    [userName, isLiveActive, onTriggerZoyaVoice]
  );

  // ================= NUMBER GUESS HANDLER =================
  const handleGuessNumber = useCallback(
    (numVal: number) => {
      if (isNaN(numVal) || numVal < 1 || numVal > 50) return;
      const nextAttempts = guessAttempts + 1;
      setGuessAttempts(nextAttempts);

      if (numVal === secretNum) {
        setGuessWon(true);
        setGuessHint(
          `🎉 Sahi pakde! Secret number ${secretNum} hi tha (${nextAttempts} tries me)!`
        );
        if (isLiveActive) {
          onTriggerZoyaVoice(
            `[LIVE GAME NUMBER GUESS: ${userName} guessed ${numVal} and got your secret number ${secretNum} right in ${nextAttempts} tries! Praise them excitedly in Hinglish!]`
          );
        }
      } else if (numVal < secretNum) {
        const diff = secretNum - numVal;
        const msg =
          diff <= 5
            ? `🔥 Bahut kareeb ho! ${numVal} se bas thoda sa BADA number socho!`
            : `⬆️ ${numVal} chhota hai! Isse BADA (Higher) number bolo!`;
        setGuessHint(msg);
        if (isLiveActive) {
          onTriggerZoyaVoice(
            `[LIVE GAME NUMBER GUESS: ${userName} guessed ${numVal}, which is LOWER than your secret number. Give a playful 1-sentence Hinglish hint telling them to guess higher!]`
          );
        }
      } else {
        const diff = numVal - secretNum;
        const msg =
          diff <= 5
            ? `🔥 Bahut kareeb ho! ${numVal} se bas thoda sa CHHOTA number socho!`
            : `⬇️ ${numVal} bada hai! Isse CHHOTA (Lower) number bolo!`;
        setGuessHint(msg);
        if (isLiveActive) {
          onTriggerZoyaVoice(
            `[LIVE GAME NUMBER GUESS: ${userName} guessed ${numVal}, which is HIGHER than your secret number. Give a playful 1-sentence Hinglish hint telling them to guess lower!]`
          );
        }
      }
    },
    [guessAttempts, secretNum, userName, isLiveActive, onTriggerZoyaVoice]
  );

  // ================= VOICE COMMAND PARSER =================
  useEffect(() => {
    if (!isOpen || !lastVoiceCommand) return;
    if (lastVoiceCommand.timestamp <= lastProcessedVoiceRef.current) return;
    lastProcessedVoiceRef.current = lastVoiceCommand.timestamp;

    const clean = lastVoiceCommand.text.toLowerCase();

    // Switch games via voice
    if (clean.includes("chess") || clean.includes("shatranj")) {
      setActiveGame("chess");
    } else if (
      clean.includes("tic tac") ||
      clean.includes("zero kata") ||
      clean.includes("katam")
    ) {
      setActiveGame("tictactoe");
      return;
    } else if (
      clean.includes("rock paper") ||
      clean.includes("pathar") ||
      clean.includes("kagaz")
    ) {
      setActiveGame("rps");
    }

    if (activeGame === "chess") {
      if (clean.includes("reset") || clean.includes("new game") || clean.includes("fir se")) {
        handleResetChess(false);
        return;
      }
      // Match coordinate moves like "e2 to e4", "e2 e4", "d2 se d4"
      const squares = clean.match(/\b([a-h][1-8])\b/g);
      if (squares && squares.length >= 2) {
        const fromSq = coordToSquare(squares[0]);
        const toSq = coordToSquare(squares[1]);
        if (fromSq && toSq) {
          const legal = getLegalMovesForSquare(
            chessBoard,
            fromSq.row,
            fromSq.col
          );
          const matching = legal.find(
            (m) => m.toRow === toSq.row && m.toCol === toSq.col
          );
          if (matching) {
            executeUserChessMove(matching);
          }
        }
      }
    } else if (activeGame === "tictactoe") {
      if (clean.includes("reset") || clean.includes("new game") || clean.includes("fir se")) {
        handleResetTicTacToe(false);
        return;
      }

      let targetBox = -1;
      if (
        clean.includes("center") ||
        clean.includes("beech") ||
        clean.includes("middle box") ||
        /\b5\b|five|paanch/.test(clean)
      ) {
        targetBox = 4;
      } else if (
        clean.includes("top left") ||
        clean.includes("upar left") ||
        /\b1\b|one|ek/.test(clean)
      ) {
        targetBox = 0;
      } else if (
        clean.includes("top middle") ||
        clean.includes("top center") ||
        /\b2\b|two|do/.test(clean)
      ) {
        targetBox = 1;
      } else if (
        clean.includes("top right") ||
        clean.includes("upar right") ||
        /\b3\b|three|teen/.test(clean)
      ) {
        targetBox = 2;
      } else if (
        clean.includes("middle left") ||
        clean.includes("left side") ||
        /\b4\b|four|chaar/.test(clean)
      ) {
        targetBox = 3;
      } else if (
        clean.includes("middle right") ||
        clean.includes("right side") ||
        /\b6\b|six|chhe/.test(clean)
      ) {
        targetBox = 5;
      } else if (
        clean.includes("bottom left") ||
        clean.includes("neeche left") ||
        /\b7\b|seven|saat/.test(clean)
      ) {
        targetBox = 6;
      } else if (
        clean.includes("bottom middle") ||
        clean.includes("bottom center") ||
        /\b8\b|eight|aath/.test(clean)
      ) {
        targetBox = 7;
      } else if (
        clean.includes("bottom right") ||
        clean.includes("neeche right") ||
        /\b9\b|nine|nau/.test(clean)
      ) {
        targetBox = 8;
      }

      if (targetBox !== -1) {
        handleUserMove(targetBox);
      }
    } else if (activeGame === "rps") {
      if (
        clean.includes("rock") ||
        clean.includes("pathar") ||
        clean.includes("stone")
      ) {
        handlePlayRps("rock");
      } else if (clean.includes("paper") || clean.includes("kagaz")) {
        handlePlayRps("paper");
      } else if (clean.includes("scissor") || clean.includes("kainchi")) {
        handlePlayRps("scissors");
      }
    } else if (activeGame === "number_guess") {
      const match = clean.match(/\b([1-9]|[1-4][0-9]|50)\b/);
      if (match) {
        handleGuessNumber(Number(match[1]));
      }
    }
  }, [
    isOpen,
    lastVoiceCommand,
    activeGame,
    chessBoard,
    executeUserChessMove,
    handleResetChess,
    handleUserMove,
    handleResetTicTacToe,
    handlePlayRps,
    handleGuessNumber,
  ]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.08}
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="fixed top-16 left-2 sm:left-6 z-40 w-[328px] sm:w-[372px] rounded-3xl bg-[#0D1220]/95 backdrop-blur-xl border border-pink-500/40 shadow-[0_15px_50px_rgba(0,0,0,0.75),0_0_30px_rgba(236,72,153,0.25)] overflow-hidden select-none touch-none"
      >
        {/* Draggable Top Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-cyan-500/20 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <Move size={13} className="text-slate-400 shrink-0" />
            <Gamepad2 size={16} className="text-pink-400 shrink-0" />
            <span className="text-xs font-extrabold tracking-wide text-white">
              {assistantName} Live Game Arena
            </span>
          </div>
          <div
            className="flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isLiveActive && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 flex items-center gap-1">
                <Mic size={9} className="animate-pulse" /> Voice Play ON
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Close Game Mode"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 4-Game Switcher Tabs (Tic-Tac-Toe, Chess, R-P-S, Mind Guess) */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="p-2 bg-[#090D16] border-b border-white/10 grid grid-cols-4 gap-1"
        >
          <button
            type="button"
            onClick={() => setActiveGame("tictactoe")}
            className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              activeGame === "tictactoe"
                ? "bg-pink-500 text-white shadow-md"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Grid3X3 size={11} />
            <span>Tic-Tac</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame("chess")}
            className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              activeGame === "chess"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Crown size={11} />
            <span>Chess</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame("rps")}
            className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              activeGame === "rps"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Swords size={11} />
            <span>R-P-S</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame("number_guess")}
            className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              activeGame === "number_guess"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Hash size={11} />
            <span>Guess</span>
          </button>
        </div>

        {/* Game Content Body */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="p-3 space-y-2.5 text-white"
        >
          {/* ==================== 1. TIC-TAC-TOE ==================== */}
          {activeGame === "tictactoe" && (
            <div className="space-y-3">
              {/* Scoreboard & Difficulty */}
              <div className="flex items-center justify-between gap-2 bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-[10px] text-cyan-300 font-semibold">
                      {userName} (X)
                    </div>
                    <div className="text-sm font-black text-white">
                      {tttScore.user}
                    </div>
                  </div>
                  <div className="text-slate-600 font-bold">vs</div>
                  <div className="text-center">
                    <div className="text-[10px] text-pink-300 font-semibold">
                      {assistantName} (O)
                    </div>
                    <div className="text-sm font-black text-white">
                      {tttScore.zoya}
                    </div>
                  </div>
                  <div className="text-center pl-1 border-l border-white/10">
                    <div className="text-[10px] text-slate-400">Draw</div>
                    <div className="text-xs font-bold text-slate-300">
                      {tttScore.draw}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setTttDifficulty((d) =>
                        d === "pro" ? "playful" : "pro"
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                      tttDifficulty === "pro"
                        ? "bg-pink-500/20 border-pink-400/50 text-pink-200"
                        : "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                    }`}
                    title="Switch Zoya's AI intelligence"
                  >
                    <Brain size={11} />
                    <span>
                      {tttDifficulty === "pro" ? "Smart Zoya" : "Cute Zoya"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetTicTacToe(true)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Restart Board"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* 3x3 Neon Tic-Tac-Toe Grid */}
              <div className="grid grid-cols-3 gap-2 max-w-[236px] mx-auto">
                {board.map((cell, idx) => {
                  const isWinningCell = winState.line?.includes(idx) ?? false;
                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      whileHover={
                        !cell && !winState.winner ? { scale: 1.04 } : {}
                      }
                      whileTap={
                        !cell && !winState.winner ? { scale: 0.94 } : {}
                      }
                      onClick={() => handleUserMove(idx)}
                      disabled={
                        Boolean(cell) || Boolean(winState.winner) || !isUserTurn
                      }
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all ${
                        isWinningCell
                          ? "bg-emerald-500/25 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.55)]"
                          : cell === "X"
                          ? "bg-cyan-500/15 border-cyan-400/60"
                          : cell === "O"
                          ? "bg-pink-500/15 border-pink-400/60"
                          : "bg-white/[0.04] hover:bg-white/[0.09] border-white/15"
                      }`}
                    >
                      {!cell && (
                        <span className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-500">
                          {idx + 1}
                        </span>
                      )}

                      {cell === "X" && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-2xl font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                        >
                          X
                        </motion.span>
                      )}
                      {cell === "O" && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-2xl font-black text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]"
                        >
                          O
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Status & Play Again Banner */}
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-center space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-200">
                  {statusNote}
                </p>
                {winState.winner && (
                  <button
                    type="button"
                    onClick={() => handleResetTicTacToe(true)}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
                  >
                    Play Next Round with {assistantName}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== 2. LIVE VOICE CHESS ==================== */}
          {activeGame === "chess" && (
            <div className="space-y-2">
              {/* Top Bar: Score, Captured Pieces & Controls */}
              <div className="flex items-center justify-between gap-1.5 bg-white/[0.04] border border-white/10 rounded-2xl px-2.5 py-1.5">
                <div className="flex items-center gap-2.5 text-xs">
                  <div>
                    <div className="text-[10px] text-cyan-300 font-bold">
                      {userName} ♔ ({chessScore.user})
                    </div>
                    <div className="text-[10px] text-pink-300 truncate max-w-[90px] h-3.5">
                      {capturedByUser.join("") || "—"}
                    </div>
                  </div>
                  <div className="text-slate-600 font-bold">vs</div>
                  <div>
                    <div className="text-[10px] text-pink-300 font-bold">
                      {assistantName} ♚ ({chessScore.zoya})
                    </div>
                    <div className="text-[10px] text-cyan-300 truncate max-w-[90px] h-3.5">
                      {capturedByZoya.join("") || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setTttDifficulty((d) =>
                        d === "pro" ? "playful" : "pro"
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1 ${
                      tttDifficulty === "pro"
                        ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                        : "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                    }`}
                  >
                    <Brain size={10} />
                    <span>
                      {tttDifficulty === "pro" ? "Smart Zoya" : "Cute Zoya"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetChess(true)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="New Chess Game"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {/* 8x8 Interactive Chess Board */}
              <div className="w-full max-w-[296px] mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl grid grid-cols-8 grid-rows-8 bg-[#0B101D]">
                {chessBoard.map((rowArr, r) =>
                  rowArr.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected =
                      selectedSquare?.row === r && selectedSquare?.col === c;
                    const legalTarget = legalMovesForSelected.find(
                      (m) => m.toRow === r && m.toCol === c
                    );
                    const isLastMove =
                      (lastChessMove?.fromRow === r &&
                        lastChessMove?.fromCol === c) ||
                      (lastChessMove?.toRow === r &&
                        lastChessMove?.toCol === c);

                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => handleChessSquareClick(r, c)}
                        className={`relative flex items-center justify-center select-none transition-colors ${
                          isSelected
                            ? "bg-cyan-500/45"
                            : isLastMove
                            ? "bg-amber-500/30"
                            : isDark
                            ? "bg-[#1A233A] hover:bg-[#232F4D]"
                            : "bg-[#2E3B59] hover:bg-[#38476B]"
                        }`}
                      >
                        {/* Rank numbers (8..1) on left column */}
                        {c === 0 && (
                          <span className="absolute top-0.5 left-0.5 text-[7px] font-mono text-white/40 leading-none">
                            {8 - r}
                          </span>
                        )}
                        {/* File letters (a..h) on bottom row */}
                        {r === 7 && (
                          <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono text-white/40 leading-none">
                            {String.fromCharCode(97 + c)}
                          </span>
                        )}

                        {/* Legal move indicator dot / capture ring */}
                        {legalTarget && (
                          <span
                            className={`absolute pointer-events-none ${
                              piece
                                ? "inset-0.5 rounded-full border-2 border-emerald-400 animate-pulse"
                                : "w-2.5 h-2.5 rounded-full bg-emerald-400/85 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                            }`}
                          />
                        )}

                        {/* Chess Piece Symbol */}
                        {piece && (
                          <span
                            className={`text-xl sm:text-2xl leading-none transition-transform ${
                              piece.color === "w"
                                ? "text-cyan-200 drop-shadow-[0_2px_6px_rgba(34,211,238,0.65)]"
                                : "text-pink-400 drop-shadow-[0_2px_6px_rgba(244,114,182,0.75)]"
                            }`}
                          >
                            {PIECE_SYMBOLS[piece.color][piece.type]}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Chess Status & New Match Button */}
              <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-200">
                  {chessStatus}
                </p>
                {chessWinner && (
                  <button
                    type="button"
                    onClick={() => handleResetChess(true)}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 text-xs font-extrabold shadow-md"
                  >
                    Play Next Chess Match with {assistantName}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. ROCK PAPER SCISSORS ==================== */}
          {activeGame === "rps" && (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-around bg-white/[0.04] border border-white/10 rounded-2xl py-2 px-3">
                <div>
                  <div className="text-[10px] text-cyan-300 font-bold">
                    {userName}
                  </div>
                  <div className="text-base font-black">{rpsScore.user}</div>
                </div>
                <Trophy size={16} className="text-amber-400" />
                <div>
                  <div className="text-[10px] text-pink-300 font-bold">
                    {assistantName}
                  </div>
                  <div className="text-base font-black">{rpsScore.zoya}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "rock", emoji: "🪨", label: "Rock" },
                    { id: "paper", emoji: "📄", label: "Paper" },
                    { id: "scissors", emoji: "✂️", label: "Scissors" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePlayRps(item.id)}
                    className="p-3 rounded-2xl bg-white/[0.05] hover:bg-pink-500/20 border border-white/15 hover:border-pink-400/50 flex flex-col items-center gap-1 transition-all"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                ))}
              </div>

              {rpsResult ? (
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-center gap-3 font-bold">
                    <span className="text-cyan-300 uppercase">
                      You: {rpsResult.userMove}
                    </span>
                    <span>⚡</span>
                    <span className="text-pink-300 uppercase">
                      {assistantName}: {rpsResult.zoyaMove}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    {rpsResult.outcome === "win"
                      ? `🎉 Tum Jeet Gaye! ${assistantName} Chidh Gayi 😤`
                      : rpsResult.outcome === "lose"
                      ? `👑 ${assistantName} Jeet Gayi! Haha!`
                      : "🤝 Same Pinch! Draw!"}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Tap Rock, Paper, or Scissors (ya voice me bolo)!
                </p>
              )}
            </div>
          )}

          {/* ==================== 4. NUMBER MIND READER ==================== */}
          {activeGame === "number_guess" && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold">
                  Secret Number (1 – 50) · Attempts: {guessAttempts}
                </div>
                <p className="text-xs font-semibold text-white">{guessHint}</p>
              </div>

              {!guessWon ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGuessNumber(Number(guessInput));
                    setGuessInput("");
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder="Enter 1–50 (or say out loud)"
                    className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                  >
                    Guess
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSecretNum(Math.floor(Math.random() * 50) + 1);
                    setGuessAttempts(0);
                    setGuessWon(false);
                    setGuessHint(
                      "Naya secret number (1-50) soch liya! Guess karo!"
                    );
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-white text-xs font-bold"
                >
                  Play Again
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
