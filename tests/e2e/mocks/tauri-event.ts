export interface Event<T> {
  event: string;
  payload: T;
  id: number;
}

export type EventCallback<T> = (event: Event<T>) => void;
export type UnlistenFn = () => void;

export async function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  console.log('Mock listen:', event);
  return () => {
    console.log('Mock unlisten:', event);
  };
}