import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content, Table } from './styles';

import TaskList from '../../../components/TaskList';
import { useKidContext } from "../../../context/kidContext";
import { Link } from 'react-router-dom';

function Tasks() {

    const [kid, setKid] = useState([]);
    const [list, setList] = useState([]);
    const {kid_id, kid_name, kid_photo, savePhoto} = useKidContext();

    useEffect(() => {
        if(kid_id && kid_name){
        api.get(`/${kid_id}/listKid`)
        .then((response) => {
            console.log({kids: response.data})
            setKid([response.data])
        }).catch((error) => {
            console.error('error', error)
        });}
    },[kid_id, kid_name]);

    useEffect(() => {
        if(kid_id && kid_name){
        api.get(`/tasks/${kid_id}/${kid_name}/listTasks`)
        .then((response) => {
            console.log({tasks: response.data})
            setList(response.data)
        }).catch((error) => {
            console.error('error', error)
        });}
    },[kid_id, kid_name]);
  
    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h1></h1>
                <h5 className="navbar-brand float-center">Atividades da {kid_name}</h5>
                <h1> </h1>
            </nav>

            <Container>
                <Content>
                    <form >
                        <div className="form-row">
                            {kid.map((kid) => {
                                savePhoto(kid.photo);
                                return(
                                    <div className="chip" key={kid.id}>
                                        <img src={kid.photo}></img>
                                        {kid.name}
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{marginTop: '4%'}}>
                            <Table className= "table table-responsive table-selectable">
                                <thead>
                                    <tr>
                                        <th hidden={true}>id</th>
                                        <th hidden={true}>kid_id</th>
                                        <th>tarefas</th>
                                        <th>status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {list.map((task) => {
                                        return (   
                                            <TaskList key={task.id}
                                                task={task} 
                                            />
                                        );
                                    })}
                                </tbody>
                            </Table>                                
                        </div>            
                    </form>
                </Content>
                <GlobalStyle />
            </Container>   
        </App>
    );
}

export default Tasks;