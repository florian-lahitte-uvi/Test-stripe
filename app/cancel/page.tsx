export default function CancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-900 text-white text-center px-4">
      <h1 className="text-4xl font-bold mb-4">❌ Subscription Canceled</h1>
      <p className="text-lg mb-2">You canceled the payment process.</p>
      <p className="text-sm text-gray-300">You can try again anytime from your account.</p>
    </div>
  );
}
