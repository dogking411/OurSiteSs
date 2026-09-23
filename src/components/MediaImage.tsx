import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../data/store';
import { PhotoViewer } from './PhotoViewer';

/**
 * Картинка, которая живёт в хранилище облака.
 *
 * Адаптер возвращает временную подписанную ссылку — поэтому при размонтировании
 * ссылку обязательно отдаём обратно адаптеру.
 */
export function MediaImage({
  mediaId,
  alt,
  className,
  onOpen,
}: {
  mediaId: string | null;
  alt: string;
  className?: string;
  /** Если передан, картинка становится кнопкой: клик открывает просмотр. */
  onOpen?: () => void;
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

  const image = <img src={url} alt={alt} className={className} loading="lazy" />;
  if (!onOpen) return image;

  return (
    <button type="button" className="photo-button" onClick={onOpen} title="Открыть фотографию">
      {image}
    </button>
  );
}

/**
 * Состояние просмотрщика фотографий.
 *
 * Экран держит его у себя и передаёт `open` каждой картинке, а `viewer`
 * подмешивает в разметку один раз — открытая фотография всегда одна.
 */
export function usePhotoViewer(): { open: (mediaId: string, alt: string) => void; viewer: ReactNode } {
  const [current, setCurrent] = useState<{ id: string; alt: string } | null>(null);

  return {
    open: (mediaId, alt) => setCurrent({ id: mediaId, alt }),
    viewer: current ? (
      <PhotoViewer mediaId={current.id} alt={current.alt} onClose={() => setCurrent(null)} />
    ) : null,
  };
}
