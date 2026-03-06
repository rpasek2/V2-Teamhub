import React from 'react';
import { Text, Linking, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function isUrl(text: string): boolean {
  return /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i.test(text);
}

interface LinkifiedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export function LinkifiedText({ text, style }: LinkifiedTextProps) {
  const { t } = useTheme();
  const parts = text.split(URL_REGEX);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (isUrl(part)) {
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <Text
              key={i}
              style={{ color: t.primary, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(href)}
            >
              {part}
            </Text>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </Text>
  );
}
