// File: app/(protected)/games/components/GameContainer.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Track, GameSession, Difficulty, QuestionResult, GameScore, GameState } from '@/types/gameT';
import { Button } from "@/components/ui/button";
import { FaPlay } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { TbBulb } from "react-icons/tb";

export interface GameStateData {
    gameState: GameState;
    gameSession: GameSession | null;
    streak: number;
}

export interface GameContainerProps {
    tracks: Track[];
    difficulty: Difficulty;
    maxAnswerTime: number;
    getPreviewUrlFn: (title: string, artist: string) => Promise<string | null>;
    onGameEnd: (session: GameSession) => void;
    onPlayAgain: () => void;
    onStateChange: (state: GameStateData) => void;
}

export function GameContainer({ tracks, difficulty, maxAnswerTime, getPreviewUrlFn, onGameEnd, onPlayAgain, onStateChange }: GameContainerProps) {
    const [gameSession, setGameSession] = useState<GameSession | null>(null);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [answer, setAnswer] = useState<string>("");
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [streak, setStreak] = useState<number>(0);
    const [bestStreak, setBestStreak] = useState<number>(0);
    const [hintUsed, setHintUsed] = useState<number>(0);
    const [hintText, setHintText] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [gameState, setGameState] = useState<GameState>("playing");
    const [isReadyToPlay, setIsReadyToPlay] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialized = useRef(false);

    useEffect(() => {
        onStateChange({ gameState, gameSession, streak });
    }, [gameState, gameSession, streak, onStateChange]);

    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    // Remove the canplay event listener approach and use a ref to track if we're waiting for audio
    const isWaitingForAudio = useRef(false);

    // Wrap nextRound in useCallback with proper dependencies
    const nextRound = useCallback(async () => {
        if (!gameSession) return;

        stopPlayback();
        setIsLoading(true);
        setIsReadyToPlay(false);
        setIsAnswerCorrect(null);
        setAnswer("");
        setHintUsed(0);
        setHintText("");
        isWaitingForAudio.current = true;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current.load();
        }

        if (gameSession.currentIndex >= gameSession.tracks.length) {
            setGameState("ended");
            onGameEnd(gameSession);
            setIsLoading(false);
            isWaitingForAudio.current = false;
            return;
        }

        const track = gameSession.tracks[gameSession.currentIndex];
        const previewUrl = await getPreviewUrlFn(track.title, track.artist);

        if (!previewUrl) {
            console.warn(`Failed to get preview for ${track.title}. Skipping.`);
            setGameSession(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null);
            isWaitingForAudio.current = false;
            return;
        }

        track.previewUrl = previewUrl;
        setCurrentTrack(track);
        setTimeLeft(gameSession.maxAnswerTime);

        if (audioRef.current && isWaitingForAudio.current) {
            audioRef.current.src = previewUrl;
            audioRef.current.load();
        }
    }, [gameSession, stopPlayback, getPreviewUrlFn, onGameEnd, maxAnswerTime]);

// Update the useEffect to track if nextRound has been called for this index
    const lastProcessedIndex = useRef<number>(-1);

    useEffect(() => {
        if (gameSession && isInitialized.current && gameSession.currentIndex !== lastProcessedIndex.current) {
            lastProcessedIndex.current = gameSession.currentIndex;
            nextRound();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSession?.currentIndex]);

    const handleCanPlay = useCallback(() => {
        if (isWaitingForAudio.current) {
            isWaitingForAudio.current = false;
            setIsReadyToPlay(true);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tracks.length > 0 && !isInitialized.current) {
            isInitialized.current = true;
            const newSession: GameSession = {
                tracks: tracks,
                currentIndex: 0,
                results: [],
                score: 0,
                difficulty: difficulty,
                maxAnswerTime: maxAnswerTime,
                snippetTime: maxAnswerTime,
            };
            setGameSession(newSession);
        }

        return () => {
            stopPlayback();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracks, difficulty, maxAnswerTime]);




    const startPlayback = useCallback((doTimer = true) => {
        if (!audioRef.current || !audioRef.current.src || !isReadyToPlay) return;

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                setIsPlaying(true);
                if (doTimer && gameSession) {
                    setTimeLeft(gameSession.maxAnswerTime);
                    timerRef.current = setInterval(() => {
                        setTimeLeft(prev => {
                            if (prev <= 1) {
                                if (timerRef.current) clearInterval(timerRef.current);
                                stopPlayback();
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
            }).catch(error => {
                console.error("Error playing audio:", error);
                setIsPlaying(false);
            });
        }
    }, [gameSession, stopPlayback, isReadyToPlay]);

    const trackNameClean = (name: string) => name.replace(/ *\([^)]*\) */g, "").replace(/ *\[[^\]]*\] */g, "").replace(/\s-\s.*/, "").replace(/['".,:]/g, "").trim().toLowerCase();

    const levenshteinDistance = (a: string, b: string): number => {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
        for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        return matrix[b.length][a.length];
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 100;
        const distance = levenshteinDistance(str1, str2);
        return (1 - distance / maxLength) * 100;
    };

    const generateHint = () => {
        if (!currentTrack) return;
        const artistInitials = currentTrack.artist.split(" ").map(n => n.charAt(0).toUpperCase()).join(".");
        const yearReleased = currentTrack.album.release_date;
        const albumName = currentTrack.album.name;
        const hints = [`Artist Initials: ${artistInitials}`, `Year Released: ${yearReleased}`, `Album Name: ${albumName}`];
        const hint = hints[hintUsed] || "No more hints available.";
        setHintUsed(prev => prev + 1);
        setHintText(hint);
    };

    const submitGuess = (guess: string) => {
        if (!gameSession || !currentTrack) return;
        stopPlayback();

        const trackName = trackNameClean(currentTrack.title);
        const userGuess = trackNameClean(guess);
        const similarity = calculateSimilarity(trackName, userGuess);
        const correct = similarity >= 90;
        const hintScorePenalty = hintUsed * 10;
        const adjustedBaseScore = Math.max(GameScore.baseScore - hintScorePenalty, 10);
        const score = correct ? (adjustedBaseScore * (difficulty === "easy" ? GameScore.easyMultiplier : difficulty === "medium" ? GameScore.mediumMultiplier : GameScore.hardMultiplier)) : 0;

        setIsAnswerCorrect(correct);

        const newResult: QuestionResult = { trackId: currentTrack.id, userAnswer: guess, hintsUsed: hintUsed, skipped: guess.trim() === "", correct, score };

        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > bestStreak) {
                setBestStreak(newStreak);
            }
        } else {
            setStreak(0);
        }

        setGameSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                results: [...prev.results, newResult],
                score: prev.score + score,
            };
        });
    };

    const proceedToNextRound = () => {
        if (!gameSession) return;
        setGameSession(prev => {
            if (!prev) return null;
            return { ...prev, currentIndex: prev.currentIndex + 1 };
        });
    };

    // Render audio element outside of conditional rendering so it's always available
    const audioElement = <audio ref={audioRef} className="hidden" preload="auto" onEnded={stopPlayback} onCanPlay={handleCanPlay}></audio>;

    if (isLoading) {
        return (
            <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center justify-center">
                {audioElement}
                <p>Loading next round...</p>
            </div>
        );
    }

    if (gameState === "ended" && gameSession) {
        return (
            <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
                {audioElement}
                <h1 className="font-bold text-xl">Game Over</h1>
                <p className="mt-4">The game has ended. Thanks for playing!</p>
                <div className="mt-6 w-full">
                    <h2 className="text-lg font-bold mb-4">Your Results:</h2>
                    <ul className="space-y-4 max-h-96 overflow-y-auto">
                        {gameSession.results.map((result, index) => {
                            const track = gameSession.tracks.find(t => t.id === result.trackId);
                            return (
                                <li key={index} className="border-b border-border pb-2">
                                    <p><strong>{track?.title}</strong> by {track?.artist}</p>
                                    <p>Your Answer: {result.userAnswer || "N/A"}</p>
                                    {result.hintsUsed > 0 && (<p>Hints Used: {result.hintsUsed}</p>)}
                                    <p>
                                        {result.correct ? (
                                            <span className="text-green-400">Correct! +{result.score} points</span>
                                        ) : result.skipped ? (
                                            <span className="text-red-400">Skipped</span>
                                        ) : (
                                            <span className="text-red-400">Wrong!</span>
                                        )}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-6">
                        <h2 className="text-lg font-bold">Final Score: <span className="text-primary">{gameSession.score}</span></h2>
                        <p>Total Correct: {gameSession.results.filter(r => r.correct).length}/{gameSession.tracks.length}</p>
                        <p>Best Streak: {bestStreak}</p>
                    </div>
                </div>
                <Button onClick={onPlayAgain} className="mt-8">
                    Play Again
                </Button>
            </div>
        );
    }

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const progress = gameSession ? (timeLeft / gameSession.maxAnswerTime) : 0;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
            {audioElement}
            {isAnswerCorrect === null ? (
                <>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold">Guess the song!</h2>
                    </div>
                    {timeLeft > 0 ? (
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <svg className="absolute w-full h-full" viewBox="0 0 200 200">
                                <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth="10"/>
                                <circle
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    fill="none"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="12"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 100 100)"
                                    className="transition-all duration-1000 linear"
                                />
                            </svg>
                            <div className="relative flex flex-col items-center justify-center text-center">
                                {isPlaying ? (
                                    <span className="text-5xl font-bold text-primary tabular-nums">{timeLeft}</span>
                                ) : (
                                    <Button
                                        className="inline-flex items-center justify-center w-36 h-36 rounded-full bg-transparent hover:bg-transparent border-primary/30 hover:border-primary border-2 text-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 ease-in-out hover:scale-105 p-0 animate-pulse hover:animate-none"
                                        onClick={() => startPlayback(true)}
                                        disabled={!isReadyToPlay}
                                    >
                                        <FaPlay style={{ width: 60, height: 60, marginLeft: '8px' }} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full text-center">
                            <h3 className="text-xl font-bold mb-4">Time's up! Guess now.</h3>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submitGuess(answer)}
                                    className="w-full p-2 rounded-lg bg-background"
                                    placeholder="Enter song title..."
                                />
                                <Button onClick={() => generateHint()} variant="outline" disabled={hintUsed >= 3}><TbBulb /></Button>
                            </div>
                            {hintText && <p className="mt-2 italic text-sm">{hintText}</p>}
                            <div className="flex justify-center gap-4 mt-4">
                                <Button onClick={() => submitGuess(answer)}>Guess</Button>
                                <Button variant="destructive" onClick={() => submitGuess("")}>Give Up</Button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center">
                    <h2 className={`text-2xl font-bold mb-4 ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isAnswerCorrect ? 'Correct!' : 'Wrong!'}
                    </h2>
                    <img src={currentTrack?.albumArt} alt="Album Art" className="w-48 h-48 mx-auto mb-2 rounded-lg shadow-lg"/>
                    <p className="mb-4"><strong>{currentTrack?.title}</strong> - {currentTrack?.artist}</p>
                    {isAnswerCorrect && gameSession && gameSession.results.length > 0 && (
                        <p className="mb-4">You earned <span className="text-primary font-bold">{gameSession.results[gameSession.results.length - 1].score}</span> points!</p>
                    )}
                    {!isAnswerCorrect && (
                        <p className="mb-4">Better luck next time!</p>
                    )}
                    <Button onClick={proceedToNextRound}>Next</Button>
                </div>
            )}
        </div>
    );
}