import React, { useEffect, useId, useRef } from 'react';

import { legacyMediaUrl } from '../../services/api';
import './styles.css';

function ActivityReward({ title, rewards, celebrate, buttonLabel, onClose }) {
  const dialog = useRef(null);
  const heading = useRef(null);
  const headingId = useId();

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
    heading.current.focus();
  }, []);

  return (
    <dialog ref={dialog} className="legacy-dialog activity-reward" aria-labelledby={headingId} onClose={onClose}>
      {celebrate && (
        <div className="activity-confetti" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <h2 id={headingId} ref={heading} tabIndex={-1}>{title}</h2>
      {rewards.map((reward) => (
        <section key={reward.id}>
          <h3>{reward.message}</h3>
          {reward.photo && <img src={legacyMediaUrl(reward.photo)} alt="" />}
        </section>
      ))}
      <footer className="activity-reward-footer">
        <button type="button" className="activity-reward-button" onClick={() => dialog.current.close()}>
          {buttonLabel}
        </button>
      </footer>
    </dialog>
  );
}

export default ActivityReward;
