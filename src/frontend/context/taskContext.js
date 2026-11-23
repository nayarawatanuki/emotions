import React, { useContext, useState, useEffect } from 'react'

export const TaskContext = React.createContext()

const TaskProvider = ({ children }) => {
    const [task_id, setTask_id] = useState();

    useEffect(() => {
        const savedTask = window.sessionStorage.getItem('task');
        if(savedTask) {
            const {id} = JSON.parse(savedTask);
            setTask_id(id);
        }
    }, [])

    function saveId(id) {
        window.sessionStorage.setItem('task', JSON.stringify({ id }));
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
