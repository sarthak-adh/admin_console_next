import { HawcxInitializer } from 'https://websdkcdn.hawcx.com/hawcx-auth.esm.min.js';

let authInstance: any;

export async function getHawcxAuth() {
  if (!authInstance) {
    const apiKey = process.env.NEXT_PUBLIC_HAWCX_API_KEY || 'YOUR_API_KEY';
    authInstance = await HawcxInitializer.init(apiKey);
  }
  return authInstance;
}
