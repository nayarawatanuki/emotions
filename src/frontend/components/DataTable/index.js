import { ActionButton } from '../ActionButton';
import React, { useState } from 'react';
import styled from 'styled-components';

const Table = styled.table`
    width: auto;
    margin-top: 4%;
    text-align: center;

    &.table th,
    &.table td {
        vertical-align: middle;
    }
`;

const ScrollRegion = styled.div`
    position: relative;
    inline-size: 100%;
    max-inline-size: 100%;
    overflow-x: auto;

    .btn {
        min-inline-size: 24px;
        min-block-size: 24px;
    }

`;

const Pagination = styled.nav`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
`;

const pageSize = 10;

export default function DataTable({ title, columns, rows, renderRow, loading, error, emptyMessage }) {
    const [requestedPage, setPage] = useState(1);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(requestedPage, pages);
    if (!loading && !error && page !== requestedPage) setPage(page);

    if (loading || error || !rows.length) {
        return <p role={error ? 'alert' : 'status'}>{loading ? 'Carregando…' : error || emptyMessage}</p>;
    }

    const start = (page - 1) * pageSize;
    return (
        <>
            <ScrollRegion className="table-responsive" role="region" aria-label={title} tabIndex={0}>
            <Table className="table table-selectable">
                <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{title}</caption>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column} scope="col">
                                {column === 'Ações' ? <span className="sr-only">{column}</span> : column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{rows.slice(start, start + pageSize).map(renderRow)}</tbody>
            </Table>
            </ScrollRegion>
            {pages > 1 && (
                <Pagination aria-label={`Paginação de ${title}`}>
                    <ActionButton type="button" className="btn btn-outline-info" aria-disabled={page === 1}
                        onClick={() => setPage(Math.max(1, page - 1))}>Anterior</ActionButton>
                    <span role="status">Página {page} de {pages}</span>
                    <ActionButton type="button" className="btn btn-outline-info" aria-disabled={page === pages}
                        onClick={() => setPage(Math.min(pages, page + 1))}>Próxima</ActionButton>
                </Pagination>
            )}
        </>
    );
}
