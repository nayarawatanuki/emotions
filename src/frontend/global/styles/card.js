import styled, { css } from 'styled-components';

export const App = styled.div``;

export const Container = styled.main`
    min-width: 0;
    padding: clamp(1rem, 4vw, 2.5rem);
`;

export const Card = styled.div`
    width: 100%;
    max-width: 48rem;
    min-width: 0;
    margin-inline: auto;
    padding: clamp(1rem, 4vw, 2rem);
    background: #fff;
    color: #203237;
    border-radius: 1rem;
    box-shadow: 8px 8px 0 rgb(0 0 0 / 10%);
    overflow-wrap: break-word;

    h1 {
        font-size: clamp(1.5rem, 4vw, 2rem);
        margin-block-end: 1rem;
    }

    input, select, textarea {
        min-width: 0;
        max-width: 100%;
    }
`;

export const WideCard = styled(Card)`
    max-width: 90rem;
`;

export const CardToolbar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-block-end: 1rem;

    > a {
        margin-inline-start: auto;
    }

    @media (width < 480px) {
        flex-direction: column;
        align-items: center;

        > a {
            margin-inline-start: 0;
        }
    }
`;

export const BaseTable = styled.table`
    width: 100%;
    table-layout: auto;
    margin-block-start: 1rem;
    text-align: start;

    &.table th, &.table td {
        vertical-align: middle;
        padding: 0.75rem;
        border-color: #c4d7db;
    }

    thead th {
        background: #edf7f8;
        color: #153f48;
        overflow-wrap: normal;
        word-break: normal;
    }

    tbody tr:nth-child(even) {
        background: #f5fafb;
    }

    .legacy-cell-label { display: none; }

    .legacy-cell-label,
    .legacy-cell-value {
        overflow-wrap: normal;
        word-break: normal;
        hyphens: none;
        text-wrap: pretty;
    }

    .legacy-cell-value--free-text {
        overflow-wrap: break-word;
    }
`;

const stackedRows = css`
    display: block;
    thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    > tbody {
        display: grid;
        gap: 1rem;
    }

    tbody tr {
        display: grid;
        border: 1px solid #a6c4c9;
        border-radius: 0.75rem;
        background: #fff;
        padding: clamp(0.65rem, 3vw, 1.1rem);
    }

    td {
        display: grid;
        grid-template-columns: minmax(0, 7.25rem) minmax(0, 1fr);
        align-items: center;
        gap: 0.6rem;
        padding: 0.5rem 0.25rem;
    }

    td:first-child {
        border-top: 0;
    }

    .legacy-cell-label {
        display: block;
        color: #153f48;
        font-weight: 600;
    }

    td input {
        max-width: none;
        width: 100%;
        text-align: start;
    }

    td:has(> details) {
        display: block;
    }

    td:has(> details) .legacy-cell-label {
        display: none;
    }

    td:last-child,
    td:has(> a.btn) {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
    }

    td:last-child .legacy-cell-label,
    td:has(> a.btn) .legacy-cell-label {
        flex-basis: 100%;
    }
`;

export const Table = styled(BaseTable)`
    &.table th,
    &.table td {
        padding-inline: clamp(0.5rem, 0.85vw, 0.75rem);
    }

    .legacy-rate-cell .legacy-cell-value {
        white-space: nowrap;
    }

    @media (width >= 77rem) {
        .legacy-name-cell { min-inline-size: 16ch; }
        .legacy-note-cell { min-inline-size: 14ch; }
    }

    td input {
        width: 100%;
        min-width: 0;
        max-width: 100%;
    }

    td input:not([readonly]) {
        padding: 0.45rem;
        border: 1px solid #647d83;
        border-radius: 0.4rem;
        text-align: start;
        background: #fff;
    }

    @media (width < 77rem) {
        &.legacy-record-table { ${stackedRows} }
    }

    @media (width < 480px) {
        &.legacy-compact-table { ${stackedRows} }

        &.table td {
            grid-template-columns: minmax(0, 1fr);
            gap: 0.25rem;
        }

        td input { min-width: 0; }
    }
`;
