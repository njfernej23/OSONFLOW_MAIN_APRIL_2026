import { createContext, useContext } from 'react';

type RenameNode = (nodeId: string, name: string) => void;

export const NodeRenameContext = createContext<RenameNode | null>(null);

export const useNodeRename = () => useContext(NodeRenameContext);
