/** The DPXFITNES wordmark — the X carries the brand accent. */
export default function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      DP<span className="text-accent">X</span>FITNES
    </span>
  )
}
