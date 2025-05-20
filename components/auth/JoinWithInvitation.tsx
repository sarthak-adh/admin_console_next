import {
  Error,
  InputWithLabel,
  Loading,
  WithLoadingAndError,
} from '@/components/shared';
import { maxLengthPolicies } from '@/lib/common';
import { useFormik } from 'formik';
import useInvitation from 'hooks/useInvitation';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useRef, useState } from 'react';
import { getHawcxAuth } from '@/lib/hawcx';
import AgreeMessage from './AgreeMessage';
import GoogleReCAPTCHA from '../shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';

interface JoinWithInvitationProps {
  inviteToken: string;
  recaptchaSiteKey: string | null;
}

const JoinUserSchema = Yup.object().shape({
  name: Yup.string().required().max(maxLengthPolicies.name),
  otp: Yup.string().when('$step', {
    is: 'otp',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.notRequired(),
  }),
  sentViaEmail: Yup.boolean().required(),
  email: Yup.string()
    .max(maxLengthPolicies.email)
    .when('sentViaEmail', {
      is: false,
      then: (schema) => schema.required().email().max(maxLengthPolicies.email),
    }),
});

const JoinWithInvitation = ({
  inviteToken,
  recaptchaSiteKey,
}: JoinWithInvitationProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const { isLoading, error, invitation } = useInvitation();
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      otp: '',
      sentViaEmail: invitation?.sentViaEmail || true,
    },
    validationSchema: JoinUserSchema,
    validationContext: { step },
    enableReinitialize: true,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      const hawcx = await getHawcxAuth();
      if (step === 'form') {
        const res = await hawcx.signUp(values.email);
        if (res.success) {
          setStep('otp');
        } else {
          toast.error(res.message);
        }
      } else {
        const verify = await hawcx.verifyOTP(values.otp);
        if (verify.success) {
          toast.success(t('successfully-joined'));
          router.push(`/auth/login?token=${inviteToken}`);
        } else {
          toast.error(verify.message);
        }
      }
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error || !invitation) {
    return <Error message={error.message} />;
  }

  return (
    <WithLoadingAndError isLoading={isLoading} error={error}>
      <form className="space-y-3" onSubmit={formik.handleSubmit}>
        <InputWithLabel
          type="text"
          label={t('name')}
          name="name"
          placeholder={t('your-name')}
          value={formik.values.name}
          error={formik.errors.name}
          onChange={formik.handleChange}
        />

        {invitation.sentViaEmail ? (
          <InputWithLabel
            type="email"
            label={t('email')}
            value={invitation.email!}
            disabled
          />
        ) : (
          <InputWithLabel
            type="email"
            label={t('email')}
            name="email"
            placeholder={t('email')}
            value={formik.values.email}
            error={formik.errors.email}
            onChange={formik.handleChange}
          />
        )}

        {step === 'otp' && (
          <InputWithLabel
            type="text"
            label={t('verification-code')}
            name="otp"
            placeholder={t('verification-code')}
            value={formik.values.otp}
            error={formik.errors.otp}
            onChange={formik.handleChange}
          />
        )}
        <GoogleReCAPTCHA
          recaptchaRef={recaptchaRef}
          onChange={setRecaptchaToken}
          siteKey={recaptchaSiteKey}
        />
        <div className="space-y-3">
          <Button
            type="submit"
            color="primary"
            loading={formik.isSubmitting}
            active={formik.dirty}
            fullWidth
            size="md"
          >
            {t('create-account')}
          </Button>
          <AgreeMessage text={t('create-account')} />
        </div>
      </form>
    </WithLoadingAndError>
  );
};

export default JoinWithInvitation;
