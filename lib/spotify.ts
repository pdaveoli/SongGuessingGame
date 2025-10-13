"use client";
import { createClient } from "./supabase/client";
import {SpotifyTrack, SpotifyUserTracksResponse} from "@/types/spotifyT";
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