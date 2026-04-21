import { useMemo, useState } from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { SignaturePad } from './SignaturePad';
import { applicationsApi } from '../lib/api';
import { findApplicationByIdCardNumber, getCurrentUser, upsertApplication } from '../lib/db';

type LoanApplicationWizardProps = {
  onSubmitted: () => void;
  onBack: () => void;
};

type StepId = 1 | 2 | 3 | 4 | 5;

type FormState = {
  fullName: string;
  idCardNumber: string;
  dateOfIssue: string;
  placeOfIssue: string;
  idFrontFile: File | null;
  idBackFile: File | null;
  selfieHoldingIdFile: File | null;
  idFrontDataUrl: string;
  idBackDataUrl: string;
  selfieHoldingIdDataUrl: string;
  currentAddress: string;
  currentJob: string;
  workAddress: string;
  position: string;
  monthlyIncome: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  signatureDataUrl: string;
  loanAmount: number;
  specificAmount: string;
  termMonths: number | null;
  interestRate: number;
  interestRateInput: string;
};

const MIN_LOAN = 3000;
const MAX_LOAN = 100000;
const DEFAULT_INTEREST_RATE = 5.8;

const TERM_OPTIONS: number[] = [3, 6, 12, 24, 36, 48, 60, 90, 120];

const pillInput =
  'h-11 w-full rounded-full border border-[#0b4a90]/35 bg-white px-4 text-sm outline-none transition focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/15';

const labelClass = 'text-sm font-bold text-slate-700';

const calcMoney = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LoanApplicationWizard({ onSubmitted, onBack }: LoanApplicationWizardProps) {
  const [step, setStep] = useState<StepId>(1);
  const [error, setError] = useState('');

  const [state, setState] = useState<FormState>({
    fullName: '',
    idCardNumber: '',
    dateOfIssue: '',
    placeOfIssue: '',
    idFrontFile: null,
    idBackFile: null,
    selfieHoldingIdFile: null,
    idFrontDataUrl: '',
    idBackDataUrl: '',
    selfieHoldingIdDataUrl: '',
    currentAddress: '',
    currentJob: '',
    workAddress: '',
    position: '',
    monthlyIncome: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    signatureDataUrl: '',
    loanAmount: 39000,
    specificAmount: '39000',
    termMonths: 6,
    interestRate: DEFAULT_INTEREST_RATE,
    interestRateInput: DEFAULT_INTEREST_RATE.toString(),
  });

  const steps = useMemo(
    () => [
      { id: 1 as const, title: 'Personal Info.' },
      { id: 2 as const, title: 'Contact Information' },
      { id: 3 as const, title: 'Bank Information' },
      { id: 4 as const, title: 'Signature Information' },
      { id: 5 as const, title: 'Loan Calculation' },
    ],
    [],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const effectiveAmount = useMemo(
    () => Math.min(MAX_LOAN, Math.max(MIN_LOAN, Math.round(state.loanAmount))),
    [state.loanAmount],
  );

  const effectiveInterestRate = useMemo(
    () => Math.min(100, Math.max(0, Number.isFinite(state.interestRate) ? state.interestRate : DEFAULT_INTEREST_RATE)),
    [state.interestRate],
  );

  const loanInterest = useMemo(
    () => effectiveAmount * (effectiveInterestRate / 100),
    [effectiveAmount, effectiveInterestRate],
  );
  const totalRepayment = useMemo(() => effectiveAmount + loanInterest, [effectiveAmount, loanInterest]);
  const monthlyPayment = useMemo(() => {
    const months = state.termMonths ?? 0;
    if (!months) return 0;
    return totalRepayment / months;
  }, [state.termMonths, totalRepayment]);

  const validateStep = (s: StepId) => {
    if (s === 1) {
      if (!state.fullName.trim()) return 'Full name is required.';
      if (!state.idCardNumber.trim()) return 'ID card number is required.';
      const currentUser = getCurrentUser();
      const existing = findApplicationByIdCardNumber(state.idCardNumber);
      if (existing && (!currentUser || existing.userId !== currentUser.id)) {
        return 'You have already applied for a loan.';
      }
      if (!state.dateOfIssue.trim()) return 'Date of issue is required.';
      if (!state.placeOfIssue.trim()) return 'Place of issue is required.';
      if (!state.idFrontFile) return 'Front side of ID is required.';
      if (!state.idBackFile) return 'Back side of ID is required.';
      if (!state.selfieHoldingIdFile) return 'Selfie holding ID is required.';
      return '';
    }
    if (s === 2) {
      if (!state.currentAddress.trim()) return 'Current address is required.';
      if (!state.currentJob.trim()) return 'Current job is required.';
      if (!state.workAddress.trim()) return 'Work address is required.';
      if (!state.position.trim()) return 'Position is required.';
      if (!state.monthlyIncome.trim()) return 'Monthly income is required.';
      return '';
    }
    if (s === 3) {
      if (!state.bankName.trim()) return 'Bank name is required.';
      if (!state.accountHolderName.trim()) return 'Account holder name is required.';
      if (!state.accountNumber.trim()) return 'Account number is required.';
      return '';
    }
    if (s === 4) {
      if (!state.signatureDataUrl) return 'Signature is required.';
      return '';
    }
    if (s === 5) {
      if (!state.termMonths) return 'Please select loan duration.';
      if (effectiveAmount < MIN_LOAN || effectiveAmount > MAX_LOAN) return 'Loan amount is out of range.';
      if (!Number.isFinite(effectiveInterestRate)) return 'Please enter interest rate.';
      return '';
    }
    return '';
  };

  const setLoanAmountFromAny = (amount: number) => {
    const clamped = Math.min(MAX_LOAN, Math.max(MIN_LOAN, Math.round(amount)));
    setState((prev) => ({
      ...prev,
      loanAmount: clamped,
      specificAmount: clamped.toString(),
    }));
  };

  const setInterestRateFromAny = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parsed = cleaned ? Number(cleaned) : NaN;
    setState((prev) => ({
      ...prev,
      interestRateInput: raw,
      interestRate: Number.isFinite(parsed) ? parsed : prev.interestRate,
    }));
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(file);
    });

  const goNext = () => {
    setError('');
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setStep((prev) => (prev < 5 ? ((prev + 1) as StepId) : prev));
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setError('');
    if (step === 1) {
      onBack();
      return;
    }
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
    window.scrollTo(0, 0);
  };

  const submitApplication = async () => {
    setError('');
    const msg = validateStep(5);
    if (msg) {
      setError(msg);
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError('Please login first.');
      return;
    }

    const existing = findApplicationByIdCardNumber(state.idCardNumber);
    if (existing && existing.userId !== user.id) {
      setError('You have already applied for a loan.');
      return;
    }

    try {
      let idFrontDataUrl = state.idFrontDataUrl;
      let idBackDataUrl = state.idBackDataUrl;
      let selfieHoldingIdDataUrl = state.selfieHoldingIdDataUrl;

      if (!idFrontDataUrl && state.idFrontFile) {
        try {
          idFrontDataUrl = await readFileAsDataUrl(state.idFrontFile);
        } catch {
          idFrontDataUrl = '';
        }
      }

      if (!idBackDataUrl && state.idBackFile) {
        try {
          idBackDataUrl = await readFileAsDataUrl(state.idBackFile);
        } catch {
          idBackDataUrl = '';
        }
      }

      if (!selfieHoldingIdDataUrl && state.selfieHoldingIdFile) {
        try {
          selfieHoldingIdDataUrl = await readFileAsDataUrl(state.selfieHoldingIdFile);
        } catch {
          selfieHoldingIdDataUrl = '';
        }
      }

      const app = {
        id: `APP-${Date.now().toString(36)}`,
        userId: user.id,
        status: 'under_review' as const,
        submittedAt: Date.now(),
        applicant: {
          fullName: state.fullName,
          idCardNumber: state.idCardNumber,
          dateOfIssue: state.dateOfIssue,
          placeOfIssue: state.placeOfIssue,
        },
        contact: {
          currentAddress: state.currentAddress,
          currentJob: state.currentJob,
          workAddress: state.workAddress,
          position: state.position,
          monthlyIncome: state.monthlyIncome,
        },
        bank: {
          bankName: state.bankName,
          accountHolderName: state.accountHolderName,
          accountNumber: state.accountNumber,
        },
        documents: {
          idFrontName: state.idFrontFile?.name ?? '',
          idBackName: state.idBackFile?.name ?? '',
          selfieHoldingIdName: state.selfieHoldingIdFile?.name ?? '',
          signatureDataUrl: state.signatureDataUrl,
          idFrontDataUrl,
          idBackDataUrl,
          selfieHoldingIdDataUrl,
        },
        loan: {
          amount: effectiveAmount,
          termMonths: state.termMonths ?? 0,
          interestRate: effectiveInterestRate,
          monthlyPayment,
          totalInterest: loanInterest,
          totalRepayment,
        },
      };

      const created = await applicationsApi.create(app);
      upsertApplication(created.application as never);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save application. Please try again.');
    }
  };

  const breadcrumb = steps[step - 1]?.title ?? '';

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs text-slate-500">
          Home <span className="px-2">|</span>{' '}
          <span className="text-[#0b4a90] font-bold">{breadcrumb}</span>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-5">
            <div>
              <div className={labelClass}>Full name *</div>
              <input
                value={state.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Please enter full name"
                className={pillInput}
              />
            </div>

            <div>
              <div className={labelClass}>ID card *</div>
              <input
                value={state.idCardNumber}
                onChange={(e) => update('idCardNumber', e.target.value)}
                placeholder="Please enter id card number"
                className={pillInput}
              />
            </div>

            <div>
              <div className={labelClass}>Date of issue *</div>
              <input
                type="date"
                value={state.dateOfIssue}
                onChange={(e) => update('dateOfIssue', e.target.value)}
                className={pillInput}
              />
            </div>

            <div>
              <div className={labelClass}>Place of issue *</div>
              <input
                value={state.placeOfIssue}
                onChange={(e) => update('placeOfIssue', e.target.value)}
                placeholder="Please enter place of issue"
                className={pillInput}
              />
            </div>

            <div>
              <div className={labelClass}>Front side of ID *</div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  update('idFrontFile', f);
                  if (f) {
                    try {
                      const dataUrl = await readFileAsDataUrl(f);
                      update('idFrontDataUrl', dataUrl);
                    } catch {
                      update('idFrontDataUrl', '');
                    }
                  } else {
                    update('idFrontDataUrl', '');
                  }
                }}
                className="block w-full text-sm"
              />
            </div>

            <div>
              <div className={labelClass}>Back side of ID *</div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  update('idBackFile', f);
                  if (f) {
                    try {
                      const dataUrl = await readFileAsDataUrl(f);
                      update('idBackDataUrl', dataUrl);
                    } catch {
                      update('idBackDataUrl', '');
                    }
                  } else {
                    update('idBackDataUrl', '');
                  }
                }}
                className="block w-full text-sm"
              />
            </div>

            <div>
              <div className={labelClass}>Selfie Holding ID *</div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  update('selfieHoldingIdFile', f);
                  if (f) {
                    try {
                      const dataUrl = await readFileAsDataUrl(f);
                      update('selfieHoldingIdDataUrl', dataUrl);
                    } catch {
                      update('selfieHoldingIdDataUrl', '');
                    }
                  } else {
                    update('selfieHoldingIdDataUrl', '');
                  }
                }}
                className="block w-full text-sm"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-5">
            <div>
              <div className={labelClass}>Current Address *</div>
              <input
                value={state.currentAddress}
                onChange={(e) => update('currentAddress', e.target.value)}
                placeholder="Enter current address"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Current Job *</div>
              <input
                value={state.currentJob}
                onChange={(e) => update('currentJob', e.target.value)}
                placeholder="Enter job name"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Work Address *</div>
              <input
                value={state.workAddress}
                onChange={(e) => update('workAddress', e.target.value)}
                placeholder="Enter work address"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Position *</div>
              <input
                value={state.position}
                onChange={(e) => update('position', e.target.value)}
                placeholder="Enter job position"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Monthly Income($) *</div>
              <input
                value={state.monthlyIncome}
                onChange={(e) => update('monthlyIncome', e.target.value)}
                placeholder="Enter income amount"
                className={pillInput}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-5">
            <div>
              <div className={labelClass}>Application Name *</div>
              <input
                value={state.bankName}
                onChange={(e) => update('bankName', e.target.value)}
                placeholder="Enter bank name"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Account holder name *</div>
              <input
                value={state.accountHolderName}
                onChange={(e) => update('accountHolderName', e.target.value)}
                placeholder="Enter account holder name"
                className={pillInput}
              />
            </div>
            <div>
              <div className={labelClass}>Number account *</div>
              <input
                value={state.accountNumber}
                onChange={(e) => update('accountNumber', e.target.value)}
                placeholder="Write here..."
                className={pillInput}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-5 space-y-4">
            <div className={labelClass}>Draw Your Signature *</div>
            <SignaturePad
              value={state.signatureDataUrl}
              onChange={(v) => update('signatureDataUrl', v)}
              showHeader={false}
              showHelp={false}
              canvasHeightClassName="h-48"
            />
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-[#ff4b4b] px-6 text-sm font-extrabold text-white hover:bg-[#e23f3f]"
              onClick={() => update('signatureDataUrl', '')}
            >
              Clear Signature
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-5 space-y-6">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Loan Amount: ${effectiveAmount.toLocaleString()}</div>
              <input
                type="range"
                min={MIN_LOAN}
                max={MAX_LOAN}
                value={effectiveAmount}
                onChange={(e) => setLoanAmountFromAny(Number(e.target.value))}
                className="mt-3 w-full"
              />
              <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>${MIN_LOAN.toLocaleString()}</span>
                <span>${MAX_LOAN.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-900">Or Enter Specific Amount</div>
              <input
                value={state.specificAmount}
                onChange={(e) => {
                  const raw = e.target.value;
                  update('specificAmount', raw);

                  const cleaned = raw.replace(/[$,\s]/g, '');
                  const parsed = cleaned.trim() ? Number(cleaned) : NaN;

                  if (!Number.isFinite(parsed)) return;
                  if (parsed < MIN_LOAN || parsed > MAX_LOAN) return;

                  setState((prev) => ({
                    ...prev,
                    loanAmount: Math.round(parsed),
                  }));
                }}
                onBlur={() => {
                  const raw = state.specificAmount;
                  const cleaned = raw.replace(/[$,\s]/g, '');
                  const parsed = cleaned.trim() ? Number(cleaned) : NaN;
                  if (!Number.isFinite(parsed)) return;
                  setLoanAmountFromAny(parsed);
                }}
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Allowed range: ${MIN_LOAN.toLocaleString()} - ${MAX_LOAN.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-900">Interest Rate (%)</div>
              <input
                value={state.interestRateInput}
                onChange={(e) => setInterestRateFromAny(e.target.value)}
                placeholder="e.g. 5.8"
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Live calculation updates automatically when you change amount, months, or interest rate.
              </div>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-900">Loan Duration</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {TERM_OPTIONS.map((m) => {
                  const selected = state.termMonths === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`h-11 rounded-lg border text-sm font-extrabold ${
                        selected
                          ? 'border-[#0b4a90] bg-[#0b4a90] text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => update('termMonths', m)}
                    >
                      {m} months
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-[#0b4a90] p-5 text-white shadow-sm">
              <div className="text-center text-2xl font-extrabold text-[#ffd000]">${calcMoney(monthlyPayment)}</div>
              <div className="mt-4 space-y-3 text-sm font-semibold">
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="text-white/90">Monthly Payment</span>
                  <span>${calcMoney(monthlyPayment)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="text-white/90">Total Loan Amount</span>
                  <span>${effectiveAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="text-white/90">Loan Term</span>
                  <span>{state.termMonths ?? '-'} months</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="text-white/90">Interest Rate</span>
                  <span>{effectiveInterestRate}%</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="text-white/90">Total Interest</span>
                  <span>${calcMoney(loanInterest)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/90">Total Repayment</span>
                  <span>${calcMoney(totalRepayment)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b4a90]/10">
              <ShieldCheck className="h-5 w-5 text-[#0b4a90]" />
            </div>
            <div className="text-sm font-semibold text-slate-600">
              All customer personal information will be kept confidential.
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-full px-6 text-sm font-extrabold"
            onClick={goBack}
          >
            Back
          </Button>

          {step < 5 ? (
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-[#0b4a90] px-6 text-sm font-extrabold text-white hover:bg-[#093b74]"
              onClick={goNext}
            >
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-[#0b4a90] px-6 text-sm font-extrabold text-white hover:bg-[#093b74]"
              onClick={submitApplication}
            >
              Submit Loan Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
