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
    overflow-wrap: break-word;

    h1 {
        font-size: clamp(1.5rem, 5vw, 2rem);
    }
`;
