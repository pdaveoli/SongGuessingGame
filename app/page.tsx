import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import  HeroSection  from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {

    const checkAccount = async () => {
        const supabase = await createClient();
        const {data, error} = await supabase.auth.getUser();
        if (data === null || error) {
            // Not logged in
            console.log("Not logged in");
            return;
        }

        // User is logged in, redirect to protected
        redirect("/protected");
    }
    await checkAccount();
    return (
        <main className="min-h-screen flex flex-col items-center relative">
            <nav className="fixed top-0 z-50 w-full flex justify-center border-b border-b-foreground/10 h-16 bg-transparent backdrop-blur-md">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                    <div className="flex gap-5 items-center font-semibold">
                        <Link href={"/"}>Spotify Guessing Game</Link>
                    </div>
                    {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
                </div>
            </nav>

            <div className="flex-1 w-full flex flex-col items-center justify-center">
                <HeroSection />
            </div>

            <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-sm">
                <p>
                    Powered by{" "}
                    <a
                        href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                        target="_blank"
                        className="font-bold hover:underline"
                        rel="noreferrer"
                    >
                        Supabase
                    </a>
                </p>
                <ThemeSwitcher />
            </footer>
        </main>
    );
}
