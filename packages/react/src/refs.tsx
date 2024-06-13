import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

import { isStateUpdateAction, LocalState, useLocalState } from './state'
import { Stream } from './streams'
import {
  ActionDataState,
  BaseTemplate,
  ComponentRegistry,
  DataState,
  HandlerEvent,
  isComponentDataState,
  isCompositeDataState,
  isEventDataState,
  isHandlerEvent,
  isResponseDataState,
  Path,
  ReferencedDataState,
  ResponseDataState,
  TemplateEvent,
} from './template'
import { lookupValue } from './utils'

export type Store<T = DataState> = Stream<T>

export type DataSource = {
  get: (key: string) => Store
  sendEvent: (event: HandlerEvent) => Promise<ResponseDataState>
}

/** Refs */
type DataValues = Record<string, DataState>

function extractRefValue(dataValues: DataValues, ref: ReferencedDataState['ref']) {
  const value = lookupValue(dataValues, ref)

  if (isComponentDataState(value)) {
    return {
      ...value,
      path: ref,
    }
  }

  return value
}

export function ref(ref: string | Path): ReferencedDataState {
  return {
    $: 'ref',
    ref: Array.isArray(ref) ? ref : [ref],
  }
}

export function extractRefKey(ref: string | Path) {
  if (typeof ref === 'string') {
    return ref
  }
  return ref[0]
}

function findAllRefs(stateNode: DataState, dataValues: DataValues): Set<string> {
  const currentRefKeys = new Set<string>()
  function searchRefs(stateNode: DataState | object) {
    if (!stateNode || typeof stateNode !== 'object') {
      return
    }
    if (Array.isArray(stateNode)) {
      stateNode.forEach(searchRefs)
      return
    }
    if (!isCompositeDataState(stateNode)) {
      Object.values(stateNode).forEach(searchRefs)
      return
    }
    if (stateNode.$ === 'ref') {
      const refKey = extractRefKey(stateNode.ref)
      if (!currentRefKeys.has(refKey)) {
        currentRefKeys.add(refKey)
        const lastValue = dataValues[refKey]
        searchRefs(lastValue)
      }
      return
    }
    if (stateNode.$ === 'component') {
      searchRefs(stateNode.children)
      searchRefs(stateNode.props)
      return
    }
  }
  searchRefs(stateNode)
  return currentRefKeys
}

function createRefStateManager(
  dataValues: DataValues,
  setDataValues: Dispatch<SetStateAction<DataValues>>,
  dataSource: DataSource,
  rootKey: string
) {
  let refSubscriptions: Record<string, () => void> = {}
  function setRefValue(refKey: string, value: DataState) {
    if (dataValues[refKey] !== value) {
      dataValues = { ...dataValues, [refKey]: value }
      setDataValues(dataValues)
      return true
    }
    return false
  }
  function ensureSubscription(key: string) {
    if (!refSubscriptions[key]) {
      const refValueProvider = dataSource.get(key)
      refSubscriptions[key] = refValueProvider.subscribe((value) => {
        const didUpdate = setRefValue(key, value)
        if (didUpdate) {
          performSubscriptions()
        }
      })
      setRefValue(key, refValueProvider.get())
    }
  }
  function performSubscriptions() {
    ensureSubscription(rootKey)
    const rootState = dataSource.get(rootKey).get()
    const referencedRefs = findAllRefs(rootState, dataValues)
    referencedRefs.add(rootKey)
    referencedRefs.forEach(ensureSubscription)
    Object.entries(refSubscriptions).forEach(([key, release]) => {
      if (!referencedRefs.has(key)) {
        release()
        delete refSubscriptions[key]
      }
    })
  }
  function releaseSubscriptions() {
    Object.values(refSubscriptions).forEach((release) => release())
    refSubscriptions = {}
    dataValues = {}
  }
  return {
    activate() {
      performSubscriptions()
      return releaseSubscriptions
    },
  }
}

function resolveValueRefs(dataValues: DataValues, value: DataState): DataState {
  if (!value || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValueRefs(dataValues, item))
  }
  if (typeof value === 'object') {
    if (isCompositeDataState(value) && value.$ === 'ref') {
      return resolveRef(dataValues, value.ref)
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        return [key, resolveValueRefs(dataValues, item)]
      })
    )
  }
}

function resolveRef(dataValues: DataValues, lookup: ReferencedDataState['ref']): DataState {
  const value = extractRefValue(dataValues, lookup)
  return resolveValueRefs(dataValues, value)
}

export function Template({
  components,
  dataSource,
  path = [''],
  onAction,
  onEvent = dataSource.sendEvent,
}: {
  path?: string | Path
  dataSource: DataSource
  components: ComponentRegistry
  onAction?: (action: ActionDataState) => void
  onEvent?: (event: HandlerEvent) => Promise<ResponseDataState>
}) {
  if (typeof path === 'string') {
    path = [path]
  }

  /* refs */
  const rootKey = extractRefKey(path)
  const [dataValues, setDataValues] = useState<DataValues>({
    [rootKey]: dataSource.get(rootKey).get(),
  })
  const refStateManager = useRef(
    createRefStateManager(dataValues, setDataValues, dataSource, rootKey)
  )
  useEffect(() => {
    const release = refStateManager.current.activate()
    return () => release()
  }, [])
  const rootDataState = resolveRef(dataValues, path)

  /* state */
  const [localState, applyStateUpdateAction] = useLocalState()

  const onTemplateEvent = useCallback(
    async (event: TemplateEvent) => {
      const actions = isEventDataState(event.dataState) ? event.dataState.actions : event.dataState
      for (const action of actions || []) {
        if (isStateUpdateAction(action)) {
          applyStateUpdateAction(action, event.payload)
        } else {
          onAction?.(action)
        }
      }
      if (!isHandlerEvent(event)) {
        return
      }
      if (event.dataState.args) {
        event.payload = [
          Object.fromEntries(
            Object.entries(event.dataState.args).map(([key, value]) => {
              return [key, localState.getStream(value).get()]
            })
          ),
        ]
      }
      const res = await onEvent(event)
      if (!isResponseDataState(res)) {
        throw new Error(
          `Invalid response from "onEvent" handler. Expected ServerResponseDataState. Received: ${JSON.stringify(res)}`
        )
      }
      if (res.actions) {
        for (const action of res.actions) {
          if (isStateUpdateAction(action)) {
            applyStateUpdateAction(action, event.payload)
          } else {
            onAction?.(action)
          }
        }
      }
      if (!res.ok) {
        throw res.payload
      }
      return res.payload
    },
    [onAction, onEvent]
  )

  return (
    <LocalState.Provider value={localState}>
      <BaseTemplate
        components={components}
        path={path}
        dataState={rootDataState}
        onTemplateEvent={onTemplateEvent}
      />
    </LocalState.Provider>
  )
}
