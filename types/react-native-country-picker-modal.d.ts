declare module 'react-native-country-picker-modal' {
  import type { ComponentType } from 'react';

  export interface Country {
    cca2: string;
    callingCode?: string[];
    name?: string;
    translation?: Record<string, string>;
  }

  export const CountryPicker: ComponentType<any>;

  export default CountryPicker;
}
