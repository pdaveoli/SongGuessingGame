// app/auth/callback/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallback() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const saveProviderTokens = async () => {
            // On redirect, the session contains the provider tokens.
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.provider_token && session?.provider_refresh_token) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        spotifyProviderToken: session.provider_token,
                        spotifyRefreshToken: session.provider_refresh_token,
                    })
                    .eq('id', session.user.id);

                if (error) {
                    console.error('Error saving tokens:', error);
                }
            }

            // Redirect the user to a different page after handling the callback.
            router.push('/protected'); // Or wherever you want them to go
        };

        saveProviderTokens();
    }, [router, supabase]);

    return (
        <div>
            <p>Please wait while we link your account...</p>
        </div>
    );
}
