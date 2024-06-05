/** @jsxImportSource @final-ui/react */

import { extend, ServerHandlerDataState, setStateAction, state } from '@final-ui/react'
import {
  Button,
  Sheet,
  SheetFrame,
  SheetHandle,
  SheetOverlay,
  YStack,
} from '@final-ui/tamagui/server'

type Props = {
  onSelect?: ServerHandlerDataState
  button?: JSX.Element
  options?: {
    key: string
    label: string
  }[]
}

export function DropdownButton(props: Props) {
  const isOpen = state(false)
  return (
    <YStack>
      <Button onPress={setStateAction(isOpen, true)}>{props.button}</Button>
      <Sheet
        forceRemoveScrollEnabled={isOpen}
        modal={true}
        open={isOpen}
        onOpenChange={setStateAction(isOpen)}
        dismissOnSnapToBottom
        zIndex={100_000}
        animation="medium"
      >
        <SheetOverlay animation="quick" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <SheetHandle />
        <SheetFrame padding="$4" justifyContent="center" space="$5">
          <YStack gap="$3">
            {props.options?.map((item) => {
              return (
                <Button
                  key={item.key}
                  onPress={
                    props.onSelect
                      ? extend(props.onSelect, setStateAction(isOpen, false))
                      : setStateAction(isOpen, false)
                  }
                >
                  {item.label}
                </Button>
              )
            })}
          </YStack>
        </SheetFrame>
      </Sheet>
    </YStack>
  )
}
