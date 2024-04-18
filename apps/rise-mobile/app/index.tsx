import { HomeScreen } from '@react-native-templates/app'
import { Stack } from 'expo-router'
import React from 'react'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rise Remote',
        }}
      />
      <HomeScreen />
    </>
  )
}