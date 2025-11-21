import { useState } from 'react';

export function useToggleSelection(initialIds: string[] = []) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

    const toggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(selectedId => selectedId !== id)
                : [...prev, id]
        );
    };

    const isSelected = (id: string) => selectedIds.includes(id);

    const clear = () => setSelectedIds([]);

    const selectAll = (ids: string[]) => setSelectedIds(ids);

    const setSelected = (ids: string[]) => setSelectedIds(ids);

    return {
        selectedIds,
        toggle,
        isSelected,
        clear,
        selectAll,
        setSelected,
    };
}
