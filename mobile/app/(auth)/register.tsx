import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { Button, Input } from '../../src/components/ui';
import { colors, theme } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const { signUp, loading } = useAuthStore();

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    const { error: signUpError } = await signUp(email, password, fullName);

    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    } else {
      router.replace('/hub-selection');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>TeamHub</Text>
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join your team on TeamHub</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            leftIcon={<User size={20} color={colors.slate[400]} />}
          />

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            leftIcon={<Mail size={20} color={colors.slate[400]} />}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.slate[400]} />}
            hint="Must be at least 6 characters"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.slate[400]} />}
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.slate[500],
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: colors.error[50],
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  errorText: {
    color: colors.error[700],
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.slate[600],
    fontSize: 14,
  },
  footerLink: {
    color: theme.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
