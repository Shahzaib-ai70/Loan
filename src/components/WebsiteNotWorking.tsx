import { Button } from './ui/Button';

type WebsiteNotWorkingProps = {
  onGoHome: () => void;
};

export function WebsiteNotWorking({ onGoHome }: WebsiteNotWorkingProps) {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-2xl font-extrabold text-slate-900">Website not working</div>
        <div className="mt-2 text-sm font-semibold text-slate-600">
          This link is no longer available. Please use the official website link.
        </div>
        <div className="mt-6">
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={onGoHome}
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

