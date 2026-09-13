import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { MediaImage } from '../../components/MediaImage';
import { usePerson } from '../../data/profile';
import { useStore } from '../../data/store';
import { newId, nowIso, PEOPLE, type PersonId, type WishItem, type WishPriority } from '../../data/schema';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from './wishHelpers';

/** Создание и правка желания. */
export function WishForm({
  owner,
  wish,
  onClose,
}: {
  owner: PersonId;
  wish: WishItem | null;
  onClose: () => void;
}) {
  const { save, adapter } = useStore();
  const person = usePerson();

  const [title, setTitle] = useState(wish?.title ?? '');
  const [note, setNote] = useState(wish?.note ?? '');
  const [url, setUrl] = useState(wish?.url ?? '');
  const [price, setPrice] = useState(wish?.price ?? '');
  const [priority, setPriority] = useState<WishPriority>(wish?.priority ?? 'normal');
  const [imageId, setImageId] = useState<string | null>(wish?.imageId ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSave = title.trim().length > 0 && !busy && !uploading;

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const id = await adapter.putMedia(file, file.name);
      // Старую картинку убираем только после успешной загрузки новой.
      if (imageId) await adapter.deleteMedia(imageId).catch(() => undefined);
      setImageId(id);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSave) return;
    setBusy(true);
    const now = nowIso();
    const next: WishItem = wish
      ? { ...wish, title: title.trim(), note, url, price, priority, imageId, updatedAt: now }
      : {
          id: newId('wish'),
          owner,
          title: title.trim(),
          note,
          url,
          price,
          priority,
          status: 'open',
          reservedBy: null,
          imageId,
          createdAt: now,
          updatedAt: now,
          createdBy: person,
        };
    await save('wishes', next);
    setBusy(false);
    onClose();
  }

  return (
    <Modal
      title={wish ? 'Правим желание' : `Новое желание для ${PEOPLE[owner].genitive}`}
      onClose={onClose}
      footer={
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn" onClick={handleSubmit} disabled={!canSave}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="wish-title">Что это</label>
        <input
          id="wish-title"
          className="input"
          value={title}
          autoFocus
          placeholder="Например, наушники или поездка в Питер"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSubmit();
          }}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="wish-priority">Насколько хочется</label>
          <select
            id="wish-priority"
            className="select"
            value={priority}
            onChange={(event) => setPriority(event.target.value as WishPriority)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wish-price">Цена</label>
          <input
            id="wish-price"
            className="input"
            value={price}
            placeholder="около 5000 ₽"
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="wish-url">Ссылка</label>
        <input
          id="wish-url"
          className="input"
          value={url}
          placeholder="https://…"
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="wish-note">Заметка</label>
        <textarea
          id="wish-note"
          className="textarea"
          value={note}
          placeholder="Размер, цвет, почему именно это"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="field">
        <label>Картинка</label>
        <div className="row">
          {imageId ? <MediaImage mediaId={imageId} alt="" className="thumb" /> : null}
          <label className="btn btn-ghost btn-sm">
            {uploading ? 'Загружаем…' : imageId ? 'Заменить' : 'Выбрать файл'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void handleImage(event.target.files?.[0])}
            />
          </label>
          {imageId ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                const id = imageId;
                setImageId(null);
                void adapter.deleteMedia(id).catch(() => undefined);
              }}
            >
              Убрать
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
