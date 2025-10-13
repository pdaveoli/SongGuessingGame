"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const AppContext = createContext<any>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
    const [spotifyRefreshToken, setSpotifyRefreshToken] = useState<string | null>(null);

    useEffect(() => {
        // Load initial session and user
        const loadSession = async () => {
            await refreshSession();

            setLoading(false);
        }
        loadSession();
    }, []);

    const refreshSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
            setSpotifyAccessToken(null);
            setSpotifyRefreshToken(null);
            setProfile(null);
            console.log("No user logged in");
            return;
        }

        // 1. Try to get tokens from the session (available right after login/linking)
        let newAccessToken = session?.provider_token || null;
        let newRefreshToken = session?.provider_refresh_token || null;

        if (newAccessToken && newRefreshToken) {
            // If we got new tokens from the session, save them to our database
            console.log("Got new tokens from session");
            setSpotifyAccessToken(newAccessToken);
            setSpotifyRefreshToken(newRefreshToken);
            await supabase
                .from('users')
                .update({
                    'spotifyProviderToken': newAccessToken,
                    'spotifyRefreshToken': newRefreshToken,
                })
                .eq('id', currentUser.id);
        } else {
            // 2. If not in session, get them from our database
            const { data: profileData } = await supabase
                .from('users')
                .select('spotifyProviderToken, spotifyRefreshToken')
                .eq('id', currentUser.id)
                .single();

            if (profileData) {
                newAccessToken = profileData.spotifyProviderToken;
                newRefreshToken = profileData.spotifyRefreshToken;
                setSpotifyAccessToken(newAccessToken);
                setSpotifyRefreshToken(newRefreshToken);
                console.log("Got tokens from database");
            }
            else {
                console.log("No tokens found for user");
                setSpotifyAccessToken(null);
                setSpotifyRefreshToken(null);
                return;
            }
        }

        // 3. If we have a refresh token but no access token, refresh it
        if (newRefreshToken && !newAccessToken) {
            const refreshedToken = await refreshSpotifyToken(newRefreshToken);
            if (refreshedToken) {
                setSpotifyAccessToken(refreshedToken);
            }
        }

        // Fetch user profile
        const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        setProfile(userProfile);
    };

    const refreshSpotifyToken = async (rToken? : string | null) => {
        const refreshTokenToUse = rToken || spotifyRefreshToken;
        if (!refreshTokenToUse) {
            console.error("No refresh token available");
            return null;
        }

        try {
            const response = await fetch('/api/auth/refresh-spotify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: refreshTokenToUse }),
            });

            if (!response.ok) throw new Error('Failed to refresh token');

            const data = await response.json();
            console.log(data);
            const newAccessToken = data.accessToken;
            setSpotifyAccessToken(newAccessToken);

            // Update the new access token in the database
            if (user) {
                await supabase
                    .from('users')
                    .update({ 'spotifyProviderToken': newAccessToken })
                    .eq('id', user.id);
            }

            return newAccessToken;
        } catch (error) {
            console.error('Error refreshing Spotify token:', error);
            // Could log user out or clear tokens here
            setSpotifyAccessToken(null);
            return null;
        }
    };


    return (
        <AppContext.Provider value={{
            user,
            profile,
            game,
            setGame,
            loading,
            spotifyAccessToken,
            refreshSession,
            refreshSpotifyToken
        }}>
            {children}
        </AppContext.Provider>
    )
}

export const useApp = () => useContext(AppContext);