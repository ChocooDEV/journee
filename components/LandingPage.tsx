'use client';

import { useState } from 'react';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-[#F7F3E9] flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Subtle grid pattern background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Logo and App Name */}
        <div className="flex flex-col items-center justify-center gap-3 mb-12">
          <img 
            src="/logo.png" 
            alt="Journee Logo" 
            className="w-24 h-24 object-contain"
          />
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Journee</h1>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl md:text-5xl font-semibold text-center text-gray-900 mb-6 leading-tight tracking-tight">
          Relive your
          <br />
          travel memories
          <br />
          on a map
        </h2>

        {/* Description */}
        <p className="text-base text-gray-600 text-center mb-10 leading-relaxed max-w-sm font-normal">
          Add photos and videos to places
          you&apos;ve visited and get a personalized recap of your year
        </p>

        {/* Get Started Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full max-w-xs bg-black text-white font-medium py-4 px-8 rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors text-base tracking-tight"
        >
          Get Started
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false);
          onGetStarted();
        }}
      />
    </div>
  );
}

