import React, { createContext, useCallback, useContext, useState } from 'react';
import { DynamicIsland, IslandType } from './dynamic-island';

interface IslandContextType {
    showIsland: (type: IslandType, message: string) => void;
}

const IslandContext = createContext<IslandContextType | undefined>(undefined);

export function IslandProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<{ type: IslandType; message: string }>({
        type: 'none',
        message: '',
    });

    const showIsland = useCallback((type: IslandType, message: string) => {
        setState({ type, message });
        // Reset after animation completes (3 seconds)
        setTimeout(() => {
            setState({ type: 'none', message: '' });
        }, 3500);
    }, []);

    return (
        <IslandContext.Provider value={{ showIsland }}>
            {children}
            <DynamicIsland type={state.type} message={state.message} />
        </IslandContext.Provider>
    );
}

export function useIsland() {
    const context = useContext(IslandContext);
    if (!context) {
        throw new Error('useIsland must be used within an IslandProvider');
    }
    return context;
}
