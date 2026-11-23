import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { legacyMediaUrl } from '../../../services/api';
import { DataRow } from '../../DataTable';
import { Preview, Input } from './styles';

const fields = [
  { name: 'treatment', label: 'Tratamento' },
  { name: 'user', label: 'Usuário', freeText: true },
  { name: 'code', label: 'Novo código', inputMode: 'numeric', type: 'password' },
  { name: 'name', label: 'Nome' },
  { name: 'rate', label: 'Grau' },
  { name: 'birth', label: 'Nascimento' },
  { name: 'parent', label: 'Responsável' },
  { name: 'note', label: 'Observações', freeText: true },
];

export const kidColumns = [
  { key: 'photo', label: 'Foto' },
  ...fields.map(({ name, label }) => ({ key: name, label, className: `legacy-${name}-cell` })),
  { key: 'activities', label: 'Atividades' },
  { key: 'actions', label: 'Ações' },
];

function KidList({ columns, kid, updateKid, deleteKid }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function edit() {
    setDraft(Object.fromEntries(fields.map(({ name }) => [name, name === 'code' ? '' : kid[name] ?? ''])));
  }

  async function save() {
    if (saving || !draft) return;
    setSaving(true);
    try {
      const { code, ...details } = draft;
      if (await updateKid(kid.id, { ...details, ...(code ? { code } : {}) })) setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  const fieldCells = Object.fromEntries(fields.map(({ name, label, inputMode, type = 'text', freeText }) => [
    name,
    draft ? (
      <Input aria-label={label} name={name} type={type} inputMode={inputMode}
        value={draft[name]} disabled={saving}
        onChange={(event) => {
          const { value } = event.target;
          setDraft((previous) => ({ ...previous, [name]: value }));
        }} />
    ) : (
      <span className={freeText ? 'legacy-cell-value legacy-cell-value--free-text' : 'legacy-cell-value'}>
        {name === 'code' ? '—' : kid[name] || '—'}
      </span>
    ),
  ]));

  return <DataRow columns={columns} cells={{
    photo: kid.photo && <Preview src={legacyMediaUrl(kid.photo)} alt="" />,
    ...fieldCells,
    activities: (
      <>
        <Link to={{ pathname: '/addTask3', search: String(kid.id) }}
          className="btn btn-sm btn-info" aria-label={`Adicionar atividade para ${kid.name}`}>
          <i className="fas fa-plus" aria-hidden="true" />
        </Link>
        <Link to={{ pathname: '/Activities', search: String(kid.id) }}
          className="btn btn-sm btn-info" aria-label={`Ver atividades de ${kid.name}`}>
          <i className="fas fa-list" aria-hidden="true" />
        </Link>
      </>
    ),
    actions: (
      <>
        <button type="button" className="btn btn-sm btn-info" disabled={Boolean(draft)}
          aria-label={`Editar ficha de ${kid.name}`} onClick={edit}>
          <i className="fas fa-edit" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-sm btn-success" disabled={!draft || saving}
          aria-label={`Salvar ficha de ${kid.name}`} onClick={save}>
          <i className="fas fa-save" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-sm btn-danger"
          aria-label={`Excluir ficha de ${kid.name}`} onClick={() => deleteKid(kid.id)}>
          <i className="fas fa-trash-alt" aria-hidden="true" />
        </button>
      </>
    ),
  }} />;
}

export default KidList;
