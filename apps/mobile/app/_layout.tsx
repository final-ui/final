import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, usePathname, useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { Provider } from '../src/provider'
import { storage } from '../src/storage'
import { tamaguiConfig } from '../src/tamagui/config'

export const unstable_settings = {
  // https://docs.expo.dev/router/advanced/router-settings/
  initialRouteName: 'index',
}

export default function HomeLayout() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const route = storage.getString('navRoute')
    if (route && route !== '/') {
      setTimeout(() => {
        router.push(route)
      }, 500)
    }
  }, [])

  useEffect(() => {
    storage.set('navRoute', pathname)
  }, [pathname])

  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  const scheme = useColorScheme()
  if (!loaded) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider config={tamaguiConfig}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen
              name="connection/[id]"
              // @ts-ignore
              getId={({ params }: { params: { id: string; path: string } }) => {
                return `${params.id}-${params.path}`
              }}
            />
          </Stack>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  )
}
