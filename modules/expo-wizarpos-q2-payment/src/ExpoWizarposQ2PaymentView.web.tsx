import * as React from 'react';

import { ExpoWizarposQ2PaymentViewProps } from './ExpoWizarposQ2Payment.types';

export default function ExpoWizarposQ2PaymentView(props: ExpoWizarposQ2PaymentViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
