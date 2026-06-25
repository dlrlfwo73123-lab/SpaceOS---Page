export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50 text-center text-sm text-red-600">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
          다시 시도
        </button>
      )}
    </div>
  );
}
