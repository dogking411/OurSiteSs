import { useEffect, useState } from 'react';
import { useStore } from '../data/store';

/**
 * Просмотр фотографии во весь экран с возможностью открыть её в отдельной
 * вкладке и сохранить на компьютер.
 *
 * Скачивание идёт через fetch и blob, а не простой ссылкой с атрибутом
 * download: файлы лежат на домене Supabase, а для чужого домена браузер этот
 * атрибут игнорирует и просто открывает картинку. Забрав её в blob, мы делаем
 * ссылку «своей», и сохранение работает как ожидается.
 */
export function PhotoViewer({
  mediaId,
  alt,
  onClose,
}: {
  mediaId: string;
  alt: string;
  onClose: () => void;
}) {
  const { adapter } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleDownload() {
    if (!url) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileNameFor(mediaId, blob.type);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не получилось скачать');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="viewer" role="dialog" aria-modal="true" aria-label={alt || 'Фотография'}>
        <div className="viewer-stage">
          {url ? <img src={url} alt={alt} /> : <span className="page-sub">Загружаем…</span>}
        </div>

        <div className="viewer-bar">
          {error ? <span className="tag">{error}</span> : null}
          <span className="spacer" />
          <a
            className="btn btn-ghost btn-sm"
            href={url ?? '#'}
            target="_blank"
            rel="noreferrer noopener"
          >
            Открыть отдельно
          </a>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void handleDownload()}
            disabled={!url || saving}
          >
            {saving ? 'Скачиваем…' : 'Скачать'}
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Имя сохраняемого файла. id вида «img_ab12cd/photo.jpg» несёт исходное имя
 * после косой черты — его и берём, а если там пусто, собираем своё.
 */
function fileNameFor(mediaId: string, mimeType: string): string {
  const tail = mediaId.split('/').pop() ?? '';
  if (tail && /\.[a-zA-Z0-9]{2,5}$/.test(tail)) return tail;
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  return `foto-${mediaId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}.${extension}`;
}
