import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const AVATAR_COLORS = ['#7c4dff', '#9f76ff', '#34f5a6', '#ff8b5f', '#ff4d7d', '#4da6ff'];

function getColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  imageUri?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { container: 28, fontSize: 10 },
  md: { container: 36, fontSize: 12 },
  lg: { container: 48, fontSize: 16 },
};

export function Avatar({ name, imageUri, size = 'md' }: AvatarProps) {
  const color = getColor(name);
  const dimensions = SIZES[size];

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.container / 2,
            borderColor: `${color}66`,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
          backgroundColor: `${color}22`,
          borderColor: `${color}44`,
        },
      ]}
    >
      <Text style={[styles.initials, { color, fontSize: dimensions.fontSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initials: {
    fontWeight: '600',
  },
  image: {
    borderWidth: 1,
  },
});
