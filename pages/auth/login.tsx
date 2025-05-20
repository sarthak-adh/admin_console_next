import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';

import * as Yup from 'yup';
import Link from 'next/link';
import { useFormik } from 'formik';
import { Button } from 'react-daisyui';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React, { type ReactElement, useEffect, useState, useRef } from 'react';
import type { ComponentStatus } from 'react-daisyui/dist/types';
import { useSession } from 'next-auth/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getHawcxAuth } from '@/lib/hawcx';

import env from '@/lib/env';
import type { NextPageWithLayout } from 'types';
import { AuthLayout } from '@/components/layouts';
import GithubButton from '@/components/auth/GithubButton';
import GoogleButton from '@/components/auth/GoogleButton';
import { Alert, InputWithLabel, Loading } from '@/components/shared';
import { authProviderEnabled } from '@/lib/auth';
import Head from 'next/head';
import AgreeMessage from '@/components/auth/AgreeMessage';
import GoogleReCAPTCHA from '@/components/shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';
import { maxLengthPolicies } from '@/lib/common';

interface Message {
  text: string | null;
  status: ComponentStatus | null;
}

const Login: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ authProviders, recaptchaSiteKey }) => {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation('common');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [message, setMessage] = useState<Message>({ text: null, status: null });
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const { error, success, token } = router.query as {
    error: string;
    success: string;
    token: string;
  };

  useEffect(() => {
    if (error) {
      setMessage({ text: error, status: 'error' });
    }

    if (success) {
      setMessage({ text: success, status: 'success' });
    }
  }, [error, success]);

  const redirectUrl = token
    ? `/invitations/${token}`
    : env.redirectIfAuthenticated;

  const formik = useFormik({
    initialValues: {
      email: '',
      otp: '',
    },
    validationSchema: Yup.object().shape({
      email: Yup.string().required().email().max(maxLengthPolicies.email),
      otp: Yup.string().when('$step', {
        is: 'otp',
        then: (schema) => schema.required(),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    validationContext: { step },
    onSubmit: async (values) => {
      const hawcx = await getHawcxAuth();
      setMessage({ text: null, status: null });

      if (step === 'email') {
        const res = await hawcx.signIn(values.email);
        if (res.success && res.data?.access_token) {
          sessionStorage.setItem('access_token', res.data.access_token);
          router.push(redirectUrl);
        } else if (res.success) {
          setStep('otp');
        } else {
          setMessage({ text: res.message, status: 'error' });
        }
      } else {
        const verify = await hawcx.verifyOTP(values.otp);
        if (verify.success) {
          if (verify.data?.access_token) {
            sessionStorage.setItem('access_token', verify.data.access_token);
          }
          router.push(redirectUrl);
        } else {
          setMessage({ text: verify.message, status: 'error' });
        }
      }
    },
  });

  if (status === 'loading') {
    return <Loading />;
  }

  if (status === 'authenticated') {
    router.push(redirectUrl);
  }

  const params = token ? `?token=${token}` : '';

  return (
    <>
      <Head>
        <title>{t('login-title')}</title>
      </Head>
      {message.text && message.status && (
        <Alert status={message.status} className="mb-5">
          {t(message.text)}
        </Alert>
      )}
      <div className="rounded p-6 border">
        <div className="flex gap-2 flex-wrap">
          {authProviders.github && <GithubButton />}
          {authProviders.google && <GoogleButton />}
        </div>

        {(authProviders.github || authProviders.google) &&
          authProviders.credentials && <div className="divider">{t('or')}</div>}

        {authProviders.credentials && (
          <form onSubmit={formik.handleSubmit}>
            <div className="space-y-3">
              <InputWithLabel
                type="email"
                label="Email"
                name="email"
                placeholder={t('email')}
                value={formik.values.email}
                error={formik.touched.email ? formik.errors.email : undefined}
                onChange={formik.handleChange}
                disabled={step === 'otp'}
              />
              {step === 'otp' && (
                <InputWithLabel
                  type="text"
                  name="otp"
                  placeholder={t('verification-code')}
                  value={formik.values.otp}
                  error={formik.touched.otp ? formik.errors.otp : undefined}
                  onChange={formik.handleChange}
                />
              )}
              <GoogleReCAPTCHA
                recaptchaRef={recaptchaRef}
                onChange={setRecaptchaToken}
                siteKey={recaptchaSiteKey}
              />
            </div>
            <div className="mt-3 space-y-3">
              <Button
                type="submit"
                color="primary"
                loading={formik.isSubmitting}
                active={formik.dirty}
                fullWidth
                size="md"
              >
                {t('sign-in')}
              </Button>
              <AgreeMessage text={t('sign-in')} />
            </div>
          </form>
        )}

        {(authProviders.email || authProviders.saml) && (
          <div className="divider"></div>
        )}

        <div className="space-y-3">
          {authProviders.email && (
            <Link
              href={`/auth/magic-link${params}`}
              className="btn btn-outline w-full"
            >
              &nbsp;{t('sign-in-with-email')}
            </Link>
          )}

          {authProviders.saml && (
            <Link href="/auth/sso" className="btn btn-outline w-full">
              &nbsp;{t('continue-with-saml-sso')}
            </Link>
          )}
        </div>
      </div>
      <p className="text-center text-sm text-gray-600 mt-3">
        {t('dont-have-an-account')}
        <Link
          href={`/auth/join${params}`}
          className="font-medium text-primary hover:text-[color-mix(in_oklab,oklch(var(--p)),black_7%)]"
        >
          &nbsp;{t('create-a-free-account')}
        </Link>
      </p>
    </>
  );
};

Login.getLayout = function getLayout(page: ReactElement) {
  return (
    <AuthLayout heading="welcome-back" description="log-in-to-account">
      {page}
    </AuthLayout>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      authProviders: authProviderEnabled(),
      recaptchaSiteKey: env.recaptcha.siteKey,
    },
  };
};

export default Login;
