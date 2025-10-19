import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const HeroSection = () => {
    return (
        <section className='relative flex min-h-[100dvh] w-full flex-col justify-center gap-12 overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/20'>
            {/* Gradient overlay for glow effect */}
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5' />

            {/* Hero Content */}
            <div className='relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-8'>
                <div className='bg-muted/80 backdrop-blur-sm flex items-center gap-2.5 rounded-full border px-3 py-2 shadow-lg shadow-primary/10'>
                    <Badge className='rounded-full'>Alpha</Badge>
                    <span className='text-muted-foreground'>Two Game modes functioning</span>
                </div>

                <h1 className='text-3xl leading-[1.29167] font-bold text-balance sm:text-4xl lg:text-5xl drop-shadow-sm'>
                    Spotify Guessing Game
                </h1>

                <p className='text-muted-foreground drop-shadow-sm max-w-2xl text-balance sm:text-sm md:text-lg lg:text-lg'>
                    Automatically generated song quizzes based on <strong>your</strong> Spotify.
                    How well do you know music?
                </p>

                <Button size='lg' asChild className='shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow'>
                    <a href='auth/sign-up'>Find Out Now</a>
                </Button>
            </div>

        </section>
    )
}

export default HeroSection
