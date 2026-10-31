import React, { useState, useEffect, useLayoutEffect } from 'react';
import Swal from 'sweetalert2'
import api from '../../../services/api';

import '../../../global/styles/fireworks/style.css';
import '../../../global/styles/instruction/style.css';
import GlobalStyle from '../../../global/styles';
import { App, Container, Content, Label } from './styles';

import { Link, useHistory } from 'react-router-dom';
import { useKidContext } from '../../../context/kidContext';
import { useTaskContext } from '../../../context/taskContext';

function Task3() {
  const {kid_name} = useKidContext();
  const {task_id} = useTaskContext();
  const [task, setTask] = useState([]);
  const [reward, setReward] = useState([]);
  
  const [time, setTime] = useState(0);
  const [response, setResponse] = useState();
  const [tries, setTries] = useState(1);
  const [status, setStatus] = useState('realizada');
  
  const [isActive, setIsActive] = useState(true);
  const history = useHistory();

  useLayoutEffect(() => {
    api.get(`/${kid_name}/tasks/taskListOne/${task_id}`)
    .then((response) => {
      setTask([response.data]);
    }).catch((error) => {
        console.error('error', error) 
    });
  }, [kid_name, task_id]);

  useLayoutEffect(() => {
    api.get(`/tasks/${task_id}/listRewards`)
    .then((response) => {
      setReward(response.data);
      console.log(reward);
    }).catch((error) => {
        console.error('error', error) 
    });
  }, [task_id]);

  useEffect(() => {
    let interval = null;
    if(isActive){
      interval = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    } else if(!isActive && time !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  function openReward() {
  reward.forEach((reward) => {
    Swal.fire({
      title: reward.message,
      imageUrl: reward.photo,
      html: `
        <div class="pyro">
          <div class="before"></div>
          <div class="after"></div>
        </div>
      `
    });
  });
}

  async function allowDrop(e) {
    await e.preventDefault();
  }

  async function drag(e) {
    await e.dataTransfer.setData("text", e.target.id);
  }

  async function drop(e) {
    await e.preventDefault();
    var data = e.dataTransfer.getData("text");
    e.target.appendChild(document.getElementById(data));
  }

  function stopTime() {
    setIsActive(false);
    setTime(time);
    setResponse(response);
  }

  async function create(){  

    await api.post(
        `/tasks/${task_id}/createdTaskResult`,
        { task_id, response, tries, time },
        
        //window.alert('Atividade finalizada!')
        )
        .then(response => 
        console.log(JSON.stringify({
            "task_id": task_id,
            "response": response,
            "tries": tries,
            "time": time
        })),
        console.log("Enviado!")
    );
  }

  async function updateTask() {

    await api.put(`/tasks/${task_id}/updatedTask`,
    { status }
    ).then(response => {
      console.log(response);
      console.log(JSON.stringify({
          "status": status
      }));
      console.log("Task atualizada!");
    });
  }

  const sendTask = async () => {
    await create();
    //updateTask();
    history.push('/Tasks');
  }

  return (
    <App>
      <nav className="navbar navbar-light bg-light">
        <div>
          <button className="button button-danger" onClick={() => history.push('/Tasks')}>SAIR</button>
        </div>
        <h4 className="instruction">
          Associando palavra a imagem {'>>'} <br/>
        </h4>
        <h1></h1>     
      </nav>
      <Container>
        <Content>
          {task.map((task) => {
            return (
              <form encType='multipar/form-data' fit-content="true" key={task.id}>
                <div className='row' style={{marginTop: '2%', justifyContent: 'center'}}>
                  <img display="center"
                    onDragOver={(e)=> allowDrop(e)} 
                    onDrop={()=> {                        
                      if( response === task.emotion ) {                        
                        stopTime();
                        openReward();
                        sendTask();
                      } else {
                        setTries(tries+1);
                        console.log('tentativas: ', tries);
                        stopTime();

                        if(task.response1 === task.emotion){
                          document.getElementById('emotion1').style.boxShadow = '0 0 1em green';
                        } else if(task.response2 === task.emotion) {
                          document.getElementById('emotion2').style.boxShadow = '0 0 1em green';
                        } else if(task.response3 === task.emotion) {
                          document.getElementById('emotion3').style.boxShadow = '0 0 1em green';
                        }
                      }
                    }}
                    align="center"  
                    src={task.image} 
                  />
                </div>

                <div className="row" style={{marginTop: '5%', justifyContent: 'center'}}>
                  <Label id="emotion1" name="emotion1" style={{marginRight: '4%', border: '5px double #ae8625', background: '-webkit-gradient(linear, left top, center top, from(#ae8625), to(#e6bc53)'}}
                    value={task.response1}
                    draggable={true} 
                    onDragStart={(e)=> {drag(e); setResponse(task.response1)}}
                    >{task.response1}
                  </Label>

                  <Label id="emotion2" name="emotion2" style={{marginRight: '4%', border: '5px double #ae8625', background: '-webkit-gradient(linear, left top, center top, from(#ae8625), to(#e6bc53)'}}
                    value={task.response2} 
                    draggable={true} 
                    onDragStart={(e)=> {drag(e); setResponse(task.response2)}}
                    >{task.response2}
                  </Label>

                  <Label id="emotion3" name="emotion3" style={{border: '5px double #ae8625', background: '-webkit-gradient(linear, left top, center top, from(#ae8625), to(#e6bc53)'}}
                    value={task.response3}
                    draggable={true} 
                    onDragStart={(e)=> {drag(e); setResponse(task.response3)}}
                    >{task.response3}
                  </Label>
                </div>
              </form>
            )
          })}

          <div className="row" style={{marginTop: '5%', justifyContent: 'right'}}>
            <button className="button button-save"
              onClick={(e) => {
                Swal.fire({
                  title: 'Tem certeza que deseja finalizar a tarefa?',
                  text: 'Uma vez finalizada, não poderá refazê-la',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Finalizar',
                  cancelButtonText: 'Recomeçar'
                }).then((result) => {
                  if (result.isConfirmed) {
                    Swal.fire({
                      title: 'Resultados salvos',
                      icon: 'success'
                    }).then(() => {
                      e.preventDefault();
                      sendTask();
                    });
                  } else {
                    setTries(1);
                    setTime(0);
                    setIsActive(true);
                  }
                });
                stopTime();
                console.log('time: ', time);
              }}
            >CONCLUIR</button>
          </div>
        </Content>
        <GlobalStyle />
      </Container>
    </App>
  )
}

export default Task3;