import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#050816',
    primary: '#4ade80',
    text: '#f9fafb',
    card: '#020617',
    border: '#111827',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#020617',
            borderTopColor: '#111827',
          },
          tabBarActiveTintColor: '#4ade80',
          tabBarInactiveTintColor: '#6b7280',
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === 'Dashboard') {
              iconName = focused ? 'scan' : 'scan-outline';
            } else if (route.name === 'History') {
              iconName = focused ? 'time' : 'time-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

