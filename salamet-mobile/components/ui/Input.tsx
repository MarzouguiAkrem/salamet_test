// components/ui/Input.tsx
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TextInputProps, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  lightColor?: string;
  darkColor?: string;
  secureTextEntry?: boolean;
};

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  lightColor,
  darkColor,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const theme = useColorScheme() ?? 'light';
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const backgroundColor = theme === 'light' 
    ? lightColor ?? '#f8f9fa' 
    : darkColor ?? '#2a2a2a';

  const borderColor = error 
    ? '#dc3545' 
    : isFocused 
      ? '#2196F3' 
      : theme === 'light' 
        ? '#e9ecef' 
        : '#404040';

  const textColor = theme === 'light' ? '#212529' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6c757d' : '#adb5bd';

  const handleRightIconPress = () => {
    if (secureTextEntry) {
      setIsSecure(!isSecure);
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const getRightIconName = () => {
    if (secureTextEntry) {
      return isSecure ? 'eye-outline' : 'eye-off-outline';
    }
    return rightIcon;
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText style={styles.label}>{label}</ThemedText>
      )}
      
      <View style={[
        styles.inputContainer,
        {
          backgroundColor,
          borderColor,
        },
        isFocused && styles.focused,
        error && styles.error,
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={placeholderColor} 
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={placeholderColor}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        
        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity 
            onPress={handleRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons 
              name={getRightIconName() as keyof typeof Ionicons.glyphMap} 
              size={20} 
              color={placeholderColor}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  focused: {
    borderWidth: 2,
  },
  error: {
    borderColor: '#dc3545',
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
});
