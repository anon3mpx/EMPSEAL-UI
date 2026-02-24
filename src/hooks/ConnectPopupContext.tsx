import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConnectPopupContextType {
    showConnectPopup: boolean;
    openConnectPopup: () => void;
    closeConnectPopup: () => void;
}

const ConnectPopupContext = createContext<ConnectPopupContextType>({
    showConnectPopup: false,
    openConnectPopup: () => { },
    closeConnectPopup: () => { },
});

export function ConnectPopupProvider({ children }: { children: React.ReactNode }) {
    const [showConnectPopup, setShowConnectPopup] = useState(false);

    const openConnectPopup = useCallback(() => setShowConnectPopup(true), []);
    const closeConnectPopup = useCallback(() => setShowConnectPopup(false), []);

    return (
        <ConnectPopupContext.Provider value={{ showConnectPopup, openConnectPopup, closeConnectPopup }}>
            {children}
        </ConnectPopupContext.Provider>
    );
}

export function useConnectPopup() {
    return useContext(ConnectPopupContext);
}
