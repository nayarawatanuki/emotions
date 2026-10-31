import React, { useContext, useState, useEffect } from 'react'

export const TaskContext = React.createContext()

const TaskProvider = ({ children }) => {
    const [task_id, setTask_id] = useState();

    console.log("task ", task_id)

    useEffect(() => {
        const savedTask = window.sessionStorage.getItem('task');
        if(savedTask) {
            const {id} = JSON.parse(savedTask);
            console.log('id: ', id);
            setTask_id(id);
        }
    }, [])

    function saveId(id) {
        const savedTask = window.sessionStorage.getItem('task');
        const savedKidJSON = JSON.parse(savedTask) || {}
        
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidJSON, id}));
        setTask_id(id);
    }

    return (
        <TaskContext.Provider
            value={{
                task_id,
                saveId
            }}
        >
            {children}
        </TaskContext.Provider>
    )
}

export default TaskProvider

export function useTaskContext() {
    const context = useContext(TaskContext)

    if (!context) {
        console.error();
        throw new Error('useTaskContext must be used within a TaskContext.Provider.')
    }

    return context
}