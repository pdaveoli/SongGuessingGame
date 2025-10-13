// Implement the get preview search function for deezer
export async function getDeezerPreview(trackName: string, artistName: string): Promise<string | null> {
    try {
        const query = `${trackName} ${artistName}`;
        const response = await fetch(`/api/deezer/search?q=${encodeURIComponent(query)}&limit=1`);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            return data.data[0].preview; // Return the preview URL
        } else {
            console.warn(`No results found on Deezer for ${trackName} by ${artistName}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching Deezer preview:', error);
        return null;
    }
}