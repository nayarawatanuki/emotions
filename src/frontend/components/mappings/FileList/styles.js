import styled from 'styled-components';

export const Container = styled.ul`
    margin-top: 1rem;
    list-style: none;

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
    min-width: 0;
    overflow-wrap: break-word;

    div {
        display: flex;
        flex-direction: column;

        span {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            color: #435a60;
            margin-top: 0.35rem;
        }

    }
`;

export const Preview = styled.img`
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 5px;
    object-fit: cover;
    margin-right: 10px;
`;