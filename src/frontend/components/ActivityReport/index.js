import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { legacyMediaUrl } from '../../services/api';
import EmotionActivity from '../EmotionActivity';
import DataTable from '../DataTable';
import './styles.css';

const resultColumns = [
  { key: 'response', label: 'Resposta' },
  { key: 'tries', label: 'Tentativas' },
  { key: 'time', label: 'Tempo' },
];

function ReportContent({ activity, child, results, rewards, headingId }) {
  return (
    <article className="activity-report">
      <header className="activity-report-heading">
        <p>Emotions · Relatório de atividade</p>
        <h2 id={headingId}>{activity.name}</h2>
        <p>{child?.name} · {activity.status === 'realizada' ? 'Realizada' : activity.status}</p>
      </header>

      <section className="activity-report-exercise" aria-label="Atividade apresentada">
        <EmotionActivity activity={activity} />
      </section>

      <section>
        <h3>Resultados</h3>
        <p><strong>Emoção esperada:</strong> {activity.emotion}</p>
        <DataTable title="Resultados da atividade" variant="print" pageSize={0} columns={resultColumns}
          rows={results.map((result) => ({ ...result, time: result.time == null ? '—' : `${result.time} s` }))}
          emptyMessage="Nenhum resultado registrado para esta atividade." />
      </section>

      <section>
        <h3>Observações da ficha da criança</h3>
        <p className="activity-report-note">{child?.note?.trim() || 'Nenhuma observação registrada.'}</p>
      </section>

      <section>
        <h3>Imagem da recompensa</h3>
        {rewards.length ? rewards.map((item) => (
          <img key={item.id} src={legacyMediaUrl(item.photo)} alt="Imagem da recompensa cadastrada" />
        )) : <p>Nenhuma imagem de recompensa cadastrada.</p>}
      </section>
    </article>
  );
}

export default function ActivityReport({ activity, child, results, rewards, onClose }) {
  const dialog = useRef(null);
  const printArea = useRef(null);
  const headingId = useId();
  const report = { activity, child, results, rewards: rewards.filter((item) => item.photo) };

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  async function printReport() {
    const images = [...printArea.current.querySelectorAll('img')];
    await Promise.allSettled(images.map((image) => image.decode()));
    if (printArea.current) window.print();
  }

  return (
    <>
      <dialog className="legacy-dialog activity-report-preview" ref={dialog} aria-labelledby={headingId} onClose={onClose}>
        <ReportContent {...report} headingId={headingId} />
        <footer className="legacy-actions">
          <button type="button" className="btn" onClick={printReport}>Imprimir ou salvar em PDF</button>
          <button type="button" className="btn" onClick={() => dialog.current.close()}>Fechar relatório</button>
        </footer>
      </dialog>
      {createPortal(
        <div className="activity-report-print" ref={printArea}>
          <ReportContent {...report} />
        </div>,
        document.body,
      )}
    </>
  );
}
