import React, { useState } from 'react';
import styled from 'styled-components';

import { Table } from '../../global/styles/card';

const Pagination = styled.nav`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-block-start: 1rem;
`;

export function DataRow({ columns, cells }) {
    return (
        <tr role="row">
            {columns.map(({ key, label, className }) => (
                <td key={key} className={className} role="cell">
                    <span className="legacy-cell-label" aria-hidden="true">{label}</span>
                    {cells[key]}
                </td>
            ))}
        </tr>
    );
}

export default function DataTable({
    title, columns, rows, renderRow, variant = 'record', pageSize = 10,
    loading = false, error = '', emptyMessage = 'Nenhum registro encontrado.',
}) {
    const [requestedPage, setPage] = useState(1);
    const pageCount = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
    const page = Math.min(requestedPage, pageCount);

    if (!loading && !error && requestedPage !== page) setPage(page);

    const start = pageSize ? (page - 1) * pageSize : 0;
    const visibleRows = pageSize ? rows.slice(start, start + pageSize) : rows;

    if (loading || error || !rows.length) {
        return <p role={error ? 'alert' : 'status'}>{loading ? 'Carregando…' : error || emptyMessage}</p>;
    }

    return (
        <>
            <Table className={`table legacy-${variant}-table`} role="table">
                <caption className="sr-only">{title}</caption>
                <thead role="rowgroup">
                    <tr role="row">
                        {columns.map(({ key, label }) => (
                            <th key={key} role="columnheader" scope="col">{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody role="rowgroup">
                    {visibleRows.map((row) => renderRow
                        ? renderRow(row, columns)
                        : <DataRow key={row.id} columns={columns} cells={row} />)}
                </tbody>
            </Table>
            {pageCount > 1 && (
                <Pagination aria-label={`Paginação de ${title}`}>
                    <button type="button" className="btn" aria-disabled={page === 1}
                        onClick={() => setPage(Math.max(1, page - 1))}>Anterior</button>
                    <span role="status">Página {page} de {pageCount} · {start + 1}–{start + visibleRows.length} de {rows.length}</span>
                    <button type="button" className="btn" aria-disabled={page === pageCount}
                        onClick={() => setPage(Math.min(pageCount, page + 1))}>Próxima</button>
                </Pagination>
            )}
        </>
    );
}
