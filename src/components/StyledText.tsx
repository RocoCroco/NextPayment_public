// components/StyledText.tsx
import { Text, TextProps, useColorScheme } from 'react-native';
import Colors from '@/src/constants/Colors';

interface AppTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  size?: number;
  lightColor?: string;
  darkColor?: string;
}

export function AppText({ 
  weight = 'regular', 
  size = 16,
  style,
  lightColor,
  darkColor,
  ...props 
}: AppTextProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const getFontFamily = () => {
    switch (weight) {
      case 'bold':
        return 'Inter_700Bold';
      case 'semibold':
        return 'Inter_600SemiBold';
      case 'medium':
        return 'Inter_500Medium';
      default:
        return 'Inter_400Regular';
    }
  };

  const finalColor = lightColor || darkColor 
    ? (colorScheme === 'light' ? lightColor : darkColor)
    : theme.text;

  return (
    <Text 
      {...props} 
      style={[
        {
          fontFamily: getFontFamily(), // 🎯 Esto es clave
          fontSize: size,
          color: finalColor,
        },
        style
      ]} 
    />
  );
}