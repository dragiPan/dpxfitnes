import { youtubeId } from '../lib/youtube'

export default function YouTubeEmbed({ url }: { url: string | null | undefined }) {
  const id = youtubeId(url)
  if (!id) return null
  return (
    <div className="relative w-full border-2 border-black" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title="Exercise video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
