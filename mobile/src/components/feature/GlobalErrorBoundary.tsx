import { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme';
import { reportError } from '@/lib/sentry';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last-resort React error boundary. Catches render-time exceptions
 * that escape route segments. Reports to Sentry with the digest tag
 * so it's pivotable from a user's report ("the app crashed").
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    reportError(error, {
      tags: { area: 'render', source: 'GlobalErrorBoundary' },
      extras: { componentStack: info.componentStack },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            We've logged the problem and are looking at it. Try again — if it
            keeps happening, sign out and back in.
          </Text>
          <View style={{ height: spacing.xl }} />
          <Button label="Try again" onPress={this.reset} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 320,
  },
});
