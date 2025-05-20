let authInstance: any;

export async function getHawcxAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Hawcx SDK can only be initialized in the browser');
  }

  if (!authInstance) {
    const { HawcxInitializer } = await import(
      /* webpackIgnore: true */ 'https://websdkcdn.hawcx.com/hawcx-auth.esm.min.js'
    );
    const apiKey = process.env.NEXT_PUBLIC_HAWCX_API_KEY || 'YOUR_API_KEY';
    authInstance = await HawcxInitializer.init(apiKey);
  }

  return authInstance;
}
