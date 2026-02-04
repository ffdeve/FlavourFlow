import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "w-fit h-fit" }: BackButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      onPress={() => router.back()} 
      style={{ alignSelf: 'flex-start' }}
      activeOpacity={0.7}
    >
      <FontAwesome6 name="arrow-left-long" size={24} color="#3B3328" />
    </TouchableOpacity>
  );
}
