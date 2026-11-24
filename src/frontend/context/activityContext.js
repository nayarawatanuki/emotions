import React, { useContext, useState, useEffect } from 'react'

export const ActivityContext = React.createContext()

const ActivityProvider = ({ children }) => {
    const [activityId, setActivityId] = useState();

    useEffect(() => {
        const savedActivity = window.sessionStorage.getItem('activity');
        if(savedActivity) {
            const {id} = JSON.parse(savedActivity);
            setActivityId(id);
        }
    }, [])

    function saveId(id) {
        window.sessionStorage.setItem('activity', JSON.stringify({ id }));
        setActivityId(id);
    }

    return (
        <ActivityContext.Provider
            value={{
                activityId,
                saveId
            }}
        >
            {children}
        </ActivityContext.Provider>
    )
}

export default ActivityProvider

export function useActivityContext() {
    const context = useContext(ActivityContext)

    if (!context) {
        console.error();
        throw new Error('useActivityContext must be used within a ActivityContext.Provider.')
    }

    return context
}
