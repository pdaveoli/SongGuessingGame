// File: app/(protected)/games/classic/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppProvider";
import { GameState, Difficulty, Track, TrackAmount, GameSession } from "@/types/gameT";
import { searchArtists, getArtistTopTracks, SpotifyArtistFull } from "@/lib/spotify";
import { getDeezerPreview } from "@/lib/deezer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IoMdArrowRoundBack, IoMdPerson } from "react-icons/io";
import { GameContainer, GameStateData } from "@/components/GameContainer";
import { ArtistSelector } from "@/components/ArtistSelector";

export default function ArtistGamePage() {
    const { user, loading, spotifyAccessToken, refreshSpotifyToken } = useApp();
    const [viewState, setViewState] = useState<GameState>("waiting");
    const [difficulty, setDifficulty] = useState<Difficulty>("hard");
    const [trackAmount, setTrackAmount] = useState<TrackAmount>(5);
    const [gameTracks, setGameTracks] = useState<Track[]>([]);
    const [isFetchingTracks, setIsFetchingTracks] = useState<boolean>(false);
    const [gameStats, setGameStats] = useState<GameStateData | null>(null);
    const [selectedArtists, setSelectedArtists] = useState<SpotifyArtistFull[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/login";
        }
    }, [user, loading]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
        }
    }, []);

    const handleStateChange = useCallback((newState: GameStateData) => {
        setGameStats(newState);
        if (newState.gameState === 'ended') {
            setViewState('ended');
        }
    }, []);

    const handleSearchArtists = async (query: string): Promise<SpotifyArtistFull[]> => {
        let activeToken = spotifyAccessToken;
        if (!activeToken) {
            activeToken = await refreshSpotifyToken();
            if (!activeToken) {
                return [];
            }
        }

        const results = await searchArtists(activeToken, query, 20);
        if (results === null) {
            // Token might be expired, try refreshing
            activeToken = await refreshSpotifyToken();
            if (!activeToken) return [];

            const retryResults = await searchArtists(activeToken, query, 20);
            return retryResults || [];
        }
        return results;
    };

    const handleSelectArtist = (artist: SpotifyArtistFull) => {
        setSelectedArtists(prev => [...prev, artist]);
    };

    const handleRemoveArtist = (artistId: string) => {
        setSelectedArtists(prev => prev.filter(a => a.id !== artistId));
    };

    const startNewGame = async () => {
        if (selectedArtists.length === 0) {
            alert("Please select at least one artist.");
            return;
        }

        setIsFetchingTracks(true);
        let activeToken = spotifyAccessToken;
        if (!activeToken) {
            activeToken = await refreshSpotifyToken();
            if (!activeToken) {
                alert("Failed to refresh Spotify token.");
                setIsFetchingTracks(false);
                return;
            }
        }

        try {
            // Fetch top tracks from all selected artists
            const allTracks: Track[] = [];

            for (const artist of selectedArtists) {
                let tracks = await getArtistTopTracks(activeToken, artist.id);
                if (!tracks) {
                    // Try refreshing token once more
                    activeToken = await refreshSpotifyToken();
                    if (!activeToken) {
                        alert("Failed to refresh Spotify token.");
                        setIsFetchingTracks(false);
                        return;
                    }
                    tracks = await getArtistTopTracks(activeToken, artist.id);
                    if (!tracks) {
                        alert(`Failed to fetch tracks for ${artist.name}.`);
                        continue;
                    }
                }

                // Convert to Track format
                const convertedTracks = tracks.map((t): Track => ({
                    id: t.id,
                    album: t.album,
                    title: t.name,
                    artist: t.artists.map(a => a.name).join(", "),
                    albumArt: t.album.images[0]?.url || "",
                    previewUrl: "",
                }));

                allTracks.push(...convertedTracks);
            }

            if (allTracks.length === 0) {
                alert("No tracks found for the selected artists.");
                setIsFetchingTracks(false);
                return;
            }

            // Shuffle and select random tracks
            const shuffled = allTracks.sort(() => Math.random() - 0.5);
            const selectedTracks = shuffled.slice(0, Math.min(trackAmount, allTracks.length));

            setGameTracks(selectedTracks);
            setViewState("playing");
        } catch (error) {
            console.error("Error fetching tracks:", error);
            alert("Failed to fetch tracks from Spotify. Please try again.");
        } finally {
            setIsFetchingTracks(false);
        }
    };

    const handlePlayAgain = () => {
        setViewState("waiting");
        setGameTracks([]);
        setGameStats(null);
    };

    const handleGameEnd = (finalSession: GameSession) => {
        console.log("Game ended. Final score:", finalSession.score);
        // You can add logic here to save the score to a database
    };

    const renderContent = () => {
        if (loading || !user) return <div>Loading...</div>;

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

        if (isFetchingTracks) {
            return <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground flex items-center justify-center"><p>Fetching tracks...</p></div>;
        }

        if ((viewState === "playing" || viewState === "ended") && gameTracks.length > 0) {
            const maxAnswerTime = difficulty === "easy" ? 30 : difficulty === "medium" ? 20 : 10;
            return (
                <GameContainer
                    tracks={gameTracks}
                    difficulty={difficulty}
                    maxAnswerTime={maxAnswerTime}
                    getPreviewUrlFn={(title, artist) => getDeezerPreview(title, artist)}
                    onGameEnd={handleGameEnd}
                    onPlayAgain={handlePlayAgain}
                    onStateChange={handleStateChange}
                />
            );
        }

        return (
            <div className="w-full max-w-3xl bg-card/80 border border-border/25 backdrop-blur-lg rounded-lg shadow-lg p-8 text-card-foreground">
                <div className="flex flex-col items-center mb-6">
                    <h1 className="text-xl font-bold">Artist Test</h1>
                    <p className="mt-2 text-center text-sm sm:text-base">Do you really know an artist? See how many of an artist's songs you know!</p>
                </div>

                {/* Artist Selector */}
                <div className="mb-6">
                    <ArtistSelector
                        onSearch={handleSearchArtists}
                        selectedArtists={selectedArtists}
                        onSelectArtist={handleSelectArtist}
                        onRemoveArtist={handleRemoveArtist}
                        multiSelect={true}
                        maxSelections={5}
                    />
                </div>

                {/* Game Settings */}
                <div className="mt-6 flex flex-col sm:flex-row sm:justify-center items-stretch sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-initial">
                        <label htmlFor="difficulty-select" className="font-bold shrink-0 text-sm">Difficulty:</label>
                        <select
                            id="difficulty-select" value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                            className="p-2 rounded-lg bg-gray-300 dark:bg-gray-800 w-full sm:w-auto"
                        >
                            <option value="easy">Easy (30s)</option>
                            <option value="medium">Medium (20s)</option>
                            <option value="hard">Hard (10s)</option>
                        </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-initial">
                        <label htmlFor="track-amount-select" className="font-bold shrink-0 text-sm">Tracks:</label>
                        <select
                            id="track-amount-select" value={trackAmount}
                            onChange={(e) => setTrackAmount(parseInt(e.target.value) as TrackAmount)}
                            className="p-2 rounded-lg bg-gray-300 dark:bg-gray-800 w-full sm:w-auto"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                <Button
                    onClick={startNewGame}
                    className="mt-6 w-full sm:w-auto sm:min-w-[200px] mx-auto block"
                    disabled={selectedArtists.length === 0}
                >
                    Start Game
                </Button>
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen flex flex-col dark:text-white ">
            <nav className="w-full p-4 bg-gray-100 bg-opacity-80 dark:bg-black darl:bg-opacity-30 shadow-lg sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <Button variant="ghost" asChild>
                        <Link href="/protected" className="flex items-center gap-2">
                            <IoMdArrowRoundBack/>
                            <h1 className="text-xl font-bold">Artist Mode</h1>
                        </Link>
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {(!gameStats || viewState === 'waiting') && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm"><span>🏆??</span></div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm"><span>🎮??</span></div>
                                </>
                            )}
                            {gameStats && viewState === 'playing' && gameStats.gameSession && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>Q: {gameStats.gameSession.currentIndex + 1}/{gameStats.gameSession.tracks.length}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>💯 {gameStats.gameSession.score}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>🔥 {gameStats.streak}</span>
                                    </div>
                                </>
                            )}
                            {gameStats && viewState === 'ended' && gameStats.gameSession && (
                                <>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>💯: {gameStats.gameSession.score}</span>
                                    </div>
                                    <div className="dark:bg-gray-900 bg-gray-500 bg-opacity-20 px-3 py-1 rounded-full text-sm">
                                        <span>✔️: {gameStats.gameSession.results.filter(r => r.correct).length}/{gameStats.gameSession.tracks.length}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <IoMdPerson className="text-xl" />
                    </div>
                </div>
            </nav>
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-10">
                {renderContent()}
            </main>
        </div>
    );
}
