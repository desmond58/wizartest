import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoWizarposQ2PaymentViewProps } from './ExpoWizarposQ2Payment.types';

const NativeView: React.ComponentType<ExpoWizarposQ2PaymentViewProps> =
  requireNativeViewManager('ExpoWizarposQ2Payment');

export default function ExpoWizarposQ2PaymentView(props: ExpoWizarposQ2PaymentViewProps) {
  return <NativeView {...props} />;
}
