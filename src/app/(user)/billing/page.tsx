"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Form, Row, Col, Alert, Badge } from "react-bootstrap";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/context/useAuthContext";
import { userSubscriptionApi } from "@/lib/subscription-api";
import type { SubscribeRequest } from "@/types/billing";
import { formatCurrencyValue, formatDateTime } from "@/helpers/billing";
import { toast } from "react-toastify";

const getStripePromise = () => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) {
    console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
    return null;
  }
  return loadStripe(pk);
};

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => Promise<void> | void;
}

const CheckoutForm = ({ clientSecret, onSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Unable to find payment element");
        setIsProcessing(false);
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        console.error(result.error);
        setError(result.error.message || "Payment failed");
        toast.error(result.error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        toast.success("Subscription activated successfully");
        await onSuccess();
      } else {
        setError("Payment did not complete. Please try again.");
        toast.error("Payment did not complete. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Payment failed");
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="mb-3">
        <Form.Label>Payment details</Form.Label>
        <div className="border rounded p-2">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>
      </div>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={isProcessing || !stripe || !elements}
        className="w-100"
      >
        {isProcessing ? "Processing..." : "Confirm and subscribe"}
      </Button>
    </Form>
  );
};

const BillingPage = () => {
  const { user, token, isSubscribedUser, requiresSubscription, refreshUser } =
    useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const plans = useMemo(
    () => [
      {
        id: "basic",
        name: "Basic",
        price: 10,
        currency: "USD",
        description: "Basic tier for small teams. Ideal for getting started.",
        popular: false,
        features: ["Basic features", "Up to 100 calls per month"],
      },
      {
        id: "pro",
        name: "Pro",
        price: 50,
        currency: "USD",
        description: "Pro tier for growing businesses that need more capacity.",
        popular: true,
        features: [
          "Advanced features",
          "Priority support",
          "Up to 500 calls per month",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: 100,
        currency: "USD",
        description:
          "Enterprise tier for large organizations with higher demands.",
        popular: false,
        features: [
          "Enterprise features",
          "24/7 support",
          "Custom integrations",
          "Up to 1000 calls per month",
        ],
      },
    ],
    []
  );

  useEffect(() => {
    const stripe = getStripePromise();
    if (stripe) {
      setStripePromise(stripe);
    }
  }, []);

  useEffect(() => {
    if (isSubscribedUser) {
      // Already subscribed, keep them here but offer navigation back to dashboard
      return;
    }
    if (!requiresSubscription && !isSubscribedUser && user?.role === "user") {
      // Subscribed state might have just flipped; send to dashboards
      router.replace("/dashboards");
    }
  }, [isSubscribedUser, requiresSubscription, user, router]);

  const handleStartSubscription = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const payload: SubscribeRequest = {
          email: user.email,
          name: user.username,
          tier_id: selectedTierId || undefined,
          coupon_code: couponCode || undefined,
        };

        const response = await userSubscriptionApi.subscribe(
          payload,
          token || undefined
        );

        if (response.error || !response.data) {
          const message = response.error || "Failed to start subscription";
          setError(message);
          toast.error(message);
          setIsLoading(false);
          return;
        }

        const data = response.data;

        if (data.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          // If backend already marked user as subscribed, just refresh and redirect
          await refreshUser();
          router.push("/dashboards");
        }
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : "Failed to start subscription";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [user, selectedTierId, couponCode, token, refreshUser, router]
  );

  const handlePaymentSuccess = useCallback(async () => {
    // After successful payment, refresh user profile to pick up subscribed=true
    await refreshUser();
    router.push("/dashboards");
  }, [refreshUser, router]);

  const subscriptionDetails = user?.subscription_details;

  const planLabel = useMemo(() => {
    if (!subscriptionDetails) return "Active Subscription";
    const amount = subscriptionDetails.amount ?? 0;
    const currency = subscriptionDetails.currency || "USD";
    return `${subscriptionDetails.plan_name ?? "Subscription"} • ${formatCurrencyValue(amount, currency)}`;
  }, [subscriptionDetails]);

  return (
    <>
      <Row className="mb-4">
        <Col lg={10} xl={8}>
          <div className="page-title-box">
            <h4 className="mb-2">So what does it cost?</h4>
            <p className="text-muted mb-0">
              We make it simple to pick the right bundle for your team. Start
              small, scale up when you&apos;re ready, and only pay for what you
              actually use.
            </p>
          </div>
        </Col>
      </Row>

      {isSubscribedUser && (
        <Row className="mb-4">
          <Col md={8} lg={6}>
            <Card>
              <Card.Body>
                <h5 className="card-title mb-3">Your subscription</h5>
                <p className="mb-1 fw-semibold">{planLabel}</p>
                {subscriptionDetails?.status && (
                  <p className="mb-1">
                    <span className="badge bg-success me-2">Status</span>
                    <span className="text-capitalize">
                      {subscriptionDetails.status}
                    </span>
                  </p>
                )}
                {subscriptionDetails?.current_period_end && (
                  <p className="mb-1">
                    <span className="badge bg-info me-2">Next billing</span>
                    {formatDateTime(subscriptionDetails.current_period_end)}
                  </p>
                )}
                <div className="mt-3 d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => router.push("/dashboards")}
                  >
                    Back to dashboard
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {!isSubscribedUser && (
        <>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group className="mb-0">
                <Form.Label>Coupon code (optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Applies to whichever plan you choose below.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4 g-3">
            {plans.map((plan) => {
              const isSelected = selectedTierId === plan.id;
              return (
                <Col key={plan.id} md={4}>
                  <Card
                    className={`h-100 pricing-card ${isSelected ? "border-primary shadow-sm" : "border-0 shadow-sm"}`}
                    onClick={() => setSelectedTierId(plan.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="mb-0">{plan.name}</Card.Title>
                        {plan.popular && (
                          <Badge bg="warning" text="dark">
                            Most popular
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-3 mb-2">
                        {formatCurrencyValue(plan.price, plan.currency)}{" "}
                        <small className="text-muted fs-6">/ month</small>
                      </h3>
                      <p className="text-muted mb-3">{plan.description}</p>
                      <ul className="list-unstyled mb-3 small text-muted">
                        {plan.features.map((feature) => (
                          <li key={feature} className="mb-1">
                            • {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={isSelected ? "primary" : "outline-primary"}
                        className="w-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTierId(plan.id);
                        }}
                      >
                        {isSelected ? "Selected" : "Choose this bundle"}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}
    </>
  );
};

export default BillingPage;
