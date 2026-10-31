import React, { useContext, useState, useEffect } from 'react'

export const KidContext = React.createContext()

const KidProvider = ({ children }) => {
    const [kid_id, setKid_id] = useState();
    const [kid_name, setKid_name] = useState();
    const [kid_photo, setKid_photo] = useState();

    console.log("kid ", kid_id);

    useEffect(() => {
        const savedKid = window.sessionStorage.getItem('kid');
        if(savedKid) {
            const {id, name, photo} = JSON.parse(savedKid);
            console.log('id: ', id, name, photo);
            setKid_id(id);
            setKid_name(name);
            setKid_photo(photo);
        }
    }, [])

    function saveId(id) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidJSON = JSON.parse(savedKid) || {}
        
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidJSON, id}));
        setKid_id(id);
    } 

    function saveName(name) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidJSON = JSON.parse(savedKid) || {}
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidJSON, name}));
        setKid_name(name);
    }

    function savePhoto(photo) {
        const savedKid = window.sessionStorage.getItem('kid');
        const savedKidJSON = JSON.parse(savedKid) || {}
        window.sessionStorage.setItem('kid', JSON.stringify({...savedKidJSON, photo}));
        setKid_photo(photo);
    }
    
    return (
        <KidContext.Provider
            value={{
                kid_id,
                saveId,

                kid_name,
                saveName,

                kid_photo,
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