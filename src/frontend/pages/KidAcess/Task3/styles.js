import styled from 'styled-components';

export const Container = styled.main`
    padding: clamp(1rem, 4vw, 3rem);
`;

export const Content = styled.div`
    width: min(100%, 48rem);
    margin: 0 auto;
    padding: clamp(1rem, 4vw, 2rem);
    background: #fff;
    color: #203237;
    border-radius: 1rem;
    overflow-wrap: anywhere;

    h1 {
        font-size: clamp(1.5rem, 5vw, 2rem);
    }
`;

export const ActivityImage = styled.img`
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1rem auto;
`;

export const Answers = styled.fieldset`
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    min-width: 0;
    margin-block: 1.5rem 1rem;

    legend {
        font-size: 1.125rem;
        font-weight: 600;
    }
`;

export const Answer = styled.button`
    min-height: 44px;
    max-width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid #537b83;
    border-radius: 0.6rem;
    background: #fff;
    color: #23434a;
    cursor: pointer;

    &:hover {
        background: #eaf3f4;
    }

    &[aria-disabled='true'] {
        cursor: wait;
    }
`;
