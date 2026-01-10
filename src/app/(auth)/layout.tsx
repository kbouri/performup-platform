import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-performup-blue via-performup-blue-dark to-[#3a4a75] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="h-16 w-16 rounded-xl bg-white/95 backdrop-blur flex items-center justify-center p-2">
                <Image
                  src="/logo.png"
                  alt="PerformUp Logo"
                  width={52}
                  height={44}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-display font-semibold">
                Perform<span className="text-performup-gold">Up</span>
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight mb-6">
              Préparez votre avenir
              <br />
              <span className="text-performup-gold">avec excellence</span>
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              La plateforme collaborative d&apos;accompagnement pour vos candidatures
              aux masters des grandes écoles européennes.
            </p>
          </div>

          {/* Stats or testimonial */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 max-w-md">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-display font-bold">95</div>
                <div className="text-sm text-white/70">Admissions réussies</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold">12</div>
                <div className="text-sm text-white/70">Écoles partenaires</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold">4.9</div>
                <div className="text-sm text-white/70">Note moyenne</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-performup-gold/20 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
