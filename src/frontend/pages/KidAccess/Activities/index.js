import { apiRoutes, routeWithParams } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import React, { useEffect, useState } from 'react';

import DataTable from '../../../components/DataTable';
import ActivityList from "../../../components/mappings/ActivityList";
import GlobalStyle from '../../../global/styles';
import { useKidContext } from "../../../context/kidContext";
import api, { legacyMediaUrl } from '../../../services/api';
import { App, Container, Content } from './styles';

export default function KidActivities() {
    const [kid, setKid] = useState(null);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { kidId, kidName } = useKidContext();

    useEffect(() => {
        if (!kidId || !kidName) return;
        let active = true;
        setLoading(true);
        setError('');
        Promise.all([
            api.get(routeWithParams(apiRoutes.kid, { kid_id: kidId })),
            api.get(routeWithParams(apiRoutes.kidActivities, { kid_id: kidId })),
        ]).then(([profile, activities]) => {
            if (!active) return;
            setKid(profile.data);
            setList(activities.data);
        }).catch(() => {
            if (active) setError('Não foi possível carregar as atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kidId, kidName]);

    return (
        <App>
            <PageHeader title={kid?.name ? `Atividades de ${kid.name}` : 'Atividades'} heading />
            <Container>
                <Content>
                    {kid && (
                        <div className="form-row">
                            <div className="chip">
                                {kid.photo && <img src={legacyMediaUrl(kid.photo)} alt="" />}
                                {kid.name}
                            </div>
                        </div>
                    )}
                    <div style={{ marginTop: '4%' }}>
                        <DataTable title="Atividades da criança" columns={['Atividade', 'Situação', 'Ações']}
                            rows={list} loading={Boolean(kidId && kidName && loading)} error={error}
                            emptyMessage="Nenhuma atividade disponível."
                            renderRow={(activity) => <ActivityList key={activity.id} activity={activity} />} />
                    </div>
                </Content>
                <GlobalStyle />
            </Container>
        </App>
    );
}
