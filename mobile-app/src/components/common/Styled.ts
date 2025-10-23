import styled from 'styled-components/native';
import { theme } from '../../utils/theme';

export const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

export const Surface = styled.View`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
`;

export const Text = styled.Text<{ 
  size?: keyof typeof theme.fonts.sizes;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
}>`
  font-size: ${({ size = 'md' }) => theme.fonts.sizes[size]}px;
  font-weight: ${({ weight = 'regular' }) => 
    weight === 'bold' ? '700' : weight === 'medium' ? '500' : '400'};
  color: ${({ color = theme.colors.text.primary }) => color};
`;

export const Button = styled.TouchableOpacity<{
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}>`
  background-color: ${({ variant = 'primary' }) => 
    variant === 'primary' ? theme.colors.primary :
    variant === 'secondary' ? theme.colors.secondary :
    'transparent'};
  border: ${({ variant = 'primary' }) => 
    variant === 'outline' ? `1px solid ${theme.colors.primary}` : 'none'};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${({ size = 'md' }) => 
    size === 'sm' ? `${theme.spacing.sm}px ${theme.spacing.md}px` :
    size === 'lg' ? `${theme.spacing.lg}px ${theme.spacing.xl}px` :
    `${theme.spacing.md}px ${theme.spacing.lg}px`};
  align-items: center;
  justify-content: center;
`;

export const ButtonText = styled(Text)<{
  variant?: 'primary' | 'secondary' | 'outline';
}>`
  color: ${({ variant = 'primary' }) => 
    variant === 'outline' ? theme.colors.primary : theme.colors.text.inverse};
  font-weight: 500;
`;

export const Input = styled.TextInput`
  background-color: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text.primary};
`;

export const Card = styled(Surface)`
  margin: ${theme.spacing.sm}px 0;
`;

export const Row = styled.View<{ gap?: number }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ gap = theme.spacing.sm }) => gap}px;
`;

export const Column = styled.View<{ gap?: number }>`
  flex-direction: column;
  gap: ${({ gap = theme.spacing.sm }) => gap}px;
`;