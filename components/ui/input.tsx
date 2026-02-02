import { cn } from '@/lib/utils';
import React from 'react';
import {
    Text,
    TextInput,
    View,
    type TextInputProps,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <View className={cn('w-full', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-text mb-2">
          {label}
        </Text>
      )}
      
      <View
        className={cn(
          'flex-row items-center bg-interactive border rounded-lg px-3',
          error ? 'border-error' : 'border-interactive-dark',
        )}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        
        <TextInput
          className={cn(
            'flex-1 py-3 text-base text-text',
            className
          )}
          placeholderTextColor="#8B7D6F"
          {...props}
        />
        
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      
      {error && (
        <Text className="text-sm text-error mt-1">{error}</Text>
      )}
    </View>
  );
}
