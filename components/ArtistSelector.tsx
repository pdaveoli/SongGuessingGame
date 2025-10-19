"use client";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { SpotifyArtistFull } from "@/lib/spotify";
import { IoMdClose, IoMdSearch } from "react-icons/io";
import { FaCheck } from "react-icons/fa";

interface ArtistSelectorProps {
    onSearch: (query: string) => Promise<SpotifyArtistFull[]>;
    selectedArtists: SpotifyArtistFull[];
    onSelectArtist: (artist: SpotifyArtistFull) => void;
    onRemoveArtist: (artistId: string) => void;
    multiSelect?: boolean;
    maxSelections?: number;
}

export function ArtistSelector({
    onSearch,
    selectedArtists,
    onSelectArtist,
    onRemoveArtist,
    multiSelect = true,
    maxSelections = 5
}: ArtistSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SpotifyArtistFull[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await onSearch(query);
            setSearchResults(results);
        } catch (error) {
            console.error("Error searching artists:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [onSearch]);

    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const timeout = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500); // Debounce for 500ms

        setSearchTimeout(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [searchQuery]);

    const isSelected = (artistId: string) => {
        return selectedArtists.some(a => a.id === artistId);
    };

    const canSelectMore = () => {
        return multiSelect ? selectedArtists.length < maxSelections : selectedArtists.length < 1;
    };

    const formatFollowers = (count: number) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    return (
        <div className="w-full space-y-4">
            {/* Search Input */}
            <div className="relative">
                <IoMdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <Input
                    type="text"
                    placeholder="Search for artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-6 text-lg bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {/* Selected Artists */}
            {selectedArtists.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3 text-green-800 dark:text-green-300">
                        Selected Artist{selectedArtists.length > 1 ? 's' : ''} ({selectedArtists.length}/{multiSelect ? maxSelections : 1})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedArtists.map(artist => (
                            <div
                                key={artist.id}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 border border-green-300 dark:border-green-700"
                            >
                                {artist.images && artist.images.length > 0 && (
                                    <img
                                        src={artist.images[artist.images.length - 1].url}
                                        alt={artist.name}
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                )}
                                <span className="text-sm font-medium">{artist.name}</span>
                                <button
                                    onClick={() => onRemoveArtist(artist.id)}
                                    className="ml-1 text-red-500 hover:text-red-700 transition-colors"
                                >
                                    <IoMdClose className="text-lg" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    <div className="grid grid-cols-1 divide-y divide-border">
                        {searchResults.map((artist) => {
                            const selected = isSelected(artist.id);
                            const disabled = !selected && !canSelectMore();

                            return (
                                <button
                                    key={artist.id}
                                    onClick={() => {
                                        if (selected) {
                                            onRemoveArtist(artist.id);
                                        } else if (canSelectMore()) {
                                            onSelectArtist(artist);
                                        }
                                    }}
                                    disabled={disabled}
                                    className={`
                                        flex items-center gap-4 p-4 text-left transition-colors
                                        ${selected 
                                            ? 'bg-green-50 dark:bg-green-900/20' 
                                            : disabled 
                                                ? 'opacity-50 cursor-not-allowed' 
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
                                        }
                                    `}
                                >
                                    {/* Artist Image */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                            {artist.images && artist.images.length > 0 ? (
                                                <img
                                                    src={artist.images[artist.images.length - 1].url}
                                                    alt={artist.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                                                    🎵
                                                </div>
                                            )}
                                        </div>
                                        {selected && (
                                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                                                <FaCheck className="text-white text-xs" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Artist Info */}
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-semibold text-base sm:text-lg truncate">
                                            {artist.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            {artist.followers && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-xs">👥</span>
                                                    {formatFollowers(artist.followers.total)} followers
                                                </span>
                                            )}
                                            {artist.genres && artist.genres.length > 0 && (
                                                <span className="hidden sm:inline truncate">
                                                    {artist.genres.slice(0, 2).join(", ")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className="flex-shrink-0">
                                        {selected ? (
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                <FaCheck className="text-white" />
                                            </div>
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full border-2 ${
                                                disabled 
                                                    ? 'border-gray-300 dark:border-gray-600' 
                                                    : 'border-gray-400 dark:border-gray-500'
                                            }`} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <IoMdSearch className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>No artists found for "{searchQuery}"</p>
                </div>
            )}

            {/* Initial State */}
            {!searchQuery && searchResults.length === 0 && selectedArtists.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <IoMdSearch className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>Search for artists to get started</p>
                </div>
            )}
        </div>
    );
}
