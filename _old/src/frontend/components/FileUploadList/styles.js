import styled from 'styled-components';

export const Container = styled.ul`
    margin-top: 20px;

    li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #444;

        & + li {
            margin-top: 15px;
        }
    }
`;

export const FileInfo = styled.div`
    display: flex;
    align-items: center;

    div {
        display: flex;
        flex-direction: column;

        span {
            color: #999;
            margin-top: 5px;

            button {
                border: 0;
                background: transparent;
                color: #e57878;
                margin-left: 5px;
                cursor: pointer;
                min-height: 24px;
                padding: 4px 8px;
                &:focus-visible {
                 outline: 2px solid #444;
                 outline-offset: 2px;
                }
            }
        }
    }
`;

export const Preview = styled.img`
    width: 36px;
    height: 36px;
    border-radius: 5px;
    object-fit: cover;
    margin-right: 10px;
    flex-shrink: 0;
`;
