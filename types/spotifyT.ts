export interface SpotifyImage {
    height: number;
    width: number;
    url: string;
}

export interface SpotifyExternalUrls {
    spotify: string;
}

export interface SpotifyExternalIds {
    isrc?: string;
    ean?: string;
    upc?: string;
}

export interface SpotifyArtist {
    images?: SpotifyImage[];
    genres?: string[];
    followers?: {
        total: number;
    };
    external_urls: SpotifyExternalUrls;
    href: string;
    id: string;
    name: string;
    type: "artist";
    uri: string;
}

export interface SpotifyAlbum {
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

export interface SpotifyTrack {
    album: SpotifyAlbum;
    artists: SpotifyArtist[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: SpotifyExternalIds;
    external_urls: SpotifyExternalUrls;
    href: string;
    id: string;
    is_local: boolean;
    is_playable: boolean;
    name: string;
    popularity: number;
    preview_url: string | null;
    track_number: number;
    type: "track";
    uri: string;
}

// For when tracks come from user's saved tracks endpoint
export interface SpotifySavedTrack {
    added_at: string;
    track: SpotifyTrack;
}

// Response from /me/tracks endpoint
export interface SpotifyUserTracksResponse {
    href: string;
    items: SpotifySavedTrack[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}
