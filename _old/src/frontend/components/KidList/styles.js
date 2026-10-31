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
                margin-left= 5px;
                cursor: pointer;
            }
        }
    }
`;

export const Preview = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 5px;
    background-image: url(${props => props.src});
    background-repeat: no-repeat;
    background-size: cover;
    background-position: 50% 50%;
    margin-right: 10px;
`;

export const Input = styled.input`
    width: 90px;
    padding: 0;
    margin: 0;
    border: 0;
    cursor: default;
    text-align: center;
    background-color: transparent;
`;