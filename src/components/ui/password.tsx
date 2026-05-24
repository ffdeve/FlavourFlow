import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useState } from 'react';
import { TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { Input } from './input';

interface PasswordProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  fieldClassName?: string;
  inputClassName?: string;
  variant?: 'input' | 'inline' | 'form';
}

export function Password({
  label,
  error,
  containerClassName,
  fieldClassName,
  inputClassName,
  variant = 'input',
  placeholder,
  ...props
}: PasswordProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Input component style (for signup, forgot password forms)
  if (variant === 'input') {
    return (
      <Input
        label={label}
        error={error}
        placeholder={placeholder || 'Enter password'}
        secureTextEntry={!showPassword}
        autoComplete="password-new"
        containerClassName={containerClassName}
        inputClassName={inputClassName}
        rightIcon={
          <FontAwesome6
            name={showPassword ? 'eye-slash' : 'eye'}
            size={20}
            color="#3B3328"
          />
        }
        onRightIconPress={() => setShowPassword(!showPassword)}
        {...props}
      />
    );
  }

  // Form style (for signup forms with custom background)
  if (variant === 'form') {
    return (
      <View className={containerClassName || 'mb-4'}>
        <View className={fieldClassName || 'bg-interactive/80 rounded-lg px-6 py-4 flex-row items-center'}>
          <TextInput
            placeholder={placeholder || 'Enter password'}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            placeholderTextColor="#3B3328"
            className={inputClassName || 'flex-1 text-base text-black font-poppins-light opacity-100'}
            {...props}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <FontAwesome6
              name={showPassword ? 'eye' : 'eye-slash'}
              size={20}
              color="#3B3328"
              style={{ marginLeft: 16 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Inline style (for login forms with background)
  return (
    <View className={containerClassName || 'mb-4 mx-2 bg-interactive/80 rounded-lg px-6 py-4 flex-row items-center'}>
      <TextInput
        placeholder={placeholder || 'Password'}
        secureTextEntry={!showPassword}
        autoComplete="password"
        placeholderTextColor="#3B3328"
        className={inputClassName || 'flex-1 text-base text-black font-poppins-light opacity-100'}
        {...props}
      />
      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
        <FontAwesome6
          name={showPassword ? 'eye' : 'eye-slash'}
          size={18}
          color="#3B3328"
          style={{ marginLeft: 16 }}
        />
      </TouchableOpacity>
    </View>
  );
}
