"use client";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useApp } from '@/context/AppProvider';
import {Button} from "@/components/ui/button";
import {FaSpotify} from "react-icons/fa";
import {createClient} from "@/lib/supabase/client";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {SpotifyTrack} from "@/types/spotifyT";
import {getRandomUserSavedTracks} from "@/lib/spotify";

export default function ProtectedPage() {
    const { user, profile, loading, spotifyAccessToken, refreshSession } = useApp();
    const router = useRouter();
    const [savedTracks, setSavedTracks] = useState<SpotifyTrack[]>([]);

    const handleSpotifySignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = createClient();
        try {
            const {error} = await supabase.auth.linkIdentity({
                'provider': 'spotify',
                'options': {
                    'scopes': 'user-read-email playlist-read-private user-library-read user-top-read user-read-recently-played user-library-read',
                    'redirectTo': `${window.location.origin}/auth/callback`
                },
            });
            if (error) throw error;

            // Refresh the session after linking
            await refreshSession();
        } catch (error: unknown) {
            console.error(error instanceof Error ? error.message : "An error occurred");
        }
    };

    const getRandomSavedTracks = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!spotifyAccessToken) return;
        let savedTracks = await getRandomUserSavedTracks(spotifyAccessToken, 10);
        if (savedTracks == null) return;
        setSavedTracks(savedTracks);
        console.log(savedTracks);
    }



    if (!spotifyAccessToken && loading == false) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center text-white p-6 md:p-10">
                <div className="w-full max-w-3xl bg-white bg-opacity-20 backdrop-blur-lg rounded-lg shadow-lg p-8">
                    <h1>Link your spotify account</h1>
                    <p className="mt-4">You need to link your Spotify account to access this page.</p>
                    <form onSubmit={handleSpotifySignUp}>
                        <div className="flex flex-col gap-6 mb-3">
                            <Button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] px-2 py-2 font-bold text-white shadow-lg transition-all duration-200 ease-in-out hover:scale-105 hover:bg-[#1ed760]">
                                <FaSpotify size={24} />
                                <span>Link Spotify</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (spotifyAccessToken && !loading) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center text-white p-6 md:p-10">
                <div className="w-full max-w-3xl bg-white bg-opacity-20 backdrop-blur-lg rounded-lg shadow-lg p-8">
                    <h1 className="text-4xl font-bold mb-6 text-center">Protected Page</h1>
                    <div className="bg-white bg-opacity-10 rounded-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">User Information</h2>
                        <p className="mb-2"><span className="font-bold">User ID:</span> {user?.id}</p>
                        <p className="mb-2"><span className="font-bold">Email:</span> {user?.email}</p>
                        {spotifyAccessToken && (
                            <div className="mb-4 break-all">
                                <form onSubmit={getRandomSavedTracks} className="mb-4">
                                    <Button type="submit">Get Random Saved Tracks</Button>
                                    {savedTracks.length > 0 && (
                                        <div className="mt-4">
                                            <h3 className="text-xl font-semibold mb-2">Random Saved Tracks:</h3>
                                            <ul className="list-disc list-inside">
                                                {savedTracks.map((track) => (
                                                    <li key={track.id}>
                                                        {track.name} by {track.artists.map(artist => artist.name).join(', ')}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}
                        {profile && (
                            <>
                                <p className="mb-2"><span className="font-bold">Full Name:</span> {profile.full_name}
                                </p>
                                <p className="mb-2"><span className="font-bold">Username:</span> {profile.username}</p>
                                <p className="mb-2"><span className="font-bold">Avatar URL:</span> {profile.avatar_url}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center text-white p-6 md:p-10">
                <div className="w-full max-w-3xl bg-white bg-opacity-20 backdrop-blur-lg rounded-lg shadow-lg p-8">
                    <h1 className="text-4xl font-bold mb-6 text-center">Loading...</h1>
                    <div className="flex items-center justify-center mb-6">
                        <AiOutlineLoading3Quarters className="w-6 h-6 mr-2 animate-spin"/>
                        <span className="text-lg">Fetching your data, please wait...</span>
                    </div>
                </div>
            </div>
        );
}
