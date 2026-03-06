import type {
  BlockchainEvent,
  BlockchainEventType,
} from "@/types/blockchain.types";

// Placeholder event listener — will subscribe to on-chain events when contracts are deployed

export type EventCallback = (event: BlockchainEvent) => void;

const listeners = new Map<BlockchainEventType, EventCallback[]>();

export function onEvent(
  eventType: BlockchainEventType,
  callback: EventCallback,
) {
  const existing = listeners.get(eventType) ?? [];
  existing.push(callback);
  listeners.set(eventType, existing);

  return () => {
    const cbs = listeners.get(eventType) ?? [];
    listeners.set(
      eventType,
      cbs.filter((cb) => cb !== callback),
    );
  };
}

export function emitEvent(event: BlockchainEvent) {
  const cbs = listeners.get(event.event_type) ?? [];
  for (const cb of cbs) {
    cb(event);
  }
}

// TODO: implement with ethers contract.on() when contracts are deployed
export function startEventListener() {
  console.warn(
    "[HealthProof] Event listener not started — contracts not deployed.",
  );
}

export function stopEventListener() {
  listeners.clear();
}
