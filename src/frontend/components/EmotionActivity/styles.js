import styled from 'styled-components';

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

    @media (width < 480px) {
        justify-content: center;
    }

    legend {
        font-size: 1.125rem;
        font-weight: 600;
    }
`;

export const Answer = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 48px;
    max-width: 100%;
    padding: 0.5rem 0.9rem;
    border: 2px solid var(--emotion-border, #537b83);
    border-radius: 0.8rem;
    background: var(--emotion-background, #edf7f8);
    color: #203237;
    font: inherit;
    font-weight: 700;
    line-height: 1.3;
    text-align: center;

    .emotion-answer-icon {
        flex: none;
        font-size: 1.4em;
        line-height: 1;
    }

    &[data-emotion='joy'] { --emotion-background: #fff3cd; --emotion-border: #875a13; }
    &[data-emotion='anger'] { --emotion-background: #ffe9e7; --emotion-border: #9b3c38; }
    &[data-emotion='sadness'] { --emotion-background: #e8f1ff; --emotion-border: #345e93; }
    &[data-emotion='fear'] { --emotion-background: #f2eaff; --emotion-border: #694b95; }
    &[data-emotion='surprise'] { --emotion-background: #ffefdf; --emotion-border: #8c4c23; }
    &[data-emotion='disgust'] { --emotion-background: #e9f5dd; --emotion-border: #4a682a; }

    &:is(button) {
        cursor: pointer;
    }

    &:is(button):hover {
        box-shadow: inset 0 0 0 1px currentColor;
    }

    &[aria-disabled='true'] {
        cursor: wait;
    }
`;
