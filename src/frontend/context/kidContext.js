import React, { useContext, useState, useEffect } from 'react'

export const KidContext = React.createContext()

const KidProvider = ({ children }) => {
    const [kidId, setKidId] = useState();
    const [kidName, setKidName] = useState();
    const [kidPhoto, setKidPhoto] = useState();


    useEffect(() => {
        const savedKid = window.sessionStorage.getItem('kid');
        if(savedKid) {
            const {id, name, photo} = JSON.parse(savedKid);
            console.log('id: ', id, name, photo);
            setKidId(id);
            setKidName(name);
            setKidPhoto(photo);
        }
    }, [])

    function saveId(id) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidData = JSON.parse(savedKid) || {}
        
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidData, id}));
        setKidId(id);
    } 

    function saveName(name) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidData = JSON.parse(savedKid) || {}
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidData, name}));
        setKidName(name);
    }

    function savePhoto(photo) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidData = JSON.parse(savedKid) || {}
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidData, photo}));
        setKidPhoto(photo);
    }
    
    return (
        <KidContext.Provider
            value={{
                kidId,
                saveId,

                kidName,
                saveName,

                kidPhoto,
                savePhoto
            }}
        >
            {children}
        </KidContext.Provider>
    )
}

export default KidProvider

export function useKidContext() {
    const context = useContext(KidContext)

    if (!context) {
        throw new Error('useKidContext must be used within a KidContext.Provider.')
    }

    return context
}