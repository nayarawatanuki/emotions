import styled from 'styled-components';

export const Header = styled.header`
    &.navbar {
        flex-wrap: nowrap;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
    }

    h1 {
        margin: 0;
        font-size: clamp(0.875rem, 3.4vw, 1.25rem);
        font-weight: 500;
    }

    .button {
        margin: 0;
    }
`;

export const Container = styled.main`
    display: flex;
    justify-content: center;
    margin: 5%;
`;

export const Content = styled.div`
    min-width: 0;
    max-width: 100%;
    padding: clamp(0.75rem, 4vw, 1.875rem);
    border-radius: 10px;
    background: #fff;
    box-shadow: 20px 20px 0 rgb(0 0 0 / 10%);

    .tcc-task-feedback {
        margin: 0;
    }

    .tcc-task-feedback:not(:empty) {
        margin-top: 0.5rem;
    }
`;

export const ActivityImage = styled.img`
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
`;

export const Answers = styled.fieldset`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 80px));
    justify-content: center;
    gap: 6%;
    min-width: 0;
    margin-block-start: 10%;
`;

export const Answer = styled.button`
    min-height: 30px;
    min-width: 0;
    overflow-wrap: anywhere;
    border: 5px double #ae8625;
    border-radius: 17%;
    background: linear-gradient(to right, #ae8625, #e6bc53);
    color: #212529;
    cursor: pointer;

    &:hover {
        box-shadow: 0 0 0.5rem #ae8625;
    }

    &[aria-disabled='true'] {
        cursor: wait;
    }
`;

export const FinishButton = styled.button`
    &.button {
        margin: 15% 0 0;
    }
`;
