import { apiRoutes, pageRoutes, routeWithParams } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton, DirectoryActions } from '../../../components/ActionButton';
import DataTable from '../../../components/DataTable';
import swal from 'sweetalert';
import React, { useState, useEffect} from 'react';
import { useLocation } from 'react-router-dom';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import api, { legacyMediaUrl } from '../../../services/api';
import { useKidContext } from "../../../context/kidContext";
import ActivityList from "../../../components/ProfessionalAccess/ActivityList";

function KidActivities() {

    const [list, setList] = useState([]);
    const { kidId: selectedId, saveId } = useKidContext();
    const { search } = useLocation();
    const kidId = /^\?\d+$/.test(search) ? search.slice(1) : selectedId;
    const [kid, setKid] = useState(null);

    const [result, setResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!kidId) return;
        let active = true;
        setKid(null);
        setLoading(true);
        setLoadError('');
        Promise.all([
            api.get(routeWithParams(apiRoutes.kid, { kid_id: kidId })),
            api.get(routeWithParams(apiRoutes.kidActivities, { kid_id: kidId })),
            api.get(routeWithParams(apiRoutes.kidActivityResults, { kid_id: kidId })),
        ]).then(([profile, activities, results]) => {
            if (!active) return;
            setKid(profile.data);
            setList(activities.data);
            setResult(results.data);
        }).catch(() => {
            if (active) setLoadError('Não foi possível carregar as atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kidId]);

    async function updateActivity({id, name, type, emotion}){ 

        if(name !== "" && type !== "" && emotion !== ""){
            await api.put(routeWithParams(apiRoutes.activity, { activity_id: id }),
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
            title: 'Tem certeza que deseja excluir a atividade?',
            text: 'Uma vez deletada, não poderá recuperá-la',
            icon: 'warning',
            buttons: ["Não", "Excluir"]
          }).then((willDeletar) => {
            if(willDeletar) {
                console.log("id delete", id);

                api.delete(routeWithParams(apiRoutes.activity, { activity_id: id }))
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
            <PageHeader title="Atividades" heading
            start={<ActionButton to={pageRoutes.kids} className="tcc-button-link">Voltar</ActionButton>} />
            <Container>
                <Content>
                    <form encType='multipar/form-data' fit-content="true">
                        {kid && (
                            <DirectoryActions>
                                <div className="chip">
                                    {kid.photo && <img src={legacyMediaUrl(kid.photo)} alt="" />}
                                    {kid.name}
                                </div>
                                <ActionButton to={{ pathname: pageRoutes.addActivity, search: String(kidId) }}
                                    icon="add" aria-label="Adicionar atividade"
                                    onClick={() => saveId(kidId)} />
                            </DirectoryActions>
                        )}

                        <DataTable key={kidId} title="Atividades"
                            columns={['Imagem', 'Nome', 'Emoção', 'Situação', 'Alternativas de resposta',
                                'Resultado', 'Ações']}
                            rows={list} loading={loading} error={loadError}
                            emptyMessage="Nenhuma atividade cadastrada."
                            renderRow={(activity) => (
                                <ActivityList key={activity.id} activity={activity}
                                    result={result.find((item) => String(item.activity_id) === String(activity.id))}
                                    updateActivity={updateActivity} deleteActivity={deleteActivity} />
                            )} />
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>  
    );
}

export default KidActivities;