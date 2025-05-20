import { useState, useRef } from 'react';
import { InputWithLabel } from '@/components/shared';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import AgreeMessage from './AgreeMessage';
import GoogleReCAPTCHA from '../shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';
import { maxLengthPolicies } from '@/lib/common';
import { getHawcxAuth } from '@/lib/hawcx';

interface JoinProps {
  recaptchaSiteKey: string | null;
}

const JoinUserSchema = Yup.object().shape({
  name: Yup.string().required().max(maxLengthPolicies.name),
  email: Yup.string().required().email().max(maxLengthPolicies.email),
  otp: Yup.string().when('$step', {
    is: 'otp',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.notRequired(),
  }),
  team: Yup.string().required().min(3).max(maxLengthPolicies.team),
});

const Join = ({ recaptchaSiteKey }: JoinProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      otp: '',
      team: '',
    },
    validationSchema: JoinUserSchema,
    validationContext: { step },
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
          router.push('/auth/login');
        } else {
          toast.error(verify.message);
        }
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="space-y-1">
        <InputWithLabel
          type="text"
          label={t('name')}
          name="name"
          placeholder={t('your-name')}
          value={formik.values.name}
          error={formik.touched.name ? formik.errors.name : undefined}
          onChange={formik.handleChange}
        />
        <InputWithLabel
          type="text"
          label={t('team')}
          name="team"
          placeholder={t('team-name')}
          value={formik.values.team}
          error={formik.errors.team}
          onChange={formik.handleChange}
        />
        <InputWithLabel
          type="email"
          label={t('email')}
          name="email"
          placeholder={t('email-placeholder')}
          value={formik.values.email}
          error={formik.errors.email}
          onChange={formik.handleChange}
        />
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
          {t('create-account')}
        </Button>
        <AgreeMessage text={t('create-account')} />
      </div>
    </form>
  );
};

export default Join;
