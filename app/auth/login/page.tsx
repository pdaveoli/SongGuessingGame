import { LoginForm } from "@/components/login-form";

export default function Page() {
    return (
        <div className="fixed inset-0 flex w-full items-center justify-center overflow-y-auto p-6 bg-background">
            <div className="relative z-10 w-full max-w-sm my-auto">
                <LoginForm />
            </div>
        </div>
    );
}
