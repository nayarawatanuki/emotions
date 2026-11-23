import React, { useEffect, useState } from 'react';

import DataTable from '../../../components/DataTable';
import TaskList from '../../../components/mappings/TaskList';
import GlobalStyle from '../../../global/styles';
import { useKidContext } from '../../../context/kidContext';
import api from '../../../services/api';
import { App, Container, Content, Title } from './styles';

export default function Tasks() {
    const [child, setChild] = useState(null);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { kid_id, kid_name } = useKidContext();

    useEffect(() => {
        if (!kid_id || !kid_name) return;
        let active = true;
        setLoading(true);
        setError('');
        Promise.all([
            api.get(`/${kid_id}/listKid`),
            api.get(`/tasks/${kid_id}/${encodeURIComponent(kid_name)}/listTasks`),
        ]).then(([profile, tasks]) => {
            if (!active) return;
            setChild(profile.data);
            setList(tasks.data);
        }).catch(() => {
            if (active) setError('Não foi possível carregar as atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kid_id, kid_name]);

    return (
        <App>
            <nav className="navbar navbar-light bg-light justify-content-center">
                <Title className="navbar-brand">
                    {child?.name ? `Atividades de ${child.name}` : 'Atividades'}
                </Title>
            </nav>
            <Container>
                <Content>
                    {child && (
                        <div className="form-row">
                            <div className="chip">
                                {child.photo && <img src={child.photo} alt="" />}
                                {child.name}
                            </div>
                        </div>
                    )}
                    <div style={{ marginTop: '4%' }}>
                        <DataTable title="Atividades da criança" columns={['Tarefas', 'Situação', 'Ações']}
                            rows={list} loading={Boolean(kid_id && kid_name && loading)} error={error}
                            emptyMessage="Nenhuma atividade disponível."
                            renderRow={(task) => <TaskList key={task.id} task={task} />} />
                    </div>
                </Content>
                <GlobalStyle />
            </Container>
        </App>
    );
}
