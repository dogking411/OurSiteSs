import { useEffect, useState } from 'react';
import { useStore } from '../data/store';

/**
 * Картинка, которая живёт в хранилище (IndexedDB или облако).
 *
 * Адаптер возвращает либо blob:-ссылку, либо временную подписанную — поэтому
 * при размонтировании ссылку обязательно отдаём обратно адаптеру, иначе браузер
 * будет держать blob в памяти до перезагрузки вкладки.
 */
export function MediaImage({
  mediaId,
  alt,
  className,
}: {
  mediaId: string | null;
  alt: string;
  className?: string;
}) {
  const { adapter } = useStore();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }
    let alive = true;
    let acquired: string | null = null;

    void adapter.getMediaUrl(mediaId).then((next) => {
      if (!alive) {
        if (next) adapter.releaseMedia(next);
        return;
      }
      acquired = next;
      setUrl(next);
    });

    return () => {
      alive = false;
      if (acquired) adapter.releaseMedia(acquired);
    };
  }, [adapter, mediaId]);

  if (!mediaId || !url) return null;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
