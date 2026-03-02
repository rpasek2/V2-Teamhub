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
import { Mail, Lock, User, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, Input } from '../../src/components/ui';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';

function getAge(date: Date): number {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export default function RegisterScreen() {
  const { t, isDark, colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [error, setError] = useState('');

  const signUp = useAuthStore((state) => state.signUp);
  const loading = useAuthStore((state) => state.loading);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setAgeBlocked(getAge(selectedDate) < 13);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword || !dateOfBirth) {
      setError('Please fill in all fields');
      return;
    }

    if (ageBlocked) {
      setError('You must be at least 13 years old to create an account');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const meetsLength = password.length >= 8;
    const strengthScore = [hasUpper, hasLower, hasNumber, meetsLength].filter(Boolean).length;
    if (strengthScore < 3) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
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
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: t.primary }]}>
            <Text style={styles.logoText}>Gym{'\n'}TeamHub</Text>
          </View>
          <Text style={[styles.title, { color: t.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>Join your team on Gym TeamHub</Text>
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
            leftIcon={<User size={20} color={t.textFaint} />}
          />

          <View>
            <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Date of birth</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: t.border, backgroundColor: t.surface }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color={t.textFaint} />
              <Text style={[styles.dateButtonText, { color: t.text }, !dateOfBirth && { color: t.textFaint }]}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={dateOfBirth || new Date(2010, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={[styles.datePickerDoneText, { color: t.primary }]}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {ageBlocked && (
              <Text style={styles.ageBlockedText}>
                You must be at least 13 years old to create an account. If you are a gymnast under 13, ask your parent or guardian to manage your profile through their account.
              </Text>
            )}
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            leftIcon={<Mail size={20} color={t.textFaint} />}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={t.textFaint} />}
            hint="Must be at least 6 characters"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={t.textFaint} />}
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
          <Text style={[styles.footerText, { color: t.textSecondary }]}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: t.primary }]}>Sign in</Text>
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
    backgroundColor: colors.brand[600],
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
    gap: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.slate[900],
  },
  dateButtonPlaceholder: {
    color: colors.slate[400],
  },
  datePickerDone: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand[600],
  },
  ageBlockedText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.error[600],
    lineHeight: 18,
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
    color: colors.brand[600],
    fontSize: 14,
    fontWeight: '600',
  },
});
