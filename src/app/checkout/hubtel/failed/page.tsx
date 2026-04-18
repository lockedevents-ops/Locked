import Link from "next/link";

export default function HubtelFailedPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const reason = typeof searchParams.reason === "string" ? decodeURIComponent(searchParams.reason) : undefined;
  const transactionId = typeof searchParams.transactionId === "string" ? searchParams.transactionId : undefined;
  const reference = typeof searchParams.reference === "string" ? searchParams.reference : undefined;
  const returnUrl = typeof searchParams.returnUrl === "string" ? decodeURIComponent(searchParams.returnUrl) : undefined;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-700 text-3xl font-bold mb-6">
          !
        </div>
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">Payment failed</h1>
        <p className="text-neutral-600 mb-8">
          We could not confirm your Hubtel payment. You can retry or return to your order.
        </p>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-left shadow-sm mb-8">
          <dl className="space-y-3">
            {reason && (
              <div className="flex justify-between text-sm text-neutral-700">
                <dt className="font-medium text-neutral-900">Reason</dt>
                <dd className="text-neutral-700 text-right max-w-[60%]">{reason}</dd>
              </div>
            )}
            {transactionId && (
              <div className="flex justify-between text-sm text-neutral-700">
                <dt className="font-medium text-neutral-900">Transaction ID</dt>
                <dd className="font-mono text-neutral-700">{transactionId}</dd>
              </div>
            )}
            {reference && (
              <div className="flex justify-between text-sm text-neutral-700">
                <dt className="font-medium text-neutral-900">Reference</dt>
                <dd className="font-mono text-neutral-700">{reference}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {returnUrl ? (
            <Link
              href={returnUrl}
              className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Return to order
            </Link>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-white text-neutral-800 border border-neutral-200 font-medium hover:bg-neutral-50 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
