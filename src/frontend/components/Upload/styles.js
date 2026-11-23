import styled, { css } from 'styled-components';

const dragActive = css`
    border-color: #28765a;
`;

const dragReject = css`
    border-color: #9c3549;
`;

export const DropContainer = styled.div.attrs({
    className: "dropzone"
})`
    border: 2px dashed #237484;
    background: #edf7f8;
    min-height: 44px;
    border-radius: 0.65rem;
    cursor: pointer;


    ${props => props.isDragActive && dragActive};
    ${props => props.isDragReject && dragReject};
`;

const messageColors = {
    default: '#274d56',
    error: '#9c3549',
    success: '#28765a',
};

export const UploadMessage = styled.p`
    display: flex;
    color: ${props => messageColors[props.type || 'default']};
    justify-content: center;
    padding: 0.75rem;
    margin: 0;
    text-align: center;
`;