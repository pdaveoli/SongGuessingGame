import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5' />
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
