// components/ui/Card.tsx
import React from 'react';
import { StyleSheet, useColorScheme, View, ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  elevation?: number;
};

export function Card({
  style,
  lightColor,
  darkColor,
  elevation = 2,
  ...rest
}: CardProps) {
  const theme = useColorScheme() ?? 'light';
  
  const backgroundColor = theme === 'light' 
    ? lightColor ?? '#ffffff' 
    : darkColor ?? '#1a1a1a';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          elevation: elevation,
          shadowOpacity: theme === 'light' ? 0.1 : 0.3,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    // Ombre pour Android (elevation est définie dynamiquement)
  },
});
