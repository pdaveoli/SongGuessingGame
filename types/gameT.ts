import {SpotifyArtist, SpotifyExternalUrls, SpotifyImage} from "@/types/spotifyT";

export interface Album {
    album_type: "album" | "single" | "compilation";
    artists: SpotifyArtist[];
    external_urls: SpotifyExternalUrls;
    href: string;
    id: string;
    images: SpotifyImage[];
    is_playable: boolean;
    name: string;
    release_date: string;
    release_date_precision: "year" | "month" | "day";
    total_tracks: number;
    type: "album";
    uri: string;
}
export type Track = {
    id: string;
    album: Album
    title: string;
    artist: string;
    albumArt: string;
    previewUrl: string;
}
export type QuestionResult = {
    trackId: string;
    userAnswer: string;
    skipped: boolean;
    hintsUsed: number;
    correct: boolean;
    score: number;
}

export const GameScore = {
    baseScore: 100, // Base score per correct question
    easyMultiplier: 1,
    mediumMultiplier: 2,
    hardMultiplier: 3,
}

export type GameState = "waiting" | "playing" | "ended";
export type Difficulty = "easy" | "medium" | "hard";
export type TrackAmount = 5 | 10 | 20 | 30 | 50; // Extra Short, Short, Medium, Long, Extra Long

export interface GameSession {
    tracks: Track[];               // songs for this session
    currentIndex: number;          // which track is active
    results: QuestionResult[];     // track user answers
    score: number;
    difficulty: Difficulty;
    snippetTime: number;           // snippet duration per difficulty
    maxAnswerTime: number;         // max time to answer
}