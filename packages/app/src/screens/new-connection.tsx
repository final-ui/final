import React from 'react'
import { useLink } from 'solito/link'
import { Button, YStack } from 'tamagui'

import { ConnectionForm } from '../connection-form'
import { useConnections } from '../provider/storage'

const defaultNewConnection = {
  label: '',
  host: '',
  path: '',
}

export function NewConnectionScreen() {
  const goHomeLink = useLink({
    href: '/',
  })
  const [, { addConnection }] = useConnections()
  return (
    <YStack flex={1} space padding="$4">
      <ConnectionForm
        onSubmit={(values) => {
          // @ts-ignore
          addConnection(values)
          goHomeLink.onPress()
        }}
        defaultValues={defaultNewConnection}
        submitButton={({ submit }) => <Button onPress={() => submit()}>Add Connection</Button>}
      />
    </YStack>
  )
}

// rise://new-connection
