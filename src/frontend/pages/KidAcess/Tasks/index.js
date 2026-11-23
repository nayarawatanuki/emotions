import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../../components/PageHeader';
import api, { legacyMediaUrl } from '../../../services/api';

import { App, Container, Content } from './styles';

import ActivityReward from '../../../components/ActivityReward';
import TaskList, { taskColumns } from '../../../components/mappings/TaskList';
import DataTable from '../../../components/DataTable';
import { useKidContext } from "../../../context/kidContext";
import { useLocation } from 'react-router-dom';

function Tasks() {

    const [kid, setKid] = useState([]);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [results, setResults] = useState([]);
    const [reward, setReward] = useState(null);
    const [loadingReward, setLoadingReward] = useState(false);
    const [rewardError, setRewardError] = useState('');
    const rewardTrigger = useRef(null);
    const {kid_id, kid_name} = useKidContext();

    const title = useRef(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.fromCompletion) title.current?.focus();
    }, [location.state]);

    useEffect(() => {
        if(kid_id && kid_name){
        api.get(`/${kid_id}/listKid`)
        .then((response) => {
            setKid([response.data])
        }).catch((error) => {
            console.error('error', error)
        });}
    },[kid_id, kid_name]);

    useEffect(() => {
        if (!kid_id || !kid_name) return;
        let active = true;
        setLoading(true);
        setLoadError('');
        api.get(`/tasks/${kid_id}/${kid_name}/listTasks`).then(({ data }) => {
            if (active) setList(data);
        }).catch(() => {
            if (active) setLoadError('Não foi possível carregar suas atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kid_id, kid_name]);

    useEffect(() => {
        if (!kid_id) return;
        let active = true;
        api.get(`/tasks/${kid_id}/listTaskResult`).then(({ data }) => {
            if (active) setResults(data);
        }).catch(() => {
            if (active) setRewardError('Não foi possível consultar as recompensas. Recarregue a página para tentar novamente.');
        });
        return () => { active = false; };
    }, [kid_id]);

    async function reviewReward(task, trigger) {
        if (loadingReward) return;
        rewardTrigger.current = trigger;
        setLoadingReward(true);
        setRewardError('');
        try {
            const { data } = await api.get(`/tasks/${task.id}/listRewards`);
            setReward({ title: task.name, items: data });
        } catch {
            setRewardError('Não foi possível abrir a recompensa. Tente novamente.');
        } finally {
            setLoadingReward(false);
        }
    }

  
    return (
        <App>
            <PageHeader>
                <h1 ref={title} tabIndex={-1}>Atividades da {kid_name}</h1>
            </PageHeader>

            <Container>
                <Content>
                    {kid.map((child) => (
                        <div className="chip" key={child.id}>
                            {child.photo && <img src={legacyMediaUrl(child.photo)} alt="" />}
                            {child.name}
                        </div>
                    ))}
                    <DataTable title="Atividades da criança" variant="compact" columns={taskColumns} rows={list}
                        loading={loading} error={loadError} emptyMessage="Você ainda não tem atividades."
                        renderRow={(task, columns) => (
                            <TaskList key={task.id} columns={columns} task={task}
                                canReviewReward={results.some((result) =>
                                    String(result.task_id) === String(task.id) && result.response === task.emotion)}
                                loadingReward={loadingReward} onReviewReward={reviewReward} />
                        )} />
                </Content>
                {rewardError && <p role="alert">{rewardError}</p>}
                {reward && (
                    <ActivityReward title={`Recompensa: ${reward.title}`}
                        rewards={reward.items.length ? reward.items : [{ id: 'completion', message: 'Parabéns! Você acertou.' }]}
                        celebrate buttonLabel="Fechar recompensa"
                        onClose={() => {
                            setReward(null);
                            rewardTrigger.current?.focus();
                        }}
                    />
                )}
            </Container>   
        </App>
    );
}

export default Tasks;