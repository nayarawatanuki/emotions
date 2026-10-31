import React, { Component } from 'react';

import Dropzone from 'react-dropzone';

import { DropContainer, UploadMessage } from './styles';

export default class Upload extends Component {
    renderDragMessage = (isDragActive, isDragReject) => {
        if(!isDragActive) {
            return <UploadMessage>Arraste o arquivo aqui</UploadMessage>
        }

        if(isDragReject) {
            return <UploadMessage type="error">Arquivo náo suportado</UploadMessage>
        }

        return <UploadMessage type="success">Solte o arquivo aqui</UploadMessage>
    };
    
    render() {
        const { onUpload } = this.props;

        return (
            <Dropzone accept="image/*" onDropAccepted={onUpload} multiple={false} maxFiles={1}>
                { ({ getRootProps, getInputProps, isDragActive, isDragReject}) => (
                    <DropContainer
                        {...getRootProps()}
                        isDragActive={isDragActive}
                        isDragReject={isDragReject}
                    >
                        <input {... getInputProps()} />
                        {this.renderDragMessage(isDragActive, isDragReject)}
                    </DropContainer>
                ) }
            </Dropzone>
        );
    }
}