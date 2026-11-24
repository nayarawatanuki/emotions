import styled, { css } from 'styled-components';

const dragActive = css`
    border-color: #55a296;
`;

const dragReject = css`
    border-color: #e07575;
`;

export const DropContainer = styled.div.attrs({
    className: "dropzone"
})`
    border: 1px dashed #949494;
    border-radius: 4px;
    cursor: pointer;

    transition: height 0.2s ease;

    ${props => props.isDragActive && dragActive};
    ${props => props.isDragReject && dragReject};
`;

const messageColors = {
    default: '#595959',
    error: '#874646',
    success: '#33615a',
};

export const UploadMessage = styled.p`
    display: flex;
    color: ${props => messageColors[props.type || 'default']};
    justify-content: center;
    padding: 15px 0;
`;