import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { userApi } from '@/api/user.api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: '₹0',
    cadence: 'forever',
    perks: [
      '5 job applications per day',
      '3 AI calls per day',
      'Resume + interview prep AI',
      'Job recommendations'
    ]
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '₹499',
    cadence: 'per month',
    highlight: true,
    perks: [
      'Unlimited job applications',
      'Unlimited AI calls',
      'Priority AI processing',
      'Early access to new features'
    ]
  }
];

export default function UpgradePage() {
  const { isPro, subscription } = useAuth();
  const queryClient = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: () => userApi.upgradeToPro('mock-payment-ref'),
    onSuccess: (data) => {
      toast.success(data?.message || 'Welcome to PRO!');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Upgrade failed');
    }
  });

  return (
    <div className="container max-w-4xl py-10">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-2 text-muted-foreground">
          Current plan: <Badge variant={isPro ? 'accent' : 'outline'}>{subscription || 'FREE'}</Badge>
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = (plan.key === 'PRO' && isPro) || (plan.key === 'FREE' && !isPro);
          return (
            <Card
              key={plan.key}
              className={plan.highlight ? 'border-accent shadow-lg shadow-accent/10' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.highlight && (
                    <Badge variant="accent" className="gap-1">
                      <Sparkles className="h-3 w-3" /> Best value
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>{' '}
                  <span className="text-muted-foreground">/ {plan.cadence}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                {plan.key === 'PRO' && (
                  <Button
                    className="w-full"
                    variant="accent"
                    disabled={isCurrent || upgradeMutation.isPending}
                    onClick={() => upgradeMutation.mutate()}
                  >
                    {upgradeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Upgrading…
                      </>
                    ) : isCurrent ? (
                      'You are on PRO'
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> Upgrade to PRO
                      </>
                    )}
                  </Button>
                )}

                {plan.key === 'FREE' && isCurrent && (
                  <p className="text-center text-sm text-muted-foreground">Your current plan</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        This demo upgrade does not charge a real card. Replace the <code>mock-payment-ref</code>{' '}
        flow with Stripe / Razorpay before production.
      </p>
    </div>
  );
}
