import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import ribbon from './spectrum-ribbon.png';

const Header = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem clamp(0.75rem, 4vw, 2rem);
  background: #f8f9fa;
`;

const Ribbon = styled.img`
  display: block;
  width: clamp(2rem, 6vw, 2.5rem);
  height: auto;
  transform: rotate(-18deg);
`;

const HeaderContent = styled.div`
  &.navbar {
    min-width: 0;
    padding: 0;
  }
`;

function PageHeader({ children, title, backTo }) {
  return (
    <Header>
      <Ribbon src={ribbon} alt="" />
      <HeaderContent className="navbar navbar-light">
        {backTo && <Link className="button button-info" to={backTo}>Voltar</Link>}
        {title && <h1>{title}</h1>}
        {children}
      </HeaderContent>
    </Header>
  );
}

export default PageHeader;
