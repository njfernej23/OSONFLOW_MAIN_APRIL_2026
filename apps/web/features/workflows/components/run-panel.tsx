import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Edge, Node } from 'reactflow';
import type {
  ButtonOption,
  ButtonsNodeData,
  CardNodeData,
  ConditionNodeData,
  GenericNodeData,
  ImageNodeData,
  MessageNodeData,
  NodeData,
  SetVariableNodeData,
  RuntimeVariables
} from '../lib/types';

type LogItem = {
  id: string;
  nodeId?: string;
  kind: 'message' | 'system' | 'image' | 'card';
  text: string;
  alt?: string;
  title?: string;
  imageUrl?: string;
  buttons?: ButtonOption[];
};

type RunPanelProps = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  autoStartKey?: number;
  onAutoStartComplete?: () => void;
  onClose?: () => void;
};

type RunnerIconName = 'reset' | 'close';

const createLogId = () => `log_${Math.random().toString(36).slice(2, 10)}`;

const RunnerIcon = ({ name }: { name: RunnerIconName }) => {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'reset') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
};

const evaluateCondition = (
  data: ConditionNodeData,
  variables: RuntimeVariables
) => {
  const left = variables[data.key] ?? '';
  if (data.operator === 'equals') {
    return left === data.value;
  }
  return left !== data.value;
};

const RunPanel = ({
  nodes,
  edges,
  autoStartKey,
  onAutoStartComplete,
  onClose
}: RunPanelProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState<LogItem[]>([]);
  const [variables, setVariables] = useState<RuntimeVariables>({});
  const [pendingButtons, setPendingButtons] = useState<ButtonOption[] | null>(
    null
  );
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]));
  }, [nodes]);

  const edgesBySource = useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      const list = map.get(edge.source) ?? [];
      list.push(edge);
      map.set(edge.source, list);
    });
    return map;
  }, [edges]);

  const getNextNodeId = useCallback((sourceId: string, handleId?: string | null) => {
    const outgoing = edgesBySource.get(sourceId) ?? [];
    if (handleId) {
      return outgoing.find((edge) => edge.sourceHandle === handleId)?.target ?? null;
    }

    return (
      outgoing.find((edge) => !edge.sourceHandle)?.target ??
      outgoing[0]?.target ??
      null
    );
  }, [edgesBySource]);

  const executeFrom = useCallback((
    startId: string | null,
    startVars: RuntimeVariables,
    startLog: LogItem[]
  ) => {
    let currentId = startId;
    let vars = { ...startVars };
    const nextLog = [...startLog];
    let nextButtons: ButtonOption[] | null = null;
    let waitingNodeId: string | null = null;

    while (currentId) {
      const node = nodeMap.get(currentId);
      if (!node) {
        nextLog.push({
          id: createLogId(),
          kind: 'system',
          text: 'Encountered a missing node. Stopping run.'
        });
        currentId = null;
        break;
      }

      switch (node.type) {
        case 'start': {
          currentId = getNextNodeId(node.id);
          break;
        }
        case 'message': {
          const data = node.data as MessageNodeData;
          nextLog.push({
            id: createLogId(),
            kind: 'message',
            text: data.text || 'Message step.'
          });
          currentId = getNextNodeId(node.id);
          break;
        }
        case 'image': {
          const data = node.data as ImageNodeData;
          nextLog.push({
            id: createLogId(),
            kind: data.url ? 'image' : 'system',
            text: data.url || 'Image step is missing a URL.',
            alt: data.alt
          });
          currentId = getNextNodeId(node.id);
          break;
        }
        case 'card': {
          const data = node.data as CardNodeData;
          nextLog.push({
            id: createLogId(),
            nodeId: node.id,
            kind: 'card',
            text: data.description || '',
            title: data.title || 'Card',
            alt: data.alt,
            buttons: data.buttons,
            imageUrl: data.url
          });

          if (data.buttons.length > 0) {
            nextButtons = data.buttons;
            waitingNodeId = node.id;
            currentId = null;
          } else {
            currentId = getNextNodeId(node.id);
          }
          break;
        }
        case 'setVariable': {
          const data = node.data as SetVariableNodeData;
          const key = data.key || 'variable';
          const value = data.value || '';
          vars = { ...vars, [key]: value };
          nextLog.push({
            id: createLogId(),
            kind: 'system',
            text: `Set ${key} = ${value || '(empty)'}.`
          });
          currentId = getNextNodeId(node.id);
          break;
        }
        case 'condition': {
          const data = node.data as ConditionNodeData;
          const result = evaluateCondition(data, vars);
          nextLog.push({
            id: createLogId(),
            kind: 'system',
            text: `Condition is ${result ? 'true' : 'false'}.`
          });
          currentId = getNextNodeId(node.id, result ? 'true' : 'false');
          break;
        }
        case 'component': {
          const data = node.data as GenericNodeData;
          nextLog.push({
            id: createLogId(),
            kind: 'system',
            text: `Component${data.label ? ` "${data.label}"` : ''} completed.`
          });
          currentId = getNextNodeId(node.id);
          break;
        }
        case 'end': {
          const data = node.data as GenericNodeData;
          const message = data.description?.trim();
          nextLog.push({
            id: createLogId(),
            kind: message ? 'message' : 'system',
            text: message || 'Conversation ended.'
          });
          currentId = null;
          break;
        }
        case 'buttons': {
          const data = node.data as ButtonsNodeData;
          nextButtons = data.buttons;
          waitingNodeId = node.id;
          nextLog.push({
            id: createLogId(),
            kind: 'system',
            text: 'Awaiting button input.'
          });
          currentId = null;
          break;
        }
        default: {
          currentId = getNextNodeId(node.id);
          break;
        }
      }
    }

    if (!currentId && !nextButtons) {
      nextLog.push({
        id: createLogId(),
        kind: 'system',
        text: 'Chat has ended'
      });
    }

    return { vars, nextLog, nextButtons, waitingNodeId };
  }, [getNextNodeId, nodeMap]);

  const startRun = useCallback(() => {
    const startNode = nodes.find((node) => node.type === 'start') ?? nodes[0];
    if (!startNode) {
      setLog([
        { id: createLogId(), kind: 'system', text: 'Add nodes to run.' }
      ]);
      return;
    }

    const result = executeFrom(startNode.id, {}, []);

    setLog(result.nextLog);
    setVariables(result.vars);
    setPendingButtons(result.nextButtons);
    setPendingNodeId(result.waitingNodeId);
    setIsRunning(Boolean(result.nextButtons));
  }, [executeFrom, nodes]);

  useEffect(() => {
    if (!autoStartKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      startRun();
      onAutoStartComplete?.();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [autoStartKey, onAutoStartComplete, startRun]);

  const resetRun = () => {
    setIsRunning(false);
    setLog([]);
    setVariables({});
    setPendingButtons(null);
    setPendingNodeId(null);
  };

  const handleButton = (buttonId: string) => {
    if (!pendingNodeId) {
      return;
    }

    const result = executeFrom(
      getNextNodeId(pendingNodeId, buttonId),
      variables,
      log
    );

    setLog(result.nextLog);
    setVariables(result.vars);
    setPendingButtons(result.nextButtons);
    setPendingNodeId(result.waitingNodeId);
    setIsRunning(Boolean(result.nextButtons));
  };

  const pendingButtonOwnerType = pendingNodeId
    ? nodeMap.get(pendingNodeId)?.type
    : null;

  return (
    <section className="chat-runner">
      <div className="chat-runner-header">
        <h2>Chat</h2>
        <div className="chat-runner-actions">
          <button type="button" onClick={resetRun} title="Reset chat" aria-label="Reset chat">
            <RunnerIcon name="reset" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} title="Close chat" aria-label="Close chat">
              <RunnerIcon name="close" />
            </button>
          )}
        </div>
      </div>
      <div className="chat-runner-body">
        {log.length === 0 ? (
          <div className="chat-empty-state">Start the workflow to preview the chat.</div>
        ) : (
          <>
            <div className="chat-start-label">Start workflow</div>
            {log.map((item) =>
              item.kind === 'system' && item.text === 'Chat has ended' ? (
                <div key={item.id} className="chat-ended-divider">
                  <span>Chat has ended</span>
                </div>
              ) : item.kind === 'message' ? (
                <div
                  key={item.id}
                  className={`chat-message ${item.kind}`}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              ) : item.kind === 'image' ? (
                <div key={item.id} className="chat-image-message">
                  <img src={item.text} alt={item.alt || 'Workflow image'} />
                </div>
              ) : item.kind === 'card' ? (
                <article key={item.id} className="chat-card-message">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.alt || item.title || 'Workflow card'} />
                  )}
                  <div className="chat-card-content">
                    <h3>{item.title}</h3>
                    {item.text && (
                      <div
                        className="chat-card-description"
                        dangerouslySetInnerHTML={{ __html: item.text }}
                      />
                    )}
                    {item.buttons && item.buttons.length > 0 && (
                      <div className="chat-card-buttons">
                        {item.buttons.map((button) => (
                          <button
                            key={button.id}
                            type="button"
                            onClick={() => handleButton(button.id)}
                            disabled={!isRunning || pendingNodeId !== item.nodeId}
                          >
                            {button.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ) : (
                <div key={item.id} className={`chat-message ${item.kind}`}>
                  {item.text}
                </div>
              )
            )}
          </>
        )}
        {pendingButtons && pendingButtons.length > 0 && pendingButtonOwnerType !== 'card' && (
          <div className="chat-choice-list">
            {pendingButtons.map((button) => (
              <button
                key={button.id}
                className="chat-choice"
                onClick={() => handleButton(button.id)}
                disabled={!isRunning}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="chat-runner-footer">
        <button className="chat-start-button" onClick={startRun}>
          {log.length === 0 ? 'Start workflow' : 'Start new chat'}
        </button>
      </div>
    </section>
  );
};

export default RunPanel;
