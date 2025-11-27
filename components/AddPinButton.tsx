'use client';

interface AddPinButtonProps {
  onClick: () => void;
  hasRecentMedia?: boolean;
}

export default function AddPinButton({ onClick, hasRecentMedia }: AddPinButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute left-4 right-4 z-40 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center pt-6 pb-4 transition-all hover:bg-gray-50 active:bg-gray-100 ${
        hasRecentMedia ? 'bottom-[240px]' : 'bottom-2'
      }`}
      aria-label="Add Photo or Video"
    >
      <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-3 shadow-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-base font-medium text-gray-900">Add Photo or Video</span>
    </button>
  );
}

