import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { MediaImage } from '../../components/MediaImage';
import { usePerson } from '../../data/profile';
import { useStore } from '../../data/store';
import { newId, nowIso, today, type Moment } from '../../data/schema';

/** Создание и правка момента. */
export function MomentForm({ moment, onClose }: { moment: Moment | null; onClose: () => void }) {
  const { save, adapter } = useStore();
  const person = usePerson();

  const [title, setTitle] = useState(moment?.title ?? '');
  const [date, setDate] = useState(moment?.date ?? today());
  const [place, setPlace] = useState(moment?.place ?? '');
  const [text, setText] = useState(moment?.text ?? '');
  const [tags, setTags] = useState((moment?.tags ?? []).join(', '));
  const [imageIds, setImageIds] = useState<string[]>(moment?.imageIds ?? []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSave = title.trim().length > 0 && !busy && !uploading;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const ids = await Promise.all(
        Array.from(files).map((file) => adapter.putMedia(file, file.name)),
      );
      setImageIds((current) => [...current, ...ids]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSave) return;
    setBusy(true);
    const now = nowIso();
    const tagList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const next: Moment = moment
      ? { ...moment, title: title.trim(), date, place, text, tags: tagList, imageIds, updatedAt: now }
      : {
          id: newId('moment'),
          title: title.trim(),
          date,
          place,
          text,
          tags: tagList,
          imageIds,
          createdAt: now,
          updatedAt: now,
          createdBy: person,
        };
    await save('moments', next);
    setBusy(false);
    onClose();
  }

  return (
    <Modal
      title={moment ? 'Правим момент' : 'Новый момент'}
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
        <label htmlFor="moment-title">Что произошло</label>
        <input
          id="moment-title"
          className="input"
          value={title}
          autoFocus
          placeholder="Первый поход в горы"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="moment-date">Когда</label>
          <input
            id="moment-date"
            type="date"
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="moment-place">Где</label>
          <input
            id="moment-place"
            className="input"
            value={place}
            placeholder="Кисловодск"
            onChange={(event) => setPlace(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="moment-text">Как это было</label>
        <textarea
          id="moment-text"
          className="textarea"
          value={text}
          placeholder="Что запомнилось"
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="moment-tags">Теги через запятую</label>
        <input
          id="moment-tags"
          className="input"
          value={tags}
          placeholder="поездки, лето"
          onChange={(event) => setTags(event.target.value)}
        />
      </div>

      <div className="field">
        <label>Фотографии</label>
        <div className="row">
          {imageIds.map((id) => (
            <div key={id} className="thumb-wrap">
              <MediaImage mediaId={id} alt="" className="thumb" />
              <button
                type="button"
                className="thumb-remove"
                aria-label="Убрать фото"
                onClick={() => {
                  setImageIds((current) => current.filter((item) => item !== id));
                  void adapter.deleteMedia(id).catch(() => undefined);
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <label className="btn btn-ghost btn-sm">
            {uploading ? 'Загружаем…' : '+ Фото'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
