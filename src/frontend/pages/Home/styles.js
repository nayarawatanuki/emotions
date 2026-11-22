import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Container = styled.main`
    display: grid;
    place-items: start center;
    padding: clamp(2rem, 8vw, 5rem) 1rem 3rem;
`;

export const Content = styled.div`
    display: grid;
    gap: 1rem;
    width: min(100%, 34rem);
    padding: clamp(1.5rem, 5vw, 3rem);
    background: #fff;
    color: #203237;
    border-radius: 1rem;
    box-shadow: 0 12px 30px rgb(32 50 55 / 12%);

    h1 {
        margin: 0 0 0.5rem;
        font-size: clamp(1.75rem, 5vw, 2.5rem);
    }
`;

export const NavBrand = styled.div`
    display: flex;
    align-items: center;
`;

export const SpectrumRibbon = styled.img`
    display: block;
    width: 2.5rem;
    height: auto;
    transform: rotate(-18deg);
`;

export const EmotionPieces = styled.div`
    display: flex;
    gap: 0.45rem;
    padding-block-start: 0.55rem;

    span {
        position: relative;
        width: 1.45rem;
        height: 1.45rem;
        border-radius: 0.2rem;
        background: var(--piece-color);
    }

    span::before,
    span::after {
        position: absolute;
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        content: '';
    }

    span::before {
        inset-block-start: -0.38rem;
        inset-inline-start: 0.44rem;
        background: inherit;
    }

    span::after {
        inset-block-start: 0.45rem;
        inset-inline-end: -0.3rem;
        background: #fff;
    }

    span:nth-child(1) { --piece-color: #d8ab52; }
    span:nth-child(2) { --piece-color: #729fac; }
    span:nth-child(3) { --piece-color: #c98285; }
`;

export const AccessLink = styled(Link)`
    display: block;
    padding: 0.75rem 1rem;
    border: 1px solid #537b83;
    border-radius: 0.6rem;
    color: #23434a;
    font-weight: 600;
    text-align: center;
    text-decoration: none;

    &:hover {
        background: #eaf3f4;
        color: #23434a;
        text-decoration: none;
    }
`;
