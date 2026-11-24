import React from 'react';

import './styles.css';

export default function PageHeader({ title, heading = false, start, end }) {
    const Title = heading ? 'h1' : 'p';

    return (
        <header className="tcc-page-header">
            <div className="tcc-page-header__start">{start}</div>
            <Title className="tcc-page-header__title">{title}</Title>
            <div className="tcc-page-header__end">{end}</div>
        </header>
    );
}
