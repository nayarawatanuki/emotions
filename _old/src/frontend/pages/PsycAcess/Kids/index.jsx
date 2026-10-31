import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'

import GlobalStyle from '../../../global/styles';
import { App, Container, Content, Table } from './styles.js';

import api from '../../../services/api';
import KidList from '../../../components/KidList'

function Kids() {
    const [kids, setKids] = useState([]);

    useEffect(() => {
        api.get('/listKids')
        .then((response) => {
          setKids(response.data)
        });
    }, []);

    async function updateKid(){

        if(name !== "" && rate !== "" && birth !== "" && parent !== "" && note !== ""){
            await api.put(`/updatedKid/${id}`,
              { treatment, name, user, code, rate, birth, parent, note }
            )
            .then(response => {
                console.log(response);
                console.log(JSON.stringify({
                    "tratamento": treatment,
                    "nome": name,
                    "user": user,
                    "codigo": code,
                    "grau": rate,
                    "data de nascimento": birth,
                    "responsavel": parent,
                    "observações": note
                }));
                console.log("Criança atualizada!");
                window.alert('Criança atualizada!');
                document.getElementById("rows").style.backgroundColor = "#fff";
            });
        }else{
            window.alert('Prencha todos oss campos')
        }
    }

    async function deleteKid(id) {
    const result = await Swal.fire({
        title: 'Tem certeza que deseja deletar a criança?',
        text: 'Uma vez deletada, não poderá recuperá-la',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Deletar',
        cancelButtonText: 'Não'
    });

    if (result.isConfirmed) {
        try {
            console.log("id delete", id);

            const response = await api.delete(`/deletedKid/${id}`);

            console.log(response.data);

            const newList = kids.filter((kid) => kid.id !== id);
            setKids(newList);

            await Swal.fire({
                title: 'Criança apagada!',
                icon: 'success'
            });
        } catch (error) {
            console.log(error);
        }
    }
}

    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h1></h1>
                <h5 className="navbar-brand float-center">Crianças</h5>
                <h1> </h1>
            </nav>
            <Container>
                <Content>
                    <form encType='multipar/form-data' fit-content="true">
                        <div className="chip">
                            <img src="data:image/png;base64,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" 
                                alt="Person"/>
                            Crianças
                        </div>
                        <Link to="/addKid">
                            <button  className="btn btn-outline-info">+</button>
                        </Link>
                        <Table className= "table table-responsive table-selectable">
                            <thead>
                                <tr>
                                    <th>foto</th>
                                    <th>tratamento</th>
                                    <th>usuário</th>
                                    <th>código</th>
                                    <th>nome</th>
                                    <th>grau</th>
                                    <th>nascimento</th>
                                    <th>responsável</th>
                                    <th>observações</th>
                                    <th>atividades</th>
                                    <th></th>
                                </tr>
                            </thead>
                            
                            {kids.map((kid) => {
                                return (
                                    <tbody key={kid.id}>
                                        <KidList kid={kid} 
                                            updateKid={updateKid} 
                                            deleteKid={deleteKid} 
                                        />
                                    </tbody>
                                );
                            })}
                                  
                        </Table>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>            
        </App>
    )
}

export default Kids;