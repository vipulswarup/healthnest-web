export interface MobileNumber {
  countryCode: string;
  number: string;
}

export interface User {
  _id?: string;
  id?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  suffix?: string;
  emails: string[];
  mobileNumbers: MobileNumber[];
  createdAt: Date;
  updatedAt: Date;
  preferences: Record<string, any>;
  onboardingCompleted: boolean;
  password?: string;
  authProvider?: 'credentials' | 'google';
  authProviderId?: string;
}

export interface CreateUserInput {
  firstName: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  suffix?: string;
  email: string;
  password?: string;
  mobileNumbers?: MobileNumber[];
}

export interface UpdateUserInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  suffix?: string;
  emails?: string[];
  mobileNumbers?: MobileNumber[];
  preferences?: Record<string, any>;
  onboardingCompleted?: boolean;
}

