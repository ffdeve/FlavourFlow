import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, DeviceEventEmitter } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition, FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { useAuth } from '@/hooks/use-auth';
import { notificationService } from '@/services/notification.service';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnread(0);
      return;
    }
    let mounted = true;
    notificationService.getUnreadCount(user.id).then((c) => mounted && setUnread(c));
    const unsub = notificationService.subscribeToNotifications(user.id, () =>
      setUnread((c) => c + 1),
    );
    const readSub = DeviceEventEmitter.addListener('notifications:read', () =>
      setUnread(0),
    );
    return () => {
      mounted = false;
      unsub();
      readSub.remove();
    };
  }, [user?.id]);

  return (
    <View className="absolute bottom-6 left-4 right-4 bg-white rounded-full shadow-lg shadow-black/10 flex-row justify-between items-center px-2 py-2" style={styles.shadow}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName: any = 'home';
        if (route.name === 'index') iconName = 'home';
        else if (route.name === 'community') iconName = 'users';
        else if (route.name === 'create') iconName = 'plus';
        else if (route.name === 'alerts') iconName = 'bell';
        else if (route.name === 'profile') iconName = 'user';

        return (
          <AnimatedPressable
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            layout={LinearTransition.springify().damping(14).mass(0.9).stiffness(150)}
            className={`flex-row items-center justify-center px-4 py-2.5 rounded-full ${
              isFocused ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <View>
              <Feather
                name={iconName}
                size={20}
                color={isFocused ? '#FFFFFF' : '#8B7D6F'}
              />
              {route.name === 'alerts' && unread > 0 && (
                <View style={[styles.badge, isFocused && { borderColor: '#FBA82E' }]}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
            {isFocused && (
              <Animated.Text
                entering={FadeInRight.springify().damping(14).mass(0.9).stiffness(150)}
                exiting={FadeOutRight.springify().damping(14).mass(0.9).stiffness(150)}
                className="text-white ml-2 text-sm font-poppins-medium"
              >
                {label as string}
              </Animated.Text>
            )}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#E05252',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
