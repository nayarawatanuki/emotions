import styled from 'styled-components';

export const App = styled.div``;

export const Container = styled.main`
    padding: clamp(0.75rem, 4vw, 2rem);
`;

export const Content = styled.div`
    width: min(100%, 48rem);
    margin: auto;
    background: #fff;
    border-radius: 10px;
    box-shadow: 12px 12px 0 rgb(0 0 0 / 10%);
    padding: clamp(0.75rem, 4vw, 2rem);
    overflow-wrap: break-word;
`;
