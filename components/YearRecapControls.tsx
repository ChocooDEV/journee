'use client';

interface YearRecapControlsProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  onStartRecap: () => void;
  isRecapActive: boolean;
}

export default function YearRecapControls({
  selectedYear,
  onYearChange,
  onStartRecap,
  isRecapActive,
}: YearRecapControlsProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(Number(e.target.value))}
        disabled={isRecapActive}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <button
        onClick={onStartRecap}
        disabled={isRecapActive}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {isRecapActive ? 'Recap Active' : 'Year Recap'}
      </button>
    </div>
  );
}

