import styled from 'styled-components';

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

    .tcc-activity-feedback {
        margin: 0;
    }

    .tcc-activity-feedback:not(:empty) {
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
    background: linear-gradient(to right in srgb, #503809, #6f5518);
    color: #fff;
    cursor: pointer;

    &:hover:not([aria-disabled='true']) {
        background: linear-gradient(to right in srgb, #59410e, #6f5518);
        box-shadow: 0 0 0.5rem #ae8625;
    }

    &:active:not([aria-disabled='true']) {
        background: linear-gradient(to right in srgb, #493107, #59410e);
        box-shadow: none;
    }

    &[aria-disabled='true'] {
        cursor: wait;
    }
`;

export const FinishActions = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-block-start: 15%;

    > .action-outline {
        margin: 0;
    }

    @media (width < 480px) {
        justify-content: center;
    }
`;
