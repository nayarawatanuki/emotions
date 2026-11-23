import DataTable from '../../../components/DataTable';
import swal from 'sweetalert';
import React, { useState, useEffect} from 'react';
import { Link, useLocation } from 'react-router-dom';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import api from '../../../services/api';
import { useKidContext } from '../../../context/kidContext';
import ActivityList from '../../../components/PsycAcess/ActivityList';

function TasksKid() {

    const [list, setList] = useState([]);
    const { kid_id: selectedId, saveId } = useKidContext();
    const { search } = useLocation();
    const kid_id = /^\?\d+$/.test(search) ? search.slice(1) : selectedId;
    const [child, setChild] = useState(null);

    const [result, setResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!kid_id) return;
        let active = true;
        setChild(null);
        setLoading(true);
        setLoadError('');
        Promise.all([
            api.get(`/${kid_id}/listKid`),
            api.get(`/kids/${kid_id}/listTasks`),
            api.get(`/tasks/${kid_id}/listTaskResult`),
        ]).then(([profile, tasks, results]) => {
            if (!active) return;
            setChild(profile.data);
            setList(tasks.data);
            setResult(results.data);
        }).catch(() => {
            if (active) setLoadError('Não foi possível carregar as atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kid_id]);

    async function updateActivity({id, name, type, emotion}){ 

        if(name !== "" && type !== "" && emotion !== ""){
            await api.put(`/updatedTask/${id}`,
              { name, type, emotion }
            )
            .then(response => {
                console.log(response);
                console.log(JSON.stringify({
                    "tratamento": name,
                    "codigo": type,
                    "nome": emotion
                }));
                console.log("Atividade atualizada!");
                swal('Atividade atualizada!');
                //document.getElementById("rows").style.backgroundColor = "#fff";
            });
        }else{
            window.alert('Prencha todos os campos')
        }
    }

    async function deleteActivity(id){
        swal({
            title: 'Tem certeza que deseja deletar a tarefa?',
            text: 'Uma vez deletada, não poderá recuperá-la',
            icon: 'warning',
            buttons: ["Não", "Deletar"]
          }).then((willDeletar) => {
            if(willDeletar) {
                console.log("id delete", id);

                api.delete(`/deletedTask/${id}`)
                .then((response) => {
                    console.log(response.data);
                    swal("Atividade apagada!");

                    const newList = list.filter((activity) => activity.id !== id);
                    setList(newList);
                })
                .catch((error)=>{
                    console.log(error);
                });
            }
          })
    }
  
    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <Link to="/Kids" className="button button-info tcc-button-link">Voltar</Link>
                <h5 className="navbar-brand float-center">Atividades</h5>
                <h1> </h1>
            </nav>
            <Container>
                <Content>
                    <form encType='multipar/form-data' fit-content="true">
                        {child && (
                            <>
                                <div className="chip">
                                    {child.photo && <img src={child.photo} alt="" />}
                                    {child.name}
                                </div>
                                <Link to={{ pathname: "/addTask3", search: String(kid_id) }}
                                    className="btn btn-outline-info" aria-label="Adicionar atividade"
                                    onClick={() => saveId(kid_id)}>+</Link>
                            </>
                        )}

                        <DataTable key={kid_id} title="Atividades"
                            columns={['Imagem', 'Nome', 'Emoção', 'Situação', 'Alternativas de resposta',
                                'Resultado', 'Ações']}
                            rows={list} loading={loading} error={loadError}
                            emptyMessage="Nenhuma atividade cadastrada."
                            renderRow={(activity) => (
                                <ActivityList key={activity.id} activity={activity}
                                    result={result.find((item) => String(item.task_id) === String(activity.id))}
                                    updateActivity={updateActivity} deleteActivity={deleteActivity} />
                            )} />
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>  
    );
}

export default TasksKid;