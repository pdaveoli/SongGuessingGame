"use client";
import { createClient } from "./supabase/client";
import {SpotifyTrack, SpotifyUserTracksResponse, SpotifyImage, SpotifyExternalUrls} from "@/types/spotifyT";
import { useApp } from "@/context/AppProvider";
/*
// Get the spotify env variables
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!spotifyClientId || !spotifyClientSecret) {
    throw new Error("Missing Spotify environment variables");
}
*/



export const getUserProfile = async (accessToken: string) : Promise<unknown> => {
    // Fetch the user's profile from the Spotify Web API using the access token
    const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });

    // Check for unauthorized status
    if (response.status === 401) {
        return null;
    }

    // Check the response
    if (!response.ok) {
        throw new Error("Failed to fetch user profile from Spotify");
    }

    return response.json();
}

export const getRandomSavedTrack = async (accessToken: string, tracksDone? : SpotifyTrack[]): Promise<SpotifyTrack | null> => {
    console.log('Fetching random saved track...');
    try {
        // First, get total count of saved tracks
        const countResponse = await fetch("https://api.spotify.com/v1/me/tracks?limit=1", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        // If 401 Unauthorized, token might be expired, handle it accordingly
        if (countResponse.status === 401) {
            // Return 401 to indicate token refresh needed
            return null;
        }

        if (!countResponse.ok) {
            throw new Error(`Failed to get track count: ${countResponse.status}`);
        }

        const countData: SpotifyUserTracksResponse = await countResponse.json();


        if (countData.items.length === 0) {
            throw new Error("No saved tracks found");
        }



        if (tracksDone && tracksDone.length > 0) {
            // Filter out already played tracks
            const filteredTracks = countData.items.filter(item =>
                !tracksDone.some(doneTrack => doneTrack.id === item.track.id)
            );
            if (filteredTracks.length === 0) {
                throw new Error("No available tracks left to play");
            }
            console.log(`Filtered down to ${filteredTracks.length} available tracks after removing already played`);
        }
        const totalTracks = countData.total;
        console.log(`Found ${totalTracks} total saved tracks`);
        // Generate random offset
        const randomOffset = Math.floor(Math.random() * totalTracks);

        // Fetch one random track
        const randomResponse = await fetch(
            `https://api.spotify.com/v1/me/tracks?limit=1&offset=${randomOffset}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!randomResponse.ok) {
            throw new Error(`Failed to fetch random track: ${randomResponse.status}`);
        }

        const randomData: SpotifyUserTracksResponse = await randomResponse.json();

        if (!randomData.items || randomData.items.length === 0) {
            throw new Error("No track found at random offset");
        }

        console.log('Fetched random track:', randomData.items[0].track.name);
        return randomData.items[0].track;

    } catch (error) {
        console.error('getRandomSavedTrack error:', error);
        throw error;
    }
}

export const getRandomUserSavedTracks = async (accessToken: string, count: number) : Promise<SpotifyTrack[] | null> => {
    const tracks : SpotifyTrack[] = [];

    // Get a random track to test, if returns null, the token is likely expired
    const testTrack = await getRandomSavedTrack(accessToken);
    if (testTrack == null) {
        console.warn('Access token may be expired or invalid.');
        return null; // Return empty array if token is invalid
    }

    for (let i = 0; i < count; i++) {
        try {
            let track = await getRandomSavedTrack(accessToken, tracks);
            if (track == null) {
                console.warn('Received null track, retrying...');
                i--; // Retry this iteration
                continue;
            }

            tracks.push(track);
        } catch (error) {
            console.error('Error fetching random saved track:', error);
        }
    }

    return tracks;
}

export interface SpotifyArtistFull {
    id: string;
    name: string;
    images: SpotifyImage[];
    followers: {
        total: number;
    };
    genres: string[];
    popularity: number;
    external_urls: SpotifyExternalUrls;
}

export interface SpotifyArtistSearchResponse {
    artists: {
        href: string;
        items: SpotifyArtistFull[];
        limit: number;
        next: string | null;
        offset: number;
        previous: string | null;
        total: number;
    };
}

export const searchArtists = async (accessToken: string, query: string, limit: number = 10): Promise<SpotifyArtistFull[] | null> => {
    if (!query.trim()) {
        return [];
    }

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to search artists: ${response.status}`);
        }

        const data: SpotifyArtistSearchResponse = await response.json();
        return data.artists.items;
    } catch (error) {
        console.error('searchArtists error:', error);
        throw error;
    }
}

export const getArtistTopTracks = async (accessToken: string, artistId: string, market: string = 'US'): Promise<SpotifyTrack[] | null> => {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch artist top tracks: ${response.status}`);
        }

        const data = await response.json();
        return data.tracks;
    } catch (error) {
        console.error('getArtistTopTracks error:', error);
        throw error;
    }
}

interface SpotifyAlbum {
    id: string;
    name: string;
    album_type: string;
    total_tracks: number;
    release_date: string;
}

interface SpotifyArtistAlbumsResponse {
    items: SpotifyAlbum[];
    next: string | null;
    total: number;
}

export const getArtistAlbums = async (accessToken: string, artistId: string, limit: number = 50): Promise<SpotifyAlbum[] | null> => {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=${limit}&market=US`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch artist albums: ${response.status}`);
        }

        const data: SpotifyArtistAlbumsResponse = await response.json();
        return data.items;
    } catch (error) {
        console.error('getArtistAlbums error:', error);
        throw error;
    }
}

interface SpotifyAlbumTracksResponse {
    items: SpotifyTrack[];
    next: string | null;
    total: number;
}

export const getAlbumTracks = async (accessToken: string, albumId: string): Promise<SpotifyTrack[] | null> => {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch album tracks: ${response.status}`);
        }

        const data: SpotifyAlbumTracksResponse = await response.json();
        return data.items;
    } catch (error) {
        console.error('getAlbumTracks error:', error);
        throw error;
    }
}

export const getExtendedArtistTracks = async (accessToken: string, artistId: string, maxTracks: number = 50): Promise<SpotifyTrack[] | null> => {
    try {
        // First get top tracks (up to 10)
        const topTracks = await getArtistTopTracks(accessToken, artistId);
        if (topTracks === null) {
            return null;
        }

        const allTracks: SpotifyTrack[] = [...topTracks.slice(0,5)];
        const trackIds = new Set(topTracks.map(t => t.id));

        // If we need more tracks, fetch from albums
        if (allTracks.length < maxTracks) {
            const albums = await getArtistAlbums(accessToken, artistId);
            if (albums === null) {
                return null;
            }

            // Shuffle albums to get variety
            const shuffledAlbums = albums.sort(() => Math.random() - 0.5);

            for (const album of shuffledAlbums) {
                if (allTracks.length >= maxTracks) break;

                const albumTracks = await getAlbumTracks(accessToken, album.id);
                if (albumTracks === null) continue;

                // Add tracks that we haven't seen yet
                for (const track of albumTracks) {
                    if (allTracks.length >= maxTracks) break;
                    if (!trackIds.has(track.id)) {
                        // Album tracks don't have full album info, so we need to add it
                        const enrichedTrack: SpotifyTrack = {
                            ...track,
                            album: track.album || {
                                id: album.id,
                                name: album.name,
                                images: [],
                                release_date: album.release_date,
                                total_tracks: album.total_tracks,
                            }
                        };
                        allTracks.push(enrichedTrack);
                        trackIds.add(track.id);
                    }
                }
            }
        }

        return allTracks;
    } catch (error) {
        console.error('getExtendedArtistTracks error:', error);
        throw error;
    }
}
