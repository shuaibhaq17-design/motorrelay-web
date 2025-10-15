"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Bronze",
    amount: 0,
    price: "Free",
    desc: "Get started for free.",
    longDescription:
      "Ideal for new drivers dipping their toes into MotorRelay. Browse jobs, post a handful each month, and stay connected with essential tools.",
    features: [
      "Browse jobs",
      "Post up to 3 jobs per month",
      "Email support",
    ],
    cta: "Choose Bronze",
    highlight: false,
  },
  {
    name: "Silver",
    amount: 19,
    price: "GBP 19/mo",
    desc: "Best for regular drivers.",
    longDescription:
      "Designed for drivers running MotorRelay every week. Unlock unlimited posts, get priority placement, and start seeing insights about your performance.",
    features: [
      "Unlimited job posts",
      "Priority listing",
      "Basic analytics",
      "Standard support",
    ],
    cta: "Go Silver",
    highlight: true,
  },
  {
    name: "Gold",
    amount: 39,
    price: "GBP 39/mo",
    desc: "For power users & fleets.",
    longDescription:
      "Built for busy teams and fleet operators. Everything in Silver plus advanced analytics, multi-user access, and a dedicated success manager.",
    features: [
      "Everything in Silver",
      "Team accounts",
      "Advanced analytics",
      "Advanced planner & multi-job calendar",
      "Dedicated support",
    ],
    cta: "Go Gold",
    highlight: false,
  },
];

const initialPaymentForm = {
  cardType: "",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
  accountName: "",
  sortCode: "",
  accountNumber: "",
  directDebitAccepted: false,
};

const termsText =
  "These memberships renew every month. You can change or cancel any time before your renewal date. Charges are handled securely and protected by the Direct Debit Guarantee.";

const cap = (value) => value.replace(/^./, (m) => m.toUpperCase());

export default function MembershipPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [stage, setStage] = useState("details");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [currentPlan, setCurrentPlan] = useState("Bronze");

  const priceLine = useMemo(() => {
    if (!selectedPlan) return "";
    return selectedPlan.amount
      ? `This first payment will charge GBP ${selectedPlan.amount.toFixed(2)}.`
      : "This plan is free to start. You can upgrade whenever you're ready.";
  }, [selectedPlan]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("mr_plan");
    if (stored) {
      setCurrentPlan(cap(stored));
    }

    const onPlanSelected = (event) => {
      const next = event.detail?.plan;
      if (next) {
        setCurrentPlan(next);
      }
    };

    const onStorage = (event) => {
      if (event.key === "mr_plan" && event.newValue) {
        setCurrentPlan(cap(event.newValue));
      }
    };

    window.addEventListener("mr-plan-selected", onPlanSelected);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mr-plan-selected", onPlanSelected);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const openPlanModal = (plan) => {
    setSelectedPlan(plan);
    setStage("details");
    setConfirmChecked(false);
    setPaymentForm(initialPaymentForm);
  };

  const closeModal = () => {
    setSelectedPlan(null);
    setStage("details");
    setConfirmChecked(false);
    setPaymentForm(initialPaymentForm);
  };

  const handleConfirmDetails = () => {
    if (!confirmChecked) return;
    setStage("payment");
  };

  const handlePaymentChange = (field) => (event) => {
    const value = field === "directDebitAccepted" ? event.target.checked : event.target.value;
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmitPayment = useMemo(() => {
    if (!selectedPlan) return false;
    return (
      paymentForm.cardType &&
      paymentForm.cardName &&
      paymentForm.cardNumber &&
      paymentForm.expiry &&
      paymentForm.cvv &&
      paymentForm.accountName &&
      paymentForm.sortCode &&
      paymentForm.accountNumber &&
      paymentForm.directDebitAccepted
    );
  }, [paymentForm, selectedPlan]);

  const handlePaymentSubmit = (event) => {
    event.preventDefault();
    if (!selectedPlan || !canSubmitPayment) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem("mr_plan", selectedPlan.name.toLowerCase());
      window.dispatchEvent(
        new CustomEvent("mr-plan-selected", { detail: { plan: selectedPlan.name } })
      );
      window.dispatchEvent(
        new CustomEvent("mr-toast", {
          detail: {
            title: "Membership updated",
            message: `You're now on the ${selectedPlan.name} plan.`,
          },
        })
      );
    }

    setCurrentPlan(selectedPlan.name);
    setStage("success");
  };

  const renderStage = () => {
    if (!selectedPlan) return null;

    if (stage === "details") {
      return (
        <div className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold text-emerald-700">{selectedPlan.name} membership</h2>
            <p className="text-sm text-gray-600">{selectedPlan.price}</p>
          </header>
          <p className="text-sm text-gray-700">{selectedPlan.longDescription}</p>
          <ul className="space-y-2 rounded-xl bg-emerald-50/60 p-4">
            {selectedPlan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900">Membership terms</h3>
            <p className="mt-2 text-xs leading-5 text-gray-600">{termsText}</p>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(event) => setConfirmChecked(event.target.checked)}
              />
              I have read the terms and want to continue.
            </label>
          </section>
          <div className="flex items-center justify-end gap-3">
            <button className="rounded-xl border px-4 py-2 text-sm" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={handleConfirmDetails}
              disabled={!confirmChecked}
            >
              Confirm and continue
            </button>
          </div>
        </div>
      );
    }

    if (stage === "payment") {
      return (
        <form className="space-y-5" onSubmit={handlePaymentSubmit}>
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Set up billing</h2>
            <p className="text-sm text-gray-600">{priceLine}</p>
          </header>

          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900">Card details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-600">
                Card type
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={paymentForm.cardType}
                  onChange={handlePaymentChange("cardType")}
                >
                  <option value="">Select...</option>
                  <option value="credit">Credit card</option>
                  <option value="debit">Debit card</option>
                  <option value="corporate">Corporate card</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">
                Name on card
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={paymentForm.cardName}
                  onChange={handlePaymentChange("cardName")}
                  placeholder="Full name"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Card number
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={paymentForm.cardNumber}
                  onChange={handlePaymentChange("cardNumber")}
                  placeholder="1234 5678 9012 3456"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-gray-600">
                  Expiry (MM/YY)
                  <input
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={paymentForm.expiry}
                    onChange={handlePaymentChange("expiry")}
                    placeholder="06/27"
                  />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  CVV
                  <input
                    type="password"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={paymentForm.cvv}
                    onChange={handlePaymentChange("cvv")}
                    placeholder="123"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900">Direct debit details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-600">
                Account holder name
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={paymentForm.accountName}
                  onChange={handlePaymentChange("accountName")}
                  placeholder="Full name"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Sort code
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={paymentForm.sortCode}
                  onChange={handlePaymentChange("sortCode")}
                  placeholder="00-00-00"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Account number
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={paymentForm.accountNumber}
                  onChange={handlePaymentChange("accountNumber")}
                  placeholder="00000000"
                />
              </label>
            </div>
            <div className="rounded-lg bg-emerald-50/60 p-3 text-xs text-gray-700">
              <p className="font-medium text-emerald-700">Direct Debit Guarantee</p>
              <p className="mt-1 leading-5">
                Your payments are protected. If an error is made in the payment of your Direct Debit, by MotorRelay or your bank, you are entitled to a full and immediate refund.
              </p>
            </div>
            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={paymentForm.directDebitAccepted}
                onChange={handlePaymentChange("directDebitAccepted")}
              />
              <span>I confirm the details above are correct and authorise MotorRelay to take payments via Direct Debit.</span>
            </label>
          </section>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm"
              onClick={() => setStage("details")}
            >
              Back
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!canSubmitPayment}
            >
              Activate membership
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="space-y-5 text-center">
        <h2 className="text-xl font-semibold text-emerald-700">All set!</h2>
        <p className="text-sm text-gray-600">
          Your {selectedPlan.name} membership is active. You can manage billing or switch plans at any time from this page.
        </p>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          onClick={closeModal}
        >
          Finish
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-5">
          <Link href="/" className="text-sm text-emerald-700 hover:underline">Back Home</Link>
          <span className="text-sm text-gray-500">Membership</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Choose your plan</h1>
            <p className="text-sm text-gray-600">Upgrade anytime. Cancel anytime.</p>
          </div>
          <div className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-700">
            Current plan: {currentPlan}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            return (
              <div
                key={plan.name}
                className={[
                  "flex h-full flex-col rounded-2xl border bg-white p-6 shadow",
                  plan.highlight ? "border-emerald-300 ring-2 ring-emerald-200" : "border-gray-200",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold text-emerald-700">{plan.name}</h2>
                  <span className="text-2xl font-bold">{plan.price}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{plan.desc}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-2">
                  {isCurrent ? (
                    <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-700">
                      Active plan
                    </span>
                  ) : (
                    <button
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      onClick={() => openPlanModal(plan)}
                    >
                      {plan.cta}
                    </button>
                  )}
                  <button
                    className="rounded-xl border px-4 py-2 text-xs text-gray-600 hover:text-gray-800"
                    onClick={() => openPlanModal(plan)}
                  >
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-6 text-sm text-gray-600">
          Your membership updates instantly after you complete the steps above. Need help? Reach out to support and we will guide you through billing setup.
        </div>
      </div>

      {selectedPlan ? (
        <div className='fixed inset-0 z-40 overflow-y-auto'>
          <div className='relative flex min-h-full items-center justify-center p-4 sm:p-6'>
            <div
              className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
              aria-hidden='true'
              onClick={closeModal}
            />
            <div className='relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl'>
              <div className='mb-4 flex items-center justify-between'>
                <button
                  onClick={closeModal}
                  className='inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700'
                >
                  Back to plans
                </button>
                <button
                  className='text-sm text-gray-400 hover:text-gray-600'
                  onClick={closeModal}
                  aria-label='Close'
                >
                  x
                </button>
              </div>
              <div className='mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500'>
                <span className={stage === "details" ? 'text-emerald-600' : ''}>Plan</span>
                <span aria-hidden='true'>&gt;</span>
                <span className={stage === "payment" ? 'text-emerald-600' : ''}>Billing</span>
                <span aria-hidden='true'>&gt;</span>
                <span className={stage === "success" ? 'text-emerald-600' : ''}>Done</span>
              </div>
              {renderStage()}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
