import {
  ActionDataState,
  DataState,
  HandlerFunction,
  isEventDataState,
  isServerHandlerDataState,
  ServerEventDataState,
  ServerHandlerDataState,
  StateDataState,
} from './template'

/** Server data state */
export type ServerDataState = DataState<ServerEventDataState>

export function isServerEventDataState(obj: any): obj is ServerEventDataState {
  if (!isEventDataState(obj)) {
    return false
  }
  return typeof obj.handler === 'function' || isServerHandlerDataState(obj.handler)
}

export function event(
  func: HandlerFunction | ServerHandlerDataState,
  opts?: {
    actions?: ActionDataState[]
    timeout?: number
  }
): ServerEventDataState {
  return {
    $: 'event',
    handler: func,
    actions: opts?.actions,
    timeout: opts?.timeout,
  }
}

export function action<T = any>(name: T): ActionDataState<T> {
  return {
    $: 'action',
    name,
  }
}

export function withState<T extends Record<string, any>>(
  state: { [K in keyof T]: StateDataState<T[K]> },
  func: HandlerFunction<T>
): ServerHandlerDataState {
  return {
    $: 'handler',
    func,
    state,
  }
}
