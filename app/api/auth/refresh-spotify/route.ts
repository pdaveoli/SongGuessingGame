import { NextRequest, NextResponse } from "next/server";

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

export async function POST(req: NextRequest) {
    if (!spotifyClientId || !spotifyClientSecret) {
        console.error("Missing Spotify environment variables");
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const { refreshToken } = await req.json();

    if (!refreshToken) {
        return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    const authHeader = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Spotify API Error:', data);
            return NextResponse.json({ error: data.error_description || 'Failed to refresh token' }, { status: response.status });
        }

        return NextResponse.json({ accessToken: data.access_token });

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
