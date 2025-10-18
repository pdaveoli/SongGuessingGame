// Test page for the classic mode of the game
"use client";
import {useEffect, useRef, useState} from "react";
import { useApp } from "@/context/AppProvider";
import {GameState, GameSession, Difficulty, Track, QuestionResult, TrackAmount, GameScore} from "@/types/gameT";
import { getRandomUserSavedTracks } from "@/lib/spotify";
import {getDeezerPreview} from "@/lib/deezer";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import { IoMdArrowRoundBack, IoMdPerson  } from "react-icons/io";
import { FaPlay, FaPause } from "react-icons/fa";



export default function ClassicGamePage() {
    const { user, profile, loading, spotifyAccessToken, refreshSpotifyToken } = useApp();
    const [gameState, setGameState] = useState<GameState>("waiting");
    const [difficulty, setDifficulty] = useState<Difficulty>("hard");
    const [trackAmount, setTrackAmount] = useState<TrackAmount>(5);
    const [gameSession, setGameSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Current round states
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [answer, setAnswer] = useState<string>("");
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
    const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [streak, setStreak] = useState<number>(0);
    const [bestStreak, setBestStreak] = useState<number>(0);

    useEffect(() => {
        if (!loading && !user) {
            // Redirect to login page if not authenticated
            window.location.href = "/login";
        }

    }, [user, loading]);


    useEffect(() => {
        // Disable hardware media key controls
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
        }
    }, []);
    const startNewGame = async () => {
        setIsLoading(true);
        setGameState("playing");

        // Reset previous game session data
        setGameSession(null);
        setCurrentTrack(null);
        setTimeLeft(0);
        setAnswer("");
        setIsAnswerCorrect(null);
        setQuestionResults([]);
        setPreviewUrl("");
        setIsPlaying(false);
        setStreak(0);
        setBestStreak(0);

        // Initialize a new game session
        const newSession: GameSession = {
            tracks: [], // Amount of tracks will be set when fetching from Spotify
            currentIndex: 0,
            results: [],
            score: 0,
            difficulty: difficulty,
            snippetTime: difficulty === "easy" ? 30 : difficulty === "medium" ? 20 : 10,
            maxAnswerTime: difficulty === "easy" ? 30 : difficulty === "medium" ? 20 : 10,
        };
        console.log("Attempting to get tracks from spotify... " + spotifyAccessToken);

        // Refresh token before making API calls
        let activeToken = spotifyAccessToken;
        if (!activeToken) {
            activeToken = await refreshSpotifyToken();
            if (!activeToken) {
                alert("Failed to refresh Spotify token. Please try linking your account again.");
                return;
            }
        }

        try {
            // Try and get random tracks from user's Spotify library
            let tracks = await getRandomUserSavedTracks(activeToken, trackAmount);
            if (tracks == null) {
                // The token needs refreshing
                const newToken = await refreshSpotifyToken();
                if (newToken) {
                    tracks = await getRandomUserSavedTracks(newToken, trackAmount);
                    if (tracks == null) {
                        alert("Failed to fetch tracks from Spotify after refreshing token. Please try linking your account again.");
                        return;
                    }
                } else {
                    alert("Failed to refresh Spotify token. Please try linking your account again.");
                    return;
                }
            }
            newSession.tracks = tracks.map((t): Track => ({
                id: t.id,
                title: t.name,
                artist: t.artists.map(a => a.name).join(", "),
                albumArt: t.album.images[0]?.url || "",
                previewUrl: "", // Setup with deezer api
            }));

            setGameSession(newSession);
            // Start the first round
            await newRound(newSession);
        } catch (error) {
            // If we get a 401, try refreshing the token once
            if (error instanceof Error && error.message.includes('401')) {
                const newToken = await refreshSpotifyToken();
                if (newToken) {
                    const tracks = await getRandomUserSavedTracks(newToken, trackAmount);
                    // ... continue with rest of logic
                } else {
                    alert("Failed to refresh Spotify token. Please try linking your account again.");
                }
            } else {
                console.error("Error fetching tracks:", error);
                alert("Failed to fetch tracks from Spotify.");
            }
        }

        setIsLoading(false);

    }

    const newRound = async (session: GameSession) => {
        if (!session) return;
        // Handle getting the preview first
        const track = session.tracks[session.currentIndex];
        // reset variables


        if (track  === null) return;

        // Now get the preview using deezer
        const previewUrl = await getDeezerPreview(track.title, track.artist);
        if (!previewUrl) {
            alert(`Failed to get preview for ${track.title} by ${track.artist}. Skipping to next track.`);
            // Move to next track
            if (session.currentIndex + 1 < session.tracks.length) {
                const nextSession = {
                    ...session,
                    currentIndex: session.currentIndex + 1,
                };
                setGameSession(nextSession);
                await newRound(nextSession);
            } else {
                // End game if no more tracks
                setGameState("ended");
            }
            return;
        }

        track.previewUrl = previewUrl;
        // set audio src
        if (audioRef.current) {
            audioRef.current.src = previewUrl;
            audioRef.current.load();
        }

        setCurrentTrack(track);
        setPreviewUrl(previewUrl);
        setTimeLeft(session.maxAnswerTime);
        setAnswer("");
        setIsAnswerCorrect(null);

        console.log("Starting new round with track:", track, "Preview URL:", previewUrl, "Time left:", session.maxAnswerTime, "seconds");
    }

    const trackNameClean = (name: string) => {
        // Remove content in parentheses and brackets, and trim whitespace
        return name
            // Remove content in parentheses (e.g., "Song (feat. Artist)")
            .replace(/ *\([^)]*\) */g, "")
            // Remove content in brackets (e.g., "Song [Remix]")
            .replace(/ *\[[^\]]*\] */g, "")
            // Remove version descriptions (e.g., "Song - Acoustic")
            .replace(/\s-\s.*/, "")
            // Remove single and double quotes
            .replace(/['"]/g, "")
            // Trim whitespace and convert to lowercase
            .trim()
            .toLowerCase();
    }

    const levenshteinDistance = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= b.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,         // Deletion
                    matrix[j - 1][i] + 1,         // Insertion
                    matrix[j - 1][i - 1] + cost   // Substitution
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

    const submitGuess = async (guess: string) => {
        if (!gameSession || !currentTrack){
            console.log("No game session or current track. GS: ", gameSession, "CT:", currentTrack);
            return;
        }

        const trackName = trackNameClean(currentTrack.title);
        const userGuess = trackNameClean(guess);

        const similarity = calculateSimilarity(trackName, userGuess);
        console.log(`Comparing "${trackName}" with "${userGuess}". Similarity: ${similarity.toFixed(2)}%`);
        const correct = similarity >= 90; // Only allow the answer if it is at least 90% similar
        const score = correct ? (GameScore.baseScore * (gameSession.difficulty === "easy" ? GameScore.easyMultiplier : gameSession.difficulty === "medium" ? GameScore.mediumMultiplier : GameScore.hardMultiplier)) : 0;


        console.log("User guessed:", guess, "Correct answer:", currentTrack.title, "Correct:", correct);
        setIsAnswerCorrect(correct);

        // Update game session results
        const newResult: QuestionResult = {
            trackId: currentTrack.id,
            userAnswer: guess,
            correct,
            score,
        };
        const updatedResults = [...gameSession.results, newResult];
        const updatedScore = gameSession.score + score;

        // Update streaks
        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > bestStreak) {
                setBestStreak(newStreak);
            }
        } else {
            setStreak(0);
        }

        const updatedSession = {
            ...gameSession,
            results: updatedResults,
            score: updatedScore,
        };


        setGameSession(updatedSession);
        setQuestionResults(updatedResults);


    }

    const startPlayback = (doTimer = true) => {
        // Play the audio preview
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.error("Error playing audio:", error);
            });
            setIsPlaying(true);
            // Start countdown timer
            if (doTimer) {
                setTimeLeft(gameSession?.maxAnswerTime ?? 10); // Reset timer
                timerRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            if (timerRef.current) clearInterval(timerRef.current);
                            // Time's up, show the guessing screen
                            stopPlayback();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }
    }

    const stopPlayback = () => {
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            // Disable it to stop any further playback
            audioRef.current.src = "";
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }

    const renderGameState = () => {
        if (loading || !user) {
            return <div>Loading...</div>;
        }

        if (!spotifyAccessToken) {
            return (
                <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
                    <h1>Link your Spotify account</h1>
                    <p className="mt-4">You need to link your Spotify account to access this page.</p>
                    <a href="/protected" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 font-bold dark:text-white shadow-lg transition-all duration-200 ease-in-out hover:scale-105 hover:bg-[#1ed760]">
                        Link Spotify
                    </a>
                </div>
            );
        }

        switch (gameState) {
            case "waiting":
                return (
                    <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
                        <h1 className="text-xl font-bold">Classic</h1>
                        <p className="mt-4 text-center">How well do you know your liked songs on Spotify?</p>

                        <div className="mt-8 w-full flex flex-col md:flex-row md:justify-center items-center gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                                <label htmlFor="difficulty-select" className="font-bold shrink-0">Difficulty:</label>
                                <select
                                    id="difficulty-select"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                                    className="p-2 rounded-lg bg-gray-300 dark:bg-gray-800 w-full"
                                >
                                    <option value="easy">Easy (30s preview)</option>
                                    <option value="medium">Medium (20s preview)</option>
                                    <option value="hard">Hard (10s preview)</option>
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                                <label htmlFor="track-amount-select" className="font-bold shrink-0">Tracks:</label>
                                <select
                                    id="track-amount-select"
                                    value={trackAmount}
                                    onChange={(e) => setTrackAmount(parseInt(e.target.value) as TrackAmount)}
                                    className="p-2 rounded-lg bg-gray-300 dark:bg-gray-800 w-full"
                                >
                                    <option value={5}>5 (Extra Short)</option>
                                    <option value={10}>10 (Short)</option>
                                    <option value={20}>20 (Medium)</option>
                                    <option value={30}>30 (Long)</option>
                                    <option value={50}>50 (Extra Long)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => startNewGame()}
                            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/50 transition-all duration-200 ease-in-out hover:scale-105"
                        >
                            Start Game
                        </button>
                    </div>
                );
            case "playing":
                const radius = 80;
                const circumference = 2 * Math.PI * radius;
                const progress = gameSession ? (timeLeft / gameSession.maxAnswerTime) : 0;
                const strokeDashoffset = circumference * (1 - progress);

                return (
                    <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
                        {timeLeft > 0 ? (
                            <div className="text-center">
                                {currentTrack && (
                                    <div className="mb-4">
                                        {isPlaying ? (
                                            <>
                                            <div className="relative w-48 h-48 flex items-center justify-center">
                                                <svg className="absolute w-full h-full" viewBox="0 0 200 200">
                                                    {/* Background Circle */}
                                                    <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth="10"/>
                                                    {/* Progress Circle */}
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
                                                    <span className="text-5xl font-bold text-primary tabular-nums">{timeLeft}</span>

                                                </div>
                                            </div>
                                            </>
                                        ) : (
                                            <Button
                                                className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-transparent hover:bg-transparent border-primary/30 hover:border-primary border-2 text-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 ease-in-out hover:scale-105 p-0 animate-pulse hover:animate-none"
                                                onClick={() => startPlayback(true)}
                                            >
                                                <FaPlay style={{ width: 72, height: 72, marginLeft: '8px' }} />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : isAnswerCorrect === null && !isLoading ? (
                            <div className="text-center">
                                <h1 className="text-2xl font-bold mb-4">Time to guess!</h1>
                                <p className="mb-4">The preview has ended. Please enter your answer below.</p>
                                <input
                                    type="text"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    className="w-full p-2 rounded-lg bg-background"
                                    placeholder="Enter your answer..."
                                />
                                <div className="flex justify-center gap-4 mt-4">
                                    <Button className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-yellow-600 px-4 py-2 font-bold bg-transparent hover:bg-transparent border border-gray-600 shadow-md shadow-gray-600/50 transition-all duration-200 ease-in-out hover:scale-105">
                                        Hint
                                    </Button>
                                    <Button
                                    onClick={() => submitGuess(answer)}
                                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/50 transition-all duration-200 ease-in-out hover:scale-105"
                                >
                                    Guess
                                </Button>
                                    <Button className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-4 py-2 font-bold border border-red-600 hover:bg-transparent text-red-600 shadow-md shadow-red-600/50 transition-all duration-200 ease-in-out hover:scale-105">
                                        Give up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                {isAnswerCorrect !== null ? (
                                    <>
                                        {isAnswerCorrect ? (
                                            <h2 className="text-2xl font-bold mb-4 text-green-400">Correct!</h2>
                                        ) : (
                                            <h2 className="text-2xl font-bold mb-4 text-red-400">Wrong!</h2>
                                        )}
                                        <img src={currentTrack?.albumArt} alt="Album Art" className="w-48 h-48 mx-auto mb-2 rounded-lg shadow-lg"/>
                                        <p className="mb-4"><strong>{currentTrack?.title}</strong> - {currentTrack?.artist}</p>
                                        {isAnswerCorrect ? (
                                            <p className="mb-4">You earned <span className="text-primary">{GameScore.baseScore * (gameSession?.difficulty === "easy" ? GameScore.easyMultiplier : gameSession?.difficulty === "medium" ? GameScore.mediumMultiplier : GameScore.hardMultiplier)}</span> points!</p>
                                        ) : (
                                            <p className="mb-4">Better luck next time!</p>
                                        )}
                                        <Button
                                            onClick={() => {
                                                // Move to next track or end game
                                                stopPlayback();
                                                if (gameSession) {
                                                    if (gameSession.currentIndex + 1 < gameSession.tracks.length) {
                                                        const nextSession = {
                                                            ...gameSession,
                                                            currentIndex: gameSession.currentIndex + 1,
                                                        };
                                                        setGameSession(nextSession);
                                                        newRound(nextSession);
                                                    } else {
                                                        setGameState("ended");
                                                    }
                                                }
                                            }}
                                            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/50 transition-all duration-200 ease-in-out hover:scale-105"
                                        >
                                            Next
                                        </Button>
                                    </>
                                ) : (
                                    <p>Loading next round...</p>
                                )}

                            </div>
                        )}
                    </div>
                );
            case "ended":
                return (
                    <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center flex-col">
                        <h1 className="font-bold text-xl">Game Over</h1>
                        <p className="mt-4">The game has ended. Thanks for playing!</p>
                        <div className="mt-6 w-full">
                            <h2 className="text-lg font-bold mb-4">Your Results:</h2>
                            <ul className="space-y-4">
                                {gameSession?.results.map((result, index) => {
                                    const track = gameSession.tracks.find(t => t.id === result.trackId);
                                    return (
                                        <li key={index} className="border-b border-border pb-2">
                                            <p><strong>{track?.title}</strong> by {track?.artist}</p>
                                            <p>Your Answer: {result.userAnswer}</p>
                                            <p>
                                                {result.correct ? (
                                                    <span className="text-green-400">Correct! +{result.score} points</span>
                                                ) : (
                                                    <span className="text-red-400">Wrong!</span>
                                                )}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="mt-6">
                                <h2 className="text-lg font-bold">Final Score: <span className="text-primary">{gameSession?.score}</span></h2>
                                <p>Total Correct: {gameSession ? gameSession.results.filter(r => r.correct).length : 0}/{gameSession ? gameSession.tracks.length : 0}</p>
                                <p>Best Streak: {bestStreak}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setGameState("waiting")}
                            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/50 transition-all duration-200 ease-in-out hover:scale-105"
                        >
                            Play Again
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col dark:text-white ">
            <audio
                ref={audioRef}
                src={undefined}
                className="hidden"
                preload="metadata"
                onEnded={stopPlayback}
            ></audio>

            {/* Navbar */}
            <nav className="w-full p-4 bg-gray-100 bg-opacity-80 dark:bg-black darl:bg-opacity-30 shadow-lg sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <Button variant="ghost" asChild>
                        <Link href="/protected" className="flex items-center gap-2">
                            <IoMdArrowRoundBack/>
                            <h1 className="text-xl font-bold">Classic Mode</h1>
                        </Link>
                    </Button>

                    {/* Other navbar items can go here */}
                    <div className="flex items-center gap-4">

                        {/*Pill design stats (game not started: leaderboard position, games played, average score. Game started: question number, correct answers, streaks. Game ended: match stats)*/}
                        <div className="flex items-center gap-2">
                            {gameState === "waiting" && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>🏆30</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>🎮102</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>💯15.2</span>
                                    </div>
                                </>
                            )}
                            {gameState === "playing" && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>Q: {gameSession ? gameSession.currentIndex + 1 : 0}/{gameSession ? gameSession.tracks.length : 0}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>💯 {gameSession? gameSession.score : 0}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>🔥 {streak}</span>
                                    </div>
                                </>
                            )}
                            {gameState === "ended" && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>💯: {gameSession ? gameSession.score : 0}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>✔️: {gameSession ? gameSession.results.filter(r => r.correct).length : 0}/{gameSession ? gameSession.tracks.length : 0}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>🏆: 5</span>
                                    </div>
                                </>
                            )}

                        </div>
                        <IoMdPerson className="text-xl" /> {/* Temp user avatar */}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-10">
                {renderGameState()}
            </main>
        </div>
    );
}
