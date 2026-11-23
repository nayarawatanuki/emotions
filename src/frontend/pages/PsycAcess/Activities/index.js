import ConfirmationDialog from '../../../components/ConfirmationDialog';
import ActivityReward from '../../../components/ActivityReward';
import ActivityReport from '../../../components/ActivityReport';
import PageHeader from '../../../components/PageHeader';
import React, { useState, useEffect} from 'react';
import { Link, useLocation } from 'react-router-dom';

import { App, Container, Content, Toolbar } from './styles';

import api, { legacyMediaUrl } from '../../../services/api';
import { useKidContext } from '../../../context/kidContext';
import ActivityList, { activityColumns } from '../../../components/PsycAcess/ActivityList';
import DataTable from '../../../components/DataTable';

function TasksKid() {

    const [list, setList] = useState([]);
    const [result, setResult] = useState([]);
    const [child, setChild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const { kid_id: selectedChild } = useKidContext();
    const { search } = useLocation();
    const kidId = /^\?\d+$/.test(search) ? search.slice(1) : selectedChild;

    useEffect(() => {
        if (!kidId) {
            setLoading(false);
            setLoadError('Selecione uma criança para consultar as atividades.');
            return;
        }
        let active = true;
        setLoading(true);
        setLoadError('');
        Promise.all([
            api.get(`/${kidId}/listKid`),
            api.get(`/kids/${kidId}/listTasks`),
            api.get(`/tasks/${kidId}/listTaskResult`),
        ]).then(([childResponse, tasksResponse, resultsResponse]) => {
            if (!active) return;
            setChild(childResponse.data);
            setList(tasksResponse.data);
            setResult(resultsResponse.data);
        }).catch(() => {
            if (active) setLoadError('Não foi possível carregar as atividades.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [kidId]);

    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleteStatus, setDeleteStatus] = useState('');
    const [reward, setReward] = useState(null);
    const [loadingReward, setLoadingReward] = useState(false);
    const [rewardStatus, setRewardStatus] = useState('');
    const [report, setReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportStatus, setReportStatus] = useState('');

    async function openReport(activity, trigger) {
        if (loadingReport) return;
        setLoadingReport(true);
        setReportStatus('Preparando relatório…');

        try {
            const { data } = await api.get(`/tasks/${activity.id}/listRewards`);
            setReport({ activity, rewards: data, trigger });
            setReportStatus('');
        } catch {
            setReportStatus('Não foi possível preparar o relatório. Tente novamente.');
        } finally {
            setLoadingReport(false);
        }
    }

    async function reviewReward(activity, trigger) {
        if (loadingReward) return;
        setLoadingReward(true);
        setRewardStatus('');

        try {
            const { data } = await api.get(`/tasks/${activity.id}/listRewards`);
            if (data.length) {
                setReward({ title: activity.name, items: data, trigger });
            } else {
                setRewardStatus(`Nenhuma recompensa cadastrada para ${activity.name}.`);
            }
        } catch {
            setRewardStatus('Não foi possível abrir a recompensa. Tente novamente.');
        } finally {
            setLoadingReward(false);
        }
    }

    async function confirmDeletion(confirmed) {
        const id = pendingDelete;
        setPendingDelete(null);
        if (!confirmed) return;

        try {
            await api.delete(`/deletedTask/${id}`);
            setList((items) => items.filter((item) => item.id !== id));
            setDeleteStatus('Exclusão concluída.');
        } catch {
            setDeleteStatus('Não foi possível excluir. Tente novamente.');
        }
    }

    return (
        <App>
            <PageHeader title="Atividades" backTo="/Kids" />
            <Container>
                <Content>
                    <div>
                        {child && (
                            <Toolbar>
                                <div className="chip">
                                    {child.photo && <img src={legacyMediaUrl(child.photo)} alt="" />}
                                    {child.name}
                                </div>
                                <Link to={{ pathname: "/addTask3", search: String(kidId) }}
                                    className="btn legacy-primary-action">
                                    Adicionar atividade
                                </Link>
                            </Toolbar>
                        )}
                        <div role="status">{rewardStatus}</div>
                        <div role="status">{reportStatus}</div>
                        <DataTable key={kidId} title="Atividades" columns={activityColumns} rows={list}
                            loading={loading} error={loadError} emptyMessage="Nenhuma atividade cadastrada."
                            renderRow={(activity, columns) => (
                                <ActivityList key={activity.id} columns={columns} activity={activity}
                                    result={result.find((item) => String(item.task_id) === String(activity.id))}
                                    deleteActivity={setPendingDelete} loadingReward={loadingReward}
                                    onReviewReward={reviewReward} loadingReport={loadingReport}
                                    onPrintReport={openReport} />
                            )} />
                    </div>
                </Content>
            </Container>
            {deleteStatus && <p role="status" className="legacy-operation-status">{deleteStatus}</p>}
            {report && (
                <ActivityReport activity={report.activity} child={child} rewards={report.rewards}
                    results={result.filter((item) => String(item.task_id) === String(report.activity.id))}
                    onClose={() => {
                        setReport(null);
                        report.trigger.focus();
                    }} />
            )}
            {reward && (
                <ActivityReward title={`Recompensa: ${reward.title}`} rewards={reward.items}
                    buttonLabel="Fechar recompensa" onClose={() => {
                        setReward(null);
                        reward.trigger.focus();
                    }} />
            )}
            {pendingDelete !== null && (
                <ConfirmationDialog title="Excluir atividade?"
                    message="Esta ação é permanente."
                    confirmLabel="Excluir" danger onClose={confirmDeletion} />
            )}
        </App>  
    );
}

export default TasksKid;
