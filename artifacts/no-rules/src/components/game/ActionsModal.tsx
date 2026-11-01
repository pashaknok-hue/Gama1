import { X } from 'lucide-react';
import type { ActionId, ActionInfo } from '../../game/simulation';

export default function ActionsModal({
  actions,
  onSelect,
  onClose,
}: {
  actions: ActionInfo[];
  onSelect: (actionId: ActionId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="nr-action-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="nr-action-dialog" role="dialog" aria-modal="true" aria-labelledby="nr-action-title">
        <header className="nr-action-dialog-head">
          <div>
            <div className="nr-eyebrow">{actions.length ? 'ПОСИЛЬНОЕ ЗАНЯТИЕ' : 'ЗАБОТА БЛИЗКИХ'}</div>
            <h2 id="nr-action-title">{actions.length ? 'Что сделать сейчас?' : 'Первые годы жизни'}</h2>
          </div>
          <button className="nr-modal-close" type="button" onClick={onClose} aria-label="Закрыть список действий" data-testid="button-close-actions">
            <X size={18} />
          </button>
        </header>
        <div className="nr-action-options" data-testid="modal-actions-list">
          {!actions.length && <p data-testid="infant-actions-note">Младенец ещё не выбирает занятия самостоятельно. О нём заботятся близкие, а события жизни появляются с течением времени.</p>}
          {actions.map((action) => (
            <button
              className="nr-action-option"
              key={action.id}
              type="button"
              onClick={() => onSelect(action.id)}
              data-testid={`modal-action-${action.id}`}
            >
              <span>
                <strong>{action.title}</strong>
                <small>{action.description}</small>
              </span>
              <i aria-hidden="true">→</i>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
